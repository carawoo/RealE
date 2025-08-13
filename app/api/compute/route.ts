// app/api/compute/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// ---- 간단 계산 유틸 ----
function monthlyPaymentEqual(P: number, annualRatePct: number, years: number) {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return P / n;
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function monthlySeriesInterestOnlyThenEqual(
  P: number,
  annualRatePct: number,
  years: number,
  interestOnlyYears = 2
) {
  const r = annualRatePct / 100 / 12;
  const ioMonths = Math.max(interestOnlyYears * 12, 0);
  const totalMonths = years * 12;
  const remainYears = Math.max(years - interestOnlyYears, 1);
  const equalAfter = monthlyPaymentEqual(P, annualRatePct, remainYears);
  const interestOnly = P * r;
  return { interestOnly, equalAfter, ioMonths, totalMonths };
}

const W = (x: number) => Math.round(x).toLocaleString("ko-KR");

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    // 1) 사용자 자유서술 -> 구조화
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const sys =
      "너는 주택대출 상담 보조도구다. 한국어 입력에서 아래 필드를 JSON으로 뽑아라. 모르면 null.\n" +
      "필드: goal(매매|전세|월세), budget(매매총예산 만원), deposit(보유자금/전세보증금 만원), " +
      "income_annual(연소득 만원), employment_months(재직개월), credit_band(상|중|하), " +
      "region(희망지역), term_years(대출기간 년), prefer(stepup|equal|null)";
    const prompt = `사용자 입력:\n${message}\n\nJSON만 반환해. 예시: {"goal":"매매","budget":60000,"deposit":8000,"income_annual":4500,"employment_months":10,"credit_band":"중","region":"수도권","term_years":30,"prefer":"stepup"}`;

    const r = await client.responses.create({
      model: "gpt-4o-mini",
      input: [{ role: "system", content: sys }, { role: "user", content: prompt }],
    });

    let info: any = {};
    try { info = JSON.parse(r.output_text || "{}"); } catch { info = {}; }

    // 2) 기본값
    const goal = info.goal || "매매";
    const termYears = Number(info.term_years) || 30;
    const budgetMan = Number(info.budget) || 60000;    // 만원
    const depositMan = Number(info.deposit) || 8000;   // 만원
    const loanNeed = Math.max(budgetMan - depositMan, 0) * 10000; // 원

    // (임시) 금리 가정: 지금 vs 2개월 대기
    const rateNow = 4.2;
    const rateWait = 3.9;

    // 3) 시나리오 계산
    const n = termYears * 12;

    // 균등(지금)
    const payEqualNow = monthlyPaymentEqual(loanNeed, rateNow, termYears);
    const totalEqualNow = payEqualNow * n - loanNeed;

    // 거치2년 후 균등(지금)
    const step = monthlySeriesInterestOnlyThenEqual(loanNeed, rateNow, termYears, 2);
    const totalStepApprox =
      step.interestOnly * step.ioMonths + step.equalAfter * (n - step.ioMonths) - loanNeed;

    // 균등(2개월 후)
    const payEqualWait = monthlyPaymentEqual(loanNeed, rateWait, termYears);
    const totalEqualWait = payEqualWait * n - loanNeed;

    // 4) 재직 1년 미만 서류 체크리스트
    const empMonths = Number(info.employment_months) || null;
    const docChecklist =
      empMonths !== null && empMonths < 12
        ? [
            "재직증명서 또는 근로계약서",
            "최근 3개월 급여명세서",
            "건강보험자격득실 확인서",
            "최근 12개월 건강보험료 납부확인서",
            "임대차/매매 예정 계약서 사본(가능 시)"
          ]
        : [];

    // 5) 카드 데이터 구성
    const cards = [
      {
        key: "now_equal",
        title: "지금 실행 · 원리금균등",
        subtitle: `${rateNow}% 고정 가정`,
        monthly: `월 ${W(payEqualNow)}원`,
        totalInterest: `총이자(추정) ${W(totalEqualNow)}원`,
        notes: [`대출기간 ${termYears}년`, `필요대출 약 ${W(loanNeed)}원`]
      },
      {
        key: "now_stepup",
        title: "지금 실행 · 거치 2년 → 균등",
        subtitle: `${rateNow}% 가정`,
        monthly: `거치 2년 이자 ${W(step.interestOnly)}원 → 이후 ${W(step.equalAfter)}원`,
        totalInterest: `총이자(근사) ${W(totalStepApprox)}원`,
        notes: [`초기 부담↓`, `총비용은 다소↑ 가능`]
      },
      {
        key: "wait_equal",
        title: "대기 2개월 · 원리금균등",
        subtitle: `${rateWait}% 가정`,
        monthly: `월 ${W(payEqualWait)}원`,
        totalInterest: `총이자(추정) ${W(totalEqualWait)}원`,
        notes: [`예상 인하분: 월 ${W(Math.max(payEqualNow - payEqualWait,0))}원 절감`]
      }
    ];

    // 6) 요약 한 줄
    const summary = `대출기간 ${termYears}년, 필요대출 약 ${W(loanNeed)}원 기준. 대기 2개월 시 월 ${W(Math.max(payEqualNow - payEqualWait,0))}원 절감 기대(가정).`;

    // 7) Supabase 저장(공유용)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = {
      goal, termYears, loanNeed, rateNow, rateWait,
      cards, docChecklist, summary,
      raw: info
    };

    const { data, error } = await supabase
      .from("recommendations")
      .insert({ payload_json: payload })
      .select("public_id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
    }

    const shareUrl = data?.public_id ? `/r/${data.public_id}` : null;

    // 8) 클라이언트로 반환
    return NextResponse.json({
      reply: summary,
      cards,
      checklist: docChecklist,
      share_url: shareUrl
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { reply: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
