// app/api/policy-summary/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 정책 문서 요약 함수
function summarizePolicyDocument(text: string): string[] {
  // 긴 텍스트를 5줄로 요약하는 로직
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/[.!?]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);

  if (sentences.length === 0) {
    return ["제공된 문서에서 요약할 내용을 찾을 수 없습니다."];
  }

  // 부동산/주택금융 관련 키워드 가중치
  const keywords = [
    "주택", "대출", "디딤돌", "보금자리", "전세", "월세", "매매", "청약",
    "LTV", "DSR", "금리", "정책", "지원", "특례", "신혼부부", "생애최초",
    "다자녀", "청년", "버팀목", "주택금융공사", "국토교통부", "기재부"
  ];

  // 문장별 중요도 계산
  const scoredSentences = sentences.map(sentence => {
    let score = sentence.length; // 기본 길이 점수
    
    // 키워드 가중치 추가
    keywords.forEach(keyword => {
      if (sentence.includes(keyword)) {
        score += 50;
      }
    });

    // 숫자가 포함된 문장 (정책 내용일 가능성 높음)
    if (/\d/.test(sentence)) {
      score += 20;
    }

    // 특정 패턴 가중치
    if (/지원|혜택|확대|강화|개선/.test(sentence)) {
      score += 30;
    }

    return { sentence, score };
  });

  // 점수 기준으로 정렬하고 상위 5개 선택
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.sentence);

  // 요약 문장이 5개 미만인 경우 보완
  if (topSentences.length < 5) {
    const remainingSentences = sentences.filter(s => !topSentences.includes(s));
    topSentences.push(...remainingSentences.slice(0, 5 - topSentences.length));
  }

  // 문장 정리 및 포맷팅
  return topSentences.map((sentence, index) => {
    let formatted = sentence.trim();
    if (!formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
      formatted += '.';
    }
    return `${index + 1}. ${formatted}`;
  });
}

// 정책 요약 요청인지 확인
function isPolicySummaryRequest(text: string): boolean {
  const indicators = [
    "요약", "정리", "요약해줘", "정리해줘", "5줄 요약", "핵심", "간단히",
    "정책", "발표", "보도자료", "정부", "국토부", "기재부", "금융위"
  ];
  
  const lowercaseText = text.toLowerCase();
  return indicators.some(indicator => lowercaseText.includes(indicator)) ||
         text.length > 500; // 긴 텍스트는 자동으로 요약 대상으로 간주
}

export async function POST(req: NextRequest) {
  try {
    const { text, title } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { ok: false, error: "텍스트가 필요합니다." },
        { status: 400 }
      );
    }

    if (!isPolicySummaryRequest(text)) {
      return NextResponse.json(
        { ok: false, error: "정책 요약 요청이 아닙니다." },
        { status: 400 }
      );
    }

    const summary = summarizePolicyDocument(text);
    
    return NextResponse.json({
      ok: true,
      summary,
      title: title || "정책 문서 요약",
      originalLength: text.length,
      summaryLines: summary.length
    });

  } catch (error) {
    console.error("Policy summary error:", error);
    return NextResponse.json(
      { ok: false, error: "요약 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
