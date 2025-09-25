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
export function routeUserMessage(message: string, profile: Fields): SimpleRouterResponse | null {
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
  
  // 3. 전문가 조언 (메인 로직)
  const expertResponse = generateSimpleExpertResponse(message, profile);
  
  return {
    content: expertResponse.content,
    confidence: expertResponse.confidence,
    expertType: expertResponse.expertType,
    fields: profile
  };
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
