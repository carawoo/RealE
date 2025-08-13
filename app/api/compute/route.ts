// app/api/compute/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// ---- 간단 계산 유틸 ----
function monthlyPaymentEqual(P: number, annualRatePct: number, years: number) {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return P / n;
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// 거치 2년(이자만) + 잔여기간 원리금균등
function monthlySeriesInterestOnlyThenEqual(
  P: number,
  annualRatePct: number,
  years: number,
  interestOnlyYears = 2
) {
  const r = annualRatePct / 100 / 12;
  const ioMonths = interestOnlyYears * 12;
  const totalMonths = years * 12;
  const remainYears = Math.max(years - interestOnlyYears, 1);
  const equalAfter = monthlyPaymentEqual(P, annualRatePct, remainYears);
  const interestOnly = P * r; // 매월 이자만
  return { interestOnly, equalAfter, ioMonths, totalMonths };
}

function fmtWon(x: number) {
  return Math.round(x).toLocaleString("ko-KR");
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    // 1) OpenAI로 사용자 자유서술 → 구조화
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const sys =
      "너는 주택대출 상담 보조도구다. 사용자의 한국어 입력에서 아래 필드를 JSON으로 뽑아라. 모르면 null.\n" +
      "필드: goal(매매|전세|월세), budget(매매총예산, 숫자만원), deposit(보유자금/전세보증금, 숫자만원), " +
      "income_annual(연소득 만원), employment_months(재직개월), credit_band(상|중|하), " +
      "region(희망지역), term_years(대출기간 년), prefer(stepup|equal|null)";
    const prompt = `사용자 입력:\n${message}\n\nJSON만 반환해. 예:{ "goal":"매매","budget":60000,"deposit":8000,"income_annual":4500,"employment_months":10,"credit_band":"중","region":"수도권","term_years":30,"prefer":"stepup" }`;

    const r = await client.responses.create({
      model: "gpt-4o-mini",
      input: [{ role: "system", content: sys }, { role: "user", content: prompt }],
    });

    const text = r.output_text || "{}";
    let info: any = {};
    try { info = JSON.parse(text); } catch { info = {}; }

    // 2) 기본값(빈칸일 때)
    const goal = info.goal || "매매";
    const termYears = Number(info.term_years) || 30;
    const budgetMan = Number(info.budget) || 60000;      // 만원 단위
    const depositMan = Number(info.deposit) || 8000;     // 만원 단위
    const loanNeed = Math.max(budgetMan - depositMan, 0) * 10000; // 원 단위

    // 금리 가정(진짜 연결 전까지 임시값)
    const rateNow = 4.2;       // 지금 고정
    const rateWait = 3.9;      // 2개월 후 예상
    const payEqualNow = monthlyPaymentEqual(loanNeed, rateNow, termYears);
    const step = monthlySeriesInterestOnlyThenEqual(loanNeed, rateNow, termYears, 2);

    const payEqualWait = monthlyPaymentEqual(loanNeed, rateWait, termYears);

    // 총이자(러프): 균등은 월납×n - 원금 / 체증식은 대략 근사치
    const n = termYears * 12;
    const totalEqualNow = payEqualNow * n - loanNeed;
    const totalEqualWait = payEqualWait * n - loanNeed;
    const totalStepApprox =
      step.interestOnly * step.ioMonths + step.equalAfter * (n - step.ioMonths) - loanNeed;

    // 3) 응답 문구
    const lines: string[] = [];
    lines.push(`목표: ${goal}, 대출기간: ${termYears}년, 필요 대출액 약 ${fmtWon(loanNeed)}원`);
    lines.push("");
    lines.push(`[지금 실행–원리금균등 @ ${rateNow}%]`);
    lines.push(`월 상환액 약 ${fmtWon(payEqualNow)}원, 총이자(추정) ${fmtWon(totalEqualNow)}원`);
    lines.push("");
    lines.push(`[지금 실행–거치 2년 → 균등 @ ${rateNow}%]`);
    lines.push(
      `거치기간(2년) 월 이자 ${fmtWon(step.interestOnly)}원 → 이후 ${fmtWon(
        step.equalAfter
      )}원 (총이자 근사 ${fmtWon(totalStepApprox)}원)`
    );
    lines.push("");
    lines.push(`[대기 2개월–원리금균등 @ ${rateWait}% 가정]`);
    lines.push(`월 상환액 약 ${fmtWon(payEqualWait)}원, 총이자(추정) ${fmtWon(totalEqualWait)}원`);
    lines.push("");
    lines.push(
      `요약: 지금-거치식은 초기 부담을 낮추고, 2개월 대기 시 월 ${fmtWon(
        payEqualNow - payEqualWait
      )}원 정도 절감 기대.`
    );
    lines.push(
      `주의: 금리/정책은 변동 가능. 실제 승인/한도/금리는 금융기관 심사에 따릅니다.`
    );

    return NextResponse.json({ reply: lines.join("\n") });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { reply: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
