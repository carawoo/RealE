import { NextResponse } from "next/server";

// ------- 간단 한글 금액 파서 -------
// "6억" => 600_000_000
// "8천" => 80_000_000
// "4500" => 45_000_000 (평균적으로 '만원' 단위로 보는 가정)
function parseKRW(input: string | undefined): number | null {
  if (!input) return null;
  const s = input.replace(/\s/g, "");
  const num = parseFloat(s.replace(/[^\d.]/g, "")); // 6, 8, 4500 등
  if (isNaN(num)) return null;

  if (/억/.test(s)) return Math.round(num * 100_000_000);
  if (/천/.test(s)) return Math.round(num * 10_000_000);
  if (/만/.test(s)) return Math.round(num * 10_000);
  // 단위 미기재: "4500" → 4,500만원으로 가정
  return Math.round(num * 10_000 * 100); // 만원 * 100 = 백만원? → 4,500 * 만원 = 45,000,000
}

// 연 수익률 → 월 이자율
function yearlyToMonthly(rate: number) {
  return rate / 12;
}

// 원리금균등 상환 월 납입액
function pmt(annualRate: number, months: number, principal: number) {
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  const a = Math.pow(1 + r, months);
  return (principal * r * a) / (a - 1);
}

// 메시지에서 의도 및 숫자 뽑기(정규식 위주, 부족하면 부분만 채움)
function extract(message: string) {
  const goal = /매매|전세|월세/i.exec(message)?.[0]?.toLowerCase() || "";
  const years = /(\d+)\s*년/.exec(message)?.[1];
  const termYears = years ? parseInt(years) : 30;

  const prefer =
    /체증|체증식/.test(message) ? "stepup" :
    /고정|고정금리/.test(message) ? "fixed" :
    /변동|변동금리/.test(message) ? "variable" : "";

  const budgetRaw = /(예산|가격|매물|집값)\s*([0-9\.]+(?:억|천|만)?)/.exec(message)?.[2] ||
                    /([0-9\.]+(?:억|천|만)?)\s*(원)?\s*(예산|가격)/.exec(message)?.[1];
  const cashRaw   = /(보유|자기자본|보증금)\s*([0-9\.]+(?:억|천|만)?)/.exec(message)?.[2];
  const incomeRaw = /(연소득|소득)\s*([0-9\.]+(?:억|천|만)?)/.exec(message)?.[2];

  const region = /(수도권|서울|경기|인천|지방|광역시)/.exec(message)?.[1] || "";

  const budget = parseKRW(budgetRaw || "");
  const cash   = parseKRW(cashRaw   || "");
  const income = parseKRW(incomeRaw || "");

  return { goal, termYears, prefer, budget, cash, income, region };
}

// 규칙: 대략적인 LTV 한도(매매 80%), 월세는 보증금(=cash) 최소 100만원 이상 사용
function computeScenarios(params: ReturnType<typeof extract>) {
  const termMonths = params.termYears * 12;
  const price = params.budget ?? 0;

  // 현금(보유/보증금) 보정
  let cash = params.cash ?? 0;
  if (params.goal === "월세" || params.goal === "월세".toLowerCase()) {
    // 사용자 요청: 월세는 보유(보증금) 최소 100만원
    const minDeposit = 1_000_000;
    if (cash < minDeposit) cash = minDeposit;
  }

  // 대출 필요액
  let need = Math.max(price - cash, 0);

  if (params.goal.includes("매매")) {
    const ltv = 0.8;
    need = Math.min(need, Math.round(price * ltv));
  }

  // 금리 가정(현실 반영은 추후 API로 교체)
  const rFixed = 0.035;
  const rVar   = 0.028;
  const rStep  = 0.025; // 체증식 초기 금리

  // 각 시나리오 월상환/총이자
  function card(title: string, r: number, kind: "fixed" | "variable" | "stepup") {
    const monthly = pmt(r, termMonths, need);
    const totalPaid = monthly * termMonths;
    const totalInterest = Math.max(totalPaid - need, 0);

    const detailNotes =
      kind === "variable"
        ? ["금리 변동에 따라 월 납입액이 바뀔 수 있어요."]
        : kind === "stepup"
        ? ["초기에는 적게 내고, 시간이 지나며 조금씩 늘어나는 방식이에요."]
        : ["이자율이 고정이라 매달 비슷하게 내요."];

    return {
      title,
      subtitle:
        kind === "fixed" ? "안정적인 상환 계획" :
        kind === "variable" ? "금리 변동에 따른 리스크" :
        "초기 부담을 낮추는 방법",
      monthly: Math.round(monthly).toLocaleString("ko-KR") + " 원",
      totalInterest: Math.round(totalInterest).toLocaleString("ko-KR") + " 원",
      notes: [
        `금리: ${(r * 100).toFixed(1)}%`,
        `대출금: ${Math.round(need).toLocaleString("ko-KR")} 원`,
        `상환기간: ${params.termYears}년`,
        ...detailNotes
      ]
    };
  }

  return [
    card("1. 고정금리 대출", rFixed, "fixed"),
    card("2. 변동금리 대출", rVar, "variable"),
    card("3. 체증식 대출",   rStep, "stepup"),
  ];
}

export async function POST(req: Request) {
  try {
    const { message } = (await req.json()) as { message?: string };

    const msg = (message ?? "").toString().trim();
    if (!msg) {
      return NextResponse.json(
        {
          reply:
            "무엇을 도와드릴까요? 목적(매매/전세/월세)과 숫자 몇 개만 알려주시면 바로 계산해 드려요.\n예) 매매, 예산 6억, 보유 8천, 연소득 4500, 수도권, 30년, 체증식 선호",
        },
        { status: 200 }
      );
    }

    const p = extract(msg);

    // 필수 최소값이 없는 경우 안내만 반환(에러 X)
    if (!p.goal && !p.budget && !p.cash) {
      return NextResponse.json(
        {
          reply:
            "좋아요! 목적(매매/전세/월세)과 예산/보유/기간 중 2개 이상만 알려주시면 더 정확히 계산할 수 있어요.\n예) 전세, 보증금 3억, 수도권",
        },
        { status: 200 }
      );
    }

    const cards = computeScenarios(p);

    // 사람 친화적 요약
    const reply =
      `입력해 주신 내용으로 계산했어요.\n` +
      `- 목적: ${p.goal || "미지정"}\n` +
      `- 예산(또는 가격): ${p.budget ? p.budget.toLocaleString("ko-KR") + "원" : "미지정"}\n` +
      `- 보유자금/보증금: ${p.cash ? p.cash.toLocaleString("ko-KR") + "원" : "미지정"}\n` +
      `- 기간: ${p.termYears}년\n` +
      (p.prefer ? `- 선호: ${p.prefer}\n` : "") +
      (p.region ? `- 지역: ${p.region}\n` : "") +
      `아래 카드에서 월 납입액과 총 이자를 비교해 보세요.`;

    // 재직 1년 미만 체크리스트 (예시)
    const checklist =
      /재직\s*(\d+)\s*개월/.test(msg) && parseInt(RegExp.$1) < 12
        ? ["재직증명서", "소득증빙(급여명세서 또는 원천징수영수증)", "신분증 사본", "주택 매매/임대차계약서", "은행 거래내역서(최근 3개월)"]
        : [];

    return NextResponse.json({ reply, cards, checklist }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { reply: "서버 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
