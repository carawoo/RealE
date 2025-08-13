// app/api/compute/route.ts
import OpenAI from "openai";

// 계산용 유틸 ------------------------------------------
const KRW = (n: number) =>
  new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(Math.round(n)) + " 원";

function monthlyPayment(principal: number, annualRate: number, years: number) {
  const n = years * 12;
  const r = annualRate / 12;
  if (r <= 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// 간단 파서(한국어 표현 대응) ----------------------------
function parseNumbers(txt: string) {
  const get = (re: RegExp, m: number = 1): number | null => {
    const mm = txt.match(re);
    if (!mm) return null;
    return parseFloat(mm[m].replace(/[, ]/g, ""));
  };

  // 예산: “6억”
  const budgetEok = get(/예산\s*([\d.,]+)\s*억|([\d.,]+)\s*억/g, 1) ?? get(/([\d.,]+)\s*억/g, 1);
  const budget = budgetEok ? budgetEok * 100_000_000 : null;

  // 보유: “8천”
  const cashCheon = get(/보유\s*([\d.,]+)\s*천|([\d.,]+)\s*천/g, 1);
  const cash = cashCheon ? cashCheon * 10_000_000 : null;

  // 연소득: “연소득 4500(만원 기준으로 가정)”
  const incomeMan = get(/연소득\s*([\d.,]+)/);
  const income = incomeMan ? incomeMan * 10_000 : null;

  // 상환기간: “30년”
  const termYears = get(/(\d+)\s*년/);

  // 의도/선호
  const intent = /전세/.test(txt) ? "전세" : /월세/.test(txt) ? "월세" : "매매";
  const pref = /체증/.test(txt)
    ? "체증식"
    : /변동/.test(txt)
    ? "변동"
    : /고정/.test(txt)
    ? "고정"
    : null;

  const region =
    /수도권/.test(txt) ? "수도권" : /지방/.test(txt) ? "지방" : /무관/.test(txt) ? "무관" : null;

  // 재직기간 텍스트
  const tenure = /(\d+)\s*개월|(\d+)\s*년|1년↑/.test(txt) ? txt.match(/(재직[^\s,]+)/)?.[0] ?? null : null;

  return { budget, cash, income, termYears, intent, pref, region, tenure };
}

// 카드 구성 --------------------------------------------
function buildCards(input: {
  principal: number;
  years: number;
  prefer?: string | null;
}) {
  const { principal, years, prefer } = input;

  // 예시 금리(필요 시 환경/정책 반영 로직으로 대체 가능)
  const rateFixed = 0.035;
  const rateVar   = 0.028;   // 변동 가정(초기)
  const rateStep  = 0.025;   // 체증식 시작 금리 가정

  const mFixed = monthlyPayment(principal, rateFixed, years);
  const mVar   = monthlyPayment(principal, rateVar, years);
  const mStep  = monthlyPayment(principal, rateStep, years); // 시작 월상환

  const totalFixed = mFixed * years * 12;
  const totalVar   = mVar * years * 12;   // 단순 비교(변동은 실제로는 변함)
  const totalStep  = mStep * years * 12;  // 단순 비교(초기 기준)

  const list = [
    {
      title: "1. 고정금리 대출",
      subtitle: "안정적인 상환 계획",
      monthly: KRW(mFixed),
      totalInterest: KRW(totalFixed - principal),
      notes: [
        `금리: ${(rateFixed * 100).toFixed(1)}%`,
        `대출 기간: ${years}년`,
        "상환 방식: 원리금 균등 상환",
      ],
      kind: "fixed",
    },
    {
      title: "2. 변동금리 대출",
      subtitle: "금리 변동에 따른 리스크",
      monthly: KRW(mVar),
      totalInterest: KRW(totalVar - principal),
      notes: [
        `금리: ${(rateVar * 100).toFixed(1)}% (변동 가능성 있음)`,
        `대출 기간: ${years}년`,
        "상환 방식: 원리금 균등 상환",
      ],
      kind: "variable",
    },
    {
      title: "3. 체증식 대출",
      subtitle: "초기 부담↓, 이후 점진 증가",
      monthly: KRW(mStep),
      totalInterest: KRW(totalStep - principal),
      notes: [
        `초기 금리: ${(rateStep * 100).toFixed(1)}%`,
        `대출 기간: ${years}년`,
        "초기 상환액이 낮고 시간이 갈수록 증가",
      ],
      kind: "stepup",
    },
  ];

  // 선호 카드 먼저 오도록 정렬
  if (prefer) {
    const idx =
      prefer.includes("고정") ? 0 : prefer.includes("변동") ? 1 : prefer.includes("체증") ? 2 : -1;
    if (idx >= 0) {
      const pick = list.splice(idx, 1)[0];
      list.unshift(pick);
    }
  }
  return list;
}

// 체크리스트(재직 1년 미만이면 자동 추가) ------------------
function buildChecklist(text: string) {
  const isShortTenure = /(\d+)\s*개월/.test(text) && !/1년|12개월/.test(text);
  if (!isShortTenure) return [];
  return [
    "재직증명서",
    "소득증빙서(급여명세서 또는 원천징수영수증)",
    "신분증 사본",
    "주택 매매계약서",
    "은행 거래내역서(최근 3개월)",
  ];
}

// OpenAI 요약 프롬프트 -----------------------------------
async function makeSummary(userText: string, cardTitles: string[]) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const sys =
    "너는 한국의 주택금융 문맥을 아는 금융 어시스턴트야. 사용자가 제공한 조건을 바탕으로 왜 이런 시나리오를 추천하는지 2~3문장 한국어로 명확히 요약해줘. 과장 금지.";
  const user =
    `사용자 입력: """${userText}"""\n` +
    `비교 시나리오: ${cardTitles.join(", ")}\n` +
    `요청: 가장 적합해 보이는 시나리오를 먼저 언급하고, 금리/기간/리스크 요지를 짧게 설명.`;

  const out = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
  });

  return out.choices[0]?.message?.content?.trim() || "조건에 맞춘 대출 시나리오를 비교했습니다.";
}

// API 핸들러 --------------------------------------------
export async function POST(req: Request) {
  try {
    const { message } = (await req.json()) as { message?: string };
    const text = (message || "").trim();
    if (!text) return Response.json({ error: "메시지가 비어있어요." }, { status: 400 });

    const parsed = parseNumbers(text);

    // 기본 보정값(입력 누락 대비)
    const budget = parsed.budget ?? 600_000_000; // 6억
    const cash   = parsed.cash   ?? 80_000_000;  // 8천
    const years  = (parsed.termYears ?? 30) as number;

    // 단순 LTV 한도(80%) 반영해 대출원금 추정
    const ltvCap = budget * 0.8;
    const need   = Math.max(budget - (cash ?? 0), 0);
    const principal = Math.min(need, ltvCap);

    const cards = buildCards({
      principal,
      years,
      prefer: parsed.pref,
    });

    const reply = await makeSummary(text, cards.map(c => c.title));

    const checklist = buildChecklist(text);

    return Response.json({
      reply,
      cards: cards.map(({ kind, ...rest }) => rest), // 프론트는 kind 안 씀
      checklist,
    });
  } catch (e) {
    console.error(e);
    return Response.json(
      { reply: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", cards: [], checklist: [] },
      { status: 500 }
    );
  }
}
