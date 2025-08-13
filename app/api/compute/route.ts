// app/api/compute/route.ts
export const dynamic = "force-dynamic";

import OpenAI from "openai";

/** 통화 표기 */
const KRW = (n: number) =>
  new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(Math.round(n)) + " 원";

/** 원리금균등 월상환액 */
function monthlyPayment(principal: number, annualRate: number, years: number) {
  const n = years * 12;
  const r = annualRate / 12;
  if (r <= 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/** 한국식 문구 파싱 (안전하게 any→string 변환해서 replace 에러 방지) */
function parseInputs(raw: unknown) {
  const text = String(raw ?? "");
  const clean = (s: unknown) => String(s ?? "").replace(/[, ]/g, "");

  // 의도
  const intent = /전세/.test(text) ? "전세" : /월세/.test(text) ? "월세" : "매매";
  // 선호
  const pref =
    /체증/.test(text) ? "체증식" : /변동/.test(text) ? "변동" : /고정/.test(text) ? "고정" : null;

  // 예산 (6억)
  let budget: number | null = null;
  let m = /예산\s*([\d.,]+)\s*억/i.exec(text);
  if (m) budget = parseFloat(clean(m[1])) * 100_000_000;
  if (budget == null) {
    m = /([\d.,]+)\s*억/i.exec(text);
    if (m) budget = parseFloat(clean(m[1])) * 100_000_000;
  }

  // 보유 (8천)
  let cash: number | null = null;
  m = /보유\s*([\d.,]+)\s*천/i.exec(text);
  if (m) cash = parseFloat(clean(m[1])) * 10_000_000;

  // 소득 (4500 → 만원 가정)
  let income: number | null = null;
  m = /연소득\s*([\d.,]+)/i.exec(text);
  if (m) income = parseFloat(clean(m[1])) * 10_000;

  // 기간 (30년)
  let termYears: number | null = null;
  m = /(\d+)\s*년/i.exec(text);
  if (m) termYears = parseInt(clean(m[1]), 10);

  // 재직개월 (체크리스트용)
  let monthsEmployed: number | null = null;
  m = /재직\s*(\d+)\s*개월/i.exec(text);
  if (m) monthsEmployed = parseInt(clean(m[1]), 10);

  return { text, intent, pref, budget, cash, income, termYears, monthsEmployed };
}

/** 카드 만들기 */
function buildCards(principal: number, years: number, prefer?: string | null) {
  // 임시 가정 금리 (추후 API 연동 가능)
  const RATE_FIXED = 0.035;
  const RATE_VAR = 0.028;
  const RATE_STEP = 0.025;

  const mFixed = monthlyPayment(principal, RATE_FIXED, years);
  const mVar = monthlyPayment(principal, RATE_VAR, years);
  const mStep = monthlyPayment(principal, RATE_STEP, years);

  const totalFixed = mFixed * years * 12;
  const totalVar = mVar * years * 12;
  const totalStep = mStep * years * 12;

  const list = [
    {
      title: "1. 고정금리 대출",
      subtitle: "안정적인 상환",
      monthly: KRW(mFixed),
      totalInterest: KRW(totalFixed - principal),
      notes: [
        `금리: ${(RATE_FIXED * 100).toFixed(1)}%`,
        `대출 기간: ${years}년`,
        "상환 방식: 원리금 균등",
      ],
      kind: "fixed",
    },
    {
      title: "2. 변동금리 대출",
      subtitle: "금리 변동 리스크",
      monthly: KRW(mVar),
      totalInterest: KRW(totalVar - principal),
      notes: [
        `금리: ${(RATE_VAR * 100).toFixed(1)}% (변동)`,
        `대출 기간: ${years}년`,
        "상환 방식: 원리금 균등",
      ],
      kind: "variable",
    },
    {
      title: "3. 체증식 대출",
      subtitle: "초기 부담↓ 이후 증가",
      monthly: KRW(mStep),
      totalInterest: KRW(totalStep - principal),
      notes: [
        `초기 금리: ${(RATE_STEP * 100).toFixed(1)}%`,
        `대출 기간: ${years}년`,
        "상환 방식: 체증식",
      ],
      kind: "stepup",
    },
  ];

  if (prefer) {
    const idx =
      prefer.includes("고정") ? 0 : prefer.includes("변동") ? 1 : prefer.includes("체증") ? 2 : -1;
    if (idx >= 0) {
      const [pick] = list.splice(idx, 1);
      list.unshift(pick);
    }
  }
  // kind 제거(프론트 미사용)
  return list.map(({ kind, ...rest }) => rest);
}

/** 체크리스트 (재직 1년 미만) */
function buildChecklist(monthsEmployed: number | null) {
  if (monthsEmployed != null && monthsEmployed < 12) {
    return [
      "재직증명서",
      "소득증빙서(급여명세서/원천징수영수증)",
      "신분증 사본",
      "주택 매매/전세계약 관련 서류",
      "은행 거래내역서(최근 3개월)",
    ];
  }
  return [];
}

/** 요약(키 없거나 실패 시 로컬 문구) */
async function summarize(userText: string, cardTitles: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "입력값을 바탕으로 대출 시나리오를 계산했습니다. 선호 조건과 금리 리스크를 함께 검토해 보세요.";
  }

  const client = new OpenAI({ apiKey });
  try {
    // SDK v4: responses API 사용 (권장)
    const res = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        "다음 사용자의 한국어 설명을 요약하고, 어떤 시나리오가 적합한지 간단히 조언해 주세요.",
        `사용자 입력: ${userText}`,
        `시나리오: ${cardTitles.join(", ")}`,
        "두세 문장으로 짧게.",
      ].join("\n"),
    });

    const text =
      res.output_text?.trim() ||
      (Array.isArray(res.output) ? String(res.output[0] as any) : "") ||
      "";
    return text || "요약을 생성했습니다.";
  } catch (e) {
    console.error("openai error:", e);
    return "계산 결과를 정리했습니다. 금리/상환방식에 따른 차이를 비교해 보세요.";
  }
}

// --------- 메인 핸들러 ---------
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      message?: unknown;
    };

    const { text, intent, pref, budget, cash, termYears, monthsEmployed } = parseInputs(
      body?.message
    );

    // 기본값 보정
    const _budget = budget ?? 500_000_000; // 5억 기본
    const _cash = cash ?? 50_000_000; // 5천 기본
    const years = termYears ?? 30;

    const principal = Math.max(0, _budget - _cash);
    const cards = principal > 0 ? buildCards(principal, years, pref) : [];

    const checklist = buildChecklist(monthsEmployed);

    const reply = await summarize(text, cards.map((c) => c.title));

    return Response.json({
      reply,
      cards,
      checklist,
      meta: {
        intent,
        prefer: pref,
        budget: _budget,
        cash: _cash,
        principal,
        termYears: years,
      },
    });
  } catch (err) {
    console.error("compute error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
