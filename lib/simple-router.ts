// lib/simple-router.ts
// 단순하고 효과적인 라우팅 시스템

import { Fields } from './utils';
import { generateSimpleExpertResponse, SimpleResponse } from './simple-expert';
import { replyJeonseToMonthly, JeonseResponse } from './jeonse-calculator';

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
  
  // 3. 전문가 조언 (메인 로직) - 간단 맥락 사용: 직전 용어 정의 두 개가 있었으면 "차이" 질의에 비교 답변
  const expertResponse = generateSimpleExpertResponse(
    enrichWithLightContext(message, previousMessages || []),
    profile
  );
  
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
  return {
    content: "구체적인 상황을 알려주시면 더 정확한 조언을 드릴 수 있어요!",
    confidence: 'medium',
    expertType: 'general',
    fields: profile
  };
}
