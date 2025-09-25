// lib/smart-router.ts
// 개선된 의도 라우팅 시스템 - 전문가 관점의 스마트 라우팅

import { Fields } from './utils';
import { ExpertResponse, generateExpertResponse, analyzeUserContext } from './expert-advisor';
import { replyJeonseToMonthly } from './utils';
import { generateKnowledgeResponse } from './knowledge';
import { 
  analyzeFallbackType, 
  generateFallbackResponse as generateSmartFallback,
  convertFallbackToExpertResponse 
} from './fallback-handler';

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

// 메인 라우팅 함수 - 단순하고 직관적
export function routeUserMessage(message: string, profile: Fields): SmartResponse | null {
  const text = message.toLowerCase().trim();
  
  // 1. 빈 메시지 처리
  if (!text || text.length < 2) {
    return {
      content: "안녕하세요! 부동산 대출 상담을 도와드리겠습니다. 🏠\n\n어떤 도움이 필요하신지 말씀해 주세요.",
      confidence: 'high',
      expertType: 'general'
    };
  }
  
  // 2. 사용자 맥락 분석
  const context = analyzeUserContext(message, profile);
  
  // 3. 전세→월세 환산 (우선 처리)
  const jeonseResponse = replyJeonseToMonthly(message);
  if (jeonseResponse) {
    return {
      ...jeonseResponse,
      confidence: 'high',
      expertType: 'general'
    };
  }
  
  // 4. 지식형 질문 (FAQ 등)
  const knowledgeResponse = generateKnowledgeResponse(message, profile);
  if (knowledgeResponse) {
    return {
      ...knowledgeResponse,
      confidence: 'high',
      expertType: 'policy'
    };
  }
  
  // 5. 전문가 상담 (메인 로직)
  const expertResponse = generateExpertResponse(message, profile, context);
  
  return {
    ...expertResponse,
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

// 폴백 응답 생성 (개선된 버전)
export function generateFallbackResponse(message: string, profile: Fields): SmartResponse {
  // 폴백 타입 분석
  const fallbackType = analyzeFallbackType(message, profile);
  
  // 스마트 폴백 응답 생성
  const smartFallback = generateSmartFallback(message, profile, fallbackType);
  
  // ExpertResponse 형식으로 변환
  const expertResponse = convertFallbackToExpertResponse(smartFallback);
  
  return {
    content: expertResponse.content,
    confidence: expertResponse.confidence,
    expertType: expertResponse.expertType
  };
}

// 응답 후처리 (개선된 버전)
export function postProcessResponse(response: SmartResponse, message: string): SmartResponse {
  // 응답 검증
  const validation = validateResponse(response);
  
  if (!validation.isValid) {
    console.warn('Response validation failed:', validation.issues);
  }
  
  // 전문가 타입에 따른 추가 정보
  if (response.expertType === 'banking' && response.confidence === 'high') {
    response.content += `\n\n💼 **은행 과장 관점**: 위 조언은 6년차 은행 경험을 바탕으로 한 실무 중심의 상담입니다.`;
  } else if (response.expertType === 'policy' && response.confidence === 'high') {
    response.content += `\n\n📋 **정책 전문가 관점**: 최신 정책 정보를 반영한 정확한 상담입니다.`;
  } else if (response.expertType === 'real_estate' && response.confidence === 'high') {
    response.content += `\n\n🏠 **부동산 전문가 관점**: 15년 경력의 시장 분석을 바탕으로 한 조언입니다.`;
  }
  
  return response;
}
