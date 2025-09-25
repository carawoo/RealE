// lib/simple-router.ts
// 단순하고 효과적인 라우팅 시스템

import { Fields } from './utils';
import { generateSimpleExpertResponse, SimpleResponse } from './simple-expert';
import { replyJeonseToMonthly, JeonseResponse } from './jeonse-calculator';
import { extractIntentAndSlots, oneLineMissingPrompt } from './intent-slots';

export type SimpleRouterResponse = {
  content: string;
  cards?: Array<{
    title: string;
    subtitle?: string;
    monthly?: string;
    totalInterest?: string;
    notes?: string[];
  }> | null;
  checklist?: string[] | null;
  fields?: Fields;
  confidence: 'high' | 'medium' | 'low';
  expertType: 'real_estate' | 'banking' | 'policy' | 'general';
};

// 메인 라우팅 함수
export function routeUserMessage(message: string, profile: Fields, previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>): SimpleRouterResponse | null {
  const text = message.toLowerCase().trim();
  
  // 1. 빈 메시지 처리
  if (!text || text.length < 2) {
    return {
      content: "안녕하세요! 부동산 대출 전문가입니다.\n\n어떤 도움이 필요하신지 말씀해 주세요.",
      confidence: 'high',
      expertType: 'general'
    };
  }
  
  // 2. 전세→월세 환산 (우선 처리)
  const jeonseResponse = replyJeonseToMonthly(message);
  if (jeonseResponse) {
    return {
      content: jeonseResponse.content,
      cards: jeonseResponse.cards,
      checklist: jeonseResponse.checklist,
      confidence: 'high',
      expertType: 'general',
      fields: profile
    };
  }
  
  // 3. 의도/슬롯 추출 → 부족 슬롯 가정/요청 병행 → 전문가 조언
  const enriched = enrichWithLightContext(message, previousMessages || []);
  const { intent, slots, missing } = extractIntentAndSlots(enriched);

  let expertResponse = generateSimpleExpertResponse(enriched, { ...profile, ...slots });

  // 부족 슬롯이 있고 응답 내용이 너무 일반적이면, 가정 기반 문구 + 한 줄 안내 추가
  if (missing.length && expertResponse.confidence !== 'high') {
    const tail = oneLineMissingPrompt(missing);
    expertResponse = {
      ...expertResponse,
      content: tail ? `${expertResponse.content}\n\n${tail}` : expertResponse.content,
      confidence: expertResponse.confidence === 'low' ? 'medium' : expertResponse.confidence
    };
  }
  
  return {
    content: expertResponse.content,
    confidence: expertResponse.confidence,
    expertType: expertResponse.expertType,
    fields: profile
  };
}

// 직전 대화 맥락을 가볍게 반영하여 비교형 질문 보강
function enrichWithLightContext(message: string, prev: Array<{ role: 'user' | 'assistant'; content: string }>): string {
  const t = message.toLowerCase();
  if (t.includes('차이') || t.includes('뭐가 달라') || t.includes('비교')) {
    const lastTwo = prev.filter(p => p.role === 'assistant').slice(0, 3).map(p => p.content.toLowerCase()).join(' ');
    const knowDSR = lastTwo.includes('dsr') || lastTwo.includes('총부채원리금상환비율');
    const knowDTI = lastTwo.includes('dti') || lastTwo.includes('총부채상환비율');
    if (knowDSR || knowDTI) {
      return `${message}\n(참고: 직전 대화에서 ${knowDSR ? 'DSR' : ''}${knowDSR && knowDTI ? ' / ' : ''}${knowDTI ? 'DTI' : ''} 정의가 설명되었습니다. 둘의 차이를 설명해줘.)`;
    }
  }
  return message;
}

// 응답 후처리
export function postProcessResponse(response: SimpleRouterResponse, message: string): SimpleRouterResponse {
  // 이모티콘과 불필요한 포맷팅 제거
  response.content = response.content
    .replace(/[🏠🏦📋💡📊🎯✅❌⚠️💼📝🔧]/g, '') // 이모티콘 제거
    .replace(/\*\*(.*?)\*\*/g, '$1') // 볼드 제거
    .replace(/\n\n+/g, '\n\n') // 연속된 줄바꿈 정리
    .trim();

  return response;
}

// 폴백 응답 생성 (최후의 수단)
export function generateFallbackResponse(message: string, profile: Fields): SimpleRouterResponse {
  // 동적 기본 답변: 즉시 실행 가능한 예시를 제시해 대화를 전진시킵니다.
  const examples = [
    '- 매매: “매매 5.4억, 자기자본 1억, 월소득 500만, 비규제”',
    '- 전세 비교: “전세 3억 vs 보증금 5천·월세 80”',
    '- 정책: “디딤돌 신혼부부, 12월 신청 소득기간?”'
  ].join('\n');
  return {
    content: `바로 계산/분석해 드릴게요. 한 줄로 알려주세요:\n${examples}`,
    confidence: 'medium',
    expertType: 'general',
    fields: profile
  };
}
