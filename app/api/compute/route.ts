// app/api/compute/route.ts
export const dynamic = "force-dynamic";

import OpenAI from "openai";

const KRW = (n: number) =>
  new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(Math.round(n)) + " 원";

function monthlyPayment(principal: number, annualRate: number, years: number) {
  const n = years * 12;
  const r = annualRate / 12;
  if (r <= 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/** 한국어 프리폼 입력 파서(안전) */
function parseInputs(raw: unknown) {
  const text = String(raw ?? "");

  const unit = (u?: string) =>
    u?.includes("천") ? 10_000_000 : u?.includes("백") ? 1_000_000 : u?.includes("만") ? 10_000 : 10_000; // 기본 만원

  const num = (s?: string) => (s ? parseFloat(s.replace(/[^\d.]/g, "")) : NaN);

  const intent = /전세/.test(text) ? "전세" : /월세/.test(text) ? "월세" : "매매";
  const pref =
    /체증/.test(text) ? "체증식" : /변동/.test(text) ? "변동" : /고정/.test(text) ? "고정" : null;

  // 예산 6억
  let budget: number | null = null;
  let m = /예산\s*([\d.,]+)\s*억/i.exec(text) || /([\d.,]+)\s*억/.exec(text);
  if (m) budget = num(m[1]) * 100_000_000;

  // 보유/보증금 8천, 150만 등
  let cash: number | null = null;
  m = /(보유|보증금)\s*([\d.,]+)\s*(천|백|만)?/i.exec(text);
  if (m) cash = num(m[2]) * unit(m[3]);

  // 월세 80만
  let wolse: number | null = null;
  m = /월세\s*([\d.,]+)\s*만/i.exec(text);
  if (m) wolse = num(m[1]) * 10_000;

  // 기간 30년
  let termYears: number | null = null;
  m = /(\d+)\s*년/.exec(text);
  if (m) termYears = parseInt(m[1], 10);

  // 재직 10개월
  let monthsEmployed: number | null = null;
  m = /재직\s*(\d+)\s*개월/.exec(text);
  if (m) monthsEmployed = parseInt(m[1], 10);

  return { text, intent, pref, budget, cash, wolse, termYears, monthsEmployed };
}

function buildLoanCards(principal: number, years: number, prefer?: string | null) {
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
      subtitle: "안정적인 상환 계획",
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
      subtitle: "금리 변동에 따른 리스크",
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
      subtitle: "초기 부담이 가벼운 방식",
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
  return list.map(({ kind, ...rest }) => rest);
}

/** 월세 카드(보증금 1,000만 ↔ 월세 5만 가정의 현실적인 교환비) */
function buildRentCards(deposit: number, monthly: number) {
  const deltaDeposit = 10_000_000; // 1,000만
  const deltaRent = 50_000; // 5만

  const moreDeposit = {
    title: "보증금 올리고 월세 낮추기",
    subtitle: "보증금을 1,000만 올리면 월세 약 5만 낮아져요",
    monthly: KRW(Math.max(0, monthly - deltaRent)),
    totalInterest: "", // 대출 아님
    notes: [
      `현재 보증금: ${KRW(deposit)} → ${KRW(deposit + deltaDeposit)}`,
      `예상 월세: ${KRW(monthly)} → ${KRW(Math.max(0, monthly - deltaRent))}`,
      "현금 여력이 있으면 장기적으로 유리해요.",
    ],
  };

  const lessDeposit = {
    title: "보증금 낮추고 월세 올리기",
    subtitle: "보증금을 1,000만 낮추면 월세 약 5만 올라가요",
    monthly: KRW(monthly + deltaRent),
    totalInterest: "",
    notes: [
      `현재 보증금: ${KRW(deposit)} → ${KRW(Math.max(0, deposit - deltaDeposit))}`,
      `예상 월세: ${KRW(monthly)} → ${KRW(monthly + deltaRent)}`,
      "초기 비용을 줄이고 싶을 때 선택해요.",
    ],
  };

  return [moreDeposit, lessDeposit];
}

/** 체크리스트 */
function buildChecklist(monthsEmployed: number | null) {
  if (monthsEmployed != null && monthsEmployed < 12) {
    return [
      "재직증명서",
      "급여명세서 또는 원천징수영수증",
      "신분증 사본",
      "주택 매매/전세계약 관련 서류",
      "은행 거래내역서(최근 3개월)",
    ];
  }
  return [];
}

/** 쉬운 말 요약 */
async function summarize(userText: string, intent: string, cardTitles: string[], notices: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // 모델이 없어도 유저에게 쉬운 안내 제공
    return [
      "입력하신 내용을 바탕으로 가장 쉬운 선택지를 정리했어요.",
      "카드들을 보고 월 부담/초기 비용을 비교해 보세요.",
    ].join(" ");
  }

  const client = new OpenAI({ apiKey });
  try {
    const res = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        "아래 정보를 초등학생도 이해할 수 있게, 부드럽고 친절한 한국어로 3~4줄 안에 요약해 주세요.",
        "• 어려운 금융 용어는 풀어서 설명하고, 숫자에는 '원'을 붙여 주세요.",
        `• 목적: ${intent}`,
        `• 선택 시나리오: ${cardTitles.join(", ")}`,
        notices.length ? `• 주의/보정: ${notices.join(" / ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const text = (res as any).output_text?.trim() || "";
    return text || "결과를 보기 쉽게 정리했어요. 아래 카드에서 비교해 보세요!";
  } catch (e) {
    console.error("openai error:", e);
    return "가장 쉬운 말로 정리했어요. 아래 카드에서 월 부담과 조건을 편하게 비교해 보세요!";
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { message?: unknown };
    const { text, intent, pref, budget, cash, wolse, termYears, monthsEmployed } = parseInputs(
      body?.message
    );

    const notices: string[] = [];

    // 기본값 보정
    let years = termYears ?? 30;

    // 1) 월세 처리: 보증금(보유) 최소 100만 원 강제
    if (intent === "월세") {
      let deposit = cash ?? 0;
      if (deposit < 1_000_000) {
        deposit = 1_000_000;
        notices.push("월세는 보증금이 최소 100만 원 필요해서 100만 원으로 맞췄어요.");
      }
      const monthly = wolse ?? 700_000; // 기본 70만 가정
      const cards = buildRentCards(deposit, monthly);
      const checklist = buildChecklist(monthsEmployed);
      const reply = await summarize(text, intent, cards.map((c) => c.title), notices);

      return Response.json({
        reply,
        cards,
        checklist,
        notices,
        meta: { intent, deposit, monthly },
      });
    }

    // 2) 매매/전세(대출 시나리오)
    const _budget = budget ?? 500_000_000; // 5억
    const _cash = cash ?? 50_000_000; // 5천
    const principal = Math.max(0, _budget - _cash);

    const cards = principal > 0 ? buildLoanCards(principal, years, pref) : [];
    const checklist = buildChecklist(monthsEmployed);
    const reply = await summarize(text, intent, cards.map((c) => c.title), notices);

    return Response.json({
      reply,
      cards,
      checklist,
      notices,
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
