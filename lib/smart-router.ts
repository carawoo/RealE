// lib/smart-router.ts
// 개선된 의도 라우팅 시스템 - 전문가 관점의 스마트 라우팅

import { Fields } from './utils';
import { generateNaturalExpertResponse } from './natural-expert';
import { replyJeonseToMonthly } from './utils';
import { generateKnowledgeResponse } from './knowledge';

export type SmartResponse = {
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

// 메인 라우팅 함수 - 자연스러운 전문가 답변
export function routeUserMessage(message: string, profile: Fields): SmartResponse | null {
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
      ...jeonseResponse,
      confidence: 'high',
      expertType: 'general'
    };
  }
  
  // 3. 지식형 질문 (FAQ 등)
  const knowledgeResponse = generateKnowledgeResponse(message, profile);
  if (knowledgeResponse) {
    return {
      ...knowledgeResponse,
      confidence: 'high',
      expertType: 'policy'
    };
  }
  
  // 4. 자연스러운 전문가 답변 (메인 로직)
  const naturalResponse = generateNaturalExpertResponse(message, profile);
  
  return {
    content: naturalResponse.content,
    confidence: naturalResponse.confidence,
    expertType: naturalResponse.expertType,
    fields: profile
  };
}

// 사용자 의도 분류 (개선된 버전)
export function classifyUserIntent(message: string, profile: Fields): {
  intent: string;
  confidence: number;
  context: any;
} {
  const text = message.toLowerCase();
  
  // 의도별 점수 계산
  const intentScores = {
    loan_scenario: 0,
    policy_consultation: 0,
    real_estate_advice: 0,
    calculation: 0,
    general_question: 0
  };
  
  // 대출 시나리오 의도
  if (/\d+만원|\d+억|\d+천만원/.test(text) && 
      (/월소득|소득|월급/.test(text) || profile.incomeMonthly)) {
    intentScores.loan_scenario += 0.8;
  }
  
  if (/시나리오|분석|계산|비교|추천|한도|상환/.test(text)) {
    intentScores.loan_scenario += 0.6;
  }
  
  if (/대출|대출받고|대출받을|대출하고/.test(text)) {
    intentScores.loan_scenario += 0.4;
  }
  
  // 정책 상담 의도
  if (/보금자리론|디딤돌|신생아특례|다자녀특례|버팀목/.test(text)) {
    intentScores.policy_consultation += 0.9;
  }
  
  if (/정책|지원|혜택|자격|조건|신청|절차/.test(text)) {
    intentScores.policy_consultation += 0.5;
  }
  
  // 부동산 조언 의도
  if (/시세|가격|투자|수익|임대|전세|월세/.test(text)) {
    intentScores.real_estate_advice += 0.7;
  }
  
  if (/지역|동향|전망|분석|추천/.test(text)) {
    intentScores.real_estate_advice += 0.5;
  }
  
  // 계산 의도
  if (/얼마|몇|계산|환산|비교/.test(text)) {
    intentScores.calculation += 0.6;
  }
  
  // 일반 질문 의도 (기본값)
  intentScores.general_question = 0.3;
  
  // 최고 점수 의도 찾기
  const maxScore = Math.max(...Object.values(intentScores));
  const intent = Object.keys(intentScores).find(
    key => intentScores[key as keyof typeof intentScores] === maxScore
  ) || 'general_question';
  
  return {
    intent,
    confidence: maxScore,
    context: analyzeUserContext(message, profile)
  };
}

// 응답 품질 검증
export function validateResponse(response: SmartResponse): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // 내용 검증
  if (!response.content || response.content.length < 10) {
    issues.push('응답 내용이 너무 짧습니다.');
    suggestions.push('더 구체적인 정보를 제공하세요.');
  }
  
  if (response.content.length > 2000) {
    issues.push('응답 내용이 너무 깁니다.');
    suggestions.push('핵심 내용만 간결하게 정리하세요.');
  }
  
  // 신뢰도 검증
  if (response.confidence === 'low') {
    issues.push('응답 신뢰도가 낮습니다.');
    suggestions.push('사용자 질문을 더 정확히 파악하세요.');
  }
  
  // 카드 검증
  if (response.cards && response.cards.length > 5) {
    issues.push('카드가 너무 많습니다.');
    suggestions.push('핵심 정보만 카드로 제공하세요.');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}

// 폴백 응답 생성 (자연스러운 버전)
export function generateFallbackResponse(message: string, profile: Fields): SmartResponse {
  const text = message.toLowerCase();
  
  // 사용자가 구체적인 정보를 요청한 경우
  if (/\d+만원|\d+억|\d+천만원/.test(text)) {
    return {
      content: `입력해주신 정보를 바탕으로 상담을 도와드리겠습니다.\n\n` +
               `더 정확한 조언을 위해 다음 정보를 추가로 알려주시면 좋겠습니다:\n\n` +
               `• 월소득 (세후)\n` +
               `• 매물 가격 또는 희망 예산\n` +
               `• 보유 현금\n` +
               `• 구체적인 목적 (구입/전세/투자 등)\n\n` +
               `예시: "월소득 500만원, 5억원 아파트 구입하고 싶어요"`,
      confidence: 'medium',
      expertType: 'general'
    };
  }
  
  // 일반적인 질문인 경우
  return {
    content: `안녕하세요! 부동산 대출 전문가입니다.\n\n` +
             `어떤 도움이 필요하신지 구체적으로 말씀해 주시면, 실무 경험을 바탕으로 정확한 조언을 드리겠습니다.\n\n` +
             `예를 들어:\n` +
             `• "생애최초 신혼부부전용 구입자금 혼인신고 타이밍이 궁금해요"\n` +
             `• "보금자리론과 디딤돌 중 뭐가 나을까요?"\n` +
             `• "월소득 500만원으로 5억원 아파트 살 수 있을까요?"\n\n` +
             `구체적인 상황을 알려주시면 더 정확한 답변을 드릴 수 있습니다.`,
    confidence: 'high',
    expertType: 'general'
  };
}

// 응답 후처리 (자연스러운 버전)
export function postProcessResponse(response: SmartResponse, message: string): SmartResponse {
  // 응답 검증
  const validation = validateResponse(response);
  
  if (!validation.isValid) {
    console.warn('Response validation failed:', validation.issues);
  }
  
  // 이모티콘과 불필요한 포맷팅 제거
  response.content = response.content
    .replace(/[🏠🏦📋💡📊🎯✅❌⚠️💼📝🔧]/g, '') // 이모티콘 제거
    .replace(/\*\*(.*?)\*\*/g, '$1') // 볼드 제거
    .replace(/\n\n+/g, '\n\n') // 연속된 줄바꿈 정리
    .trim();
  
  return response;
}
