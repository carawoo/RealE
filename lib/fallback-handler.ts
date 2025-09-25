// lib/fallback-handler.ts
// 개선된 폴백 처리 시스템

import { Fields } from './utils';
import { ExpertResponse } from './expert-advisor';

export type FallbackType = 
  | 'insufficient_info'
  | 'unclear_intent'
  | 'complex_question'
  | 'error_handling'
  | 'greeting'
  | 'help_request';

export type FallbackResponse = {
  content: string;
  confidence: 'high' | 'medium' | 'low';
  expertType: 'real_estate' | 'banking' | 'policy' | 'general';
  fallbackType: FallbackType;
  suggestions?: string[];
};

// 폴백 타입 분석
export function analyzeFallbackType(message: string, profile: Fields): FallbackType {
  const text = message.toLowerCase().trim();
  
  // 인사말
  if (/안녕|hello|hi|시작|처음/.test(text) && text.length < 20) {
    return 'greeting';
  }
  
  // 도움 요청
  if (/도움|help|어떻게|뭐|무엇|궁금|모르겠/.test(text)) {
    return 'help_request';
  }
  
  // 정보 부족
  if (text.length < 10 || (!profile.incomeMonthly && !/\d+만원|\d+억/.test(text))) {
    return 'insufficient_info';
  }
  
  // 의도 불명확
  if (text.length > 50 && !/대출|전세|월세|집|아파트|매매|구입|투자/.test(text)) {
    return 'unclear_intent';
  }
  
  // 복잡한 질문
  if (text.length > 100 || /그리고|또한|또|그런데|하지만|그러나/.test(text)) {
    return 'complex_question';
  }
  
  return 'unclear_intent';
}

// 폴백 응답 생성
export function generateFallbackResponse(
  message: string, 
  profile: Fields, 
  fallbackType: FallbackType
): FallbackResponse {
  const text = message.toLowerCase();
  
  switch (fallbackType) {
    case 'greeting':
      return generateGreetingResponse();
    
    case 'help_request':
      return generateHelpResponse();
    
    case 'insufficient_info':
      return generateInsufficientInfoResponse(message, profile);
    
    case 'unclear_intent':
      return generateUnclearIntentResponse(message);
    
    case 'complex_question':
      return generateComplexQuestionResponse(message);
    
    case 'error_handling':
      return generateErrorResponse();
    
    default:
      return generateDefaultFallback();
  }
}

// 인사말 응답
function generateGreetingResponse(): FallbackResponse {
  return {
    content: `안녕하세요! 부동산 대출 전문가입니다. 🏠\n\n` +
             `저는 **부동산 전문가**와 **6년차 은행 과장**의 경험을 바탕으로 상담해드립니다.\n\n` +
             `💡 **도움드릴 수 있는 영역**:\n` +
             `• 대출 시나리오 분석 및 한도 계산\n` +
             `• 정책자금 상담 (보금자리론, 디딤돌 등)\n` +
             `• 부동산 투자 전략 및 시장 분석\n` +
             `• 전세/월세 비교 및 환산\n` +
             `• 서류 준비 및 신청 절차 안내\n\n` +
             `📝 **구체적인 질문 예시**:\n` +
             `• "월소득 500만원으로 5억원 아파트 살 수 있을까요?"\n` +
             `• "보금자리론과 디딤돌 중 뭐가 나을까요?"\n` +
             `• "강남 아파트 투자 어떻게 생각하세요?"\n\n` +
             `어떤 도움이 필요하신지 말씀해 주세요!`,
    confidence: 'high',
    expertType: 'general',
    fallbackType: 'greeting',
    suggestions: [
      '월소득과 매물 가격을 알려주세요',
      '구체적인 목적을 말씀해 주세요',
      '궁금한 정책자금이 있으시면 말씀해 주세요'
    ]
  };
}

// 도움 요청 응답
function generateHelpResponse(): FallbackResponse {
  return {
    content: `어떤 도움이 필요하신지 구체적으로 말씀해 주시면, 전문가 관점에서 정확한 조언을 드리겠습니다! 😊\n\n` +
             `🏠 **부동산 전문가 관점**에서 도움드릴 수 있는 것들:\n` +
             `• 지역별 시세 분석 및 투자 전략\n` +
             `• 매물 선정 기준 및 시장 동향\n` +
             `• 전세/월세 비교 및 환산\n\n` +
             `🏦 **은행 과장 관점**에서 도움드릴 수 있는 것들:\n` +
             `• 대출 시나리오 분석 및 한도 계산\n` +
             `• 정책자금 상담 및 우대조건\n` +
             `• 서류 준비 및 신청 절차\n` +
             `• 은행별 상품 비교\n\n` +
             `📋 **정책 전문가 관점**에서 도움드릴 수 있는 것들:\n` +
             `• 보금자리론, 디딤돌, 버팀목 등 정책자금\n` +
             `• 자격 요건 및 신청 절차\n` +
             `• 우대조건 및 혜택 안내\n\n` +
             `💡 **구체적인 질문 예시**:\n` +
             `• "월소득 400만원으로 얼마까지 대출 가능해?"\n` +
             `• "3억 전세와 보증금 5천+월세 80만원 중 뭐가 나아?"\n` +
             `• "신혼부부 우대금리 얼마나 받을 수 있어?"\n` +
             `• "강남 아파트 투자 어떻게 생각하세요?"`,
    confidence: 'high',
    expertType: 'general',
    fallbackType: 'help_request',
    suggestions: [
      '월소득과 매물 정보를 알려주세요',
      '구체적인 목적을 말씀해 주세요',
      '궁금한 정책자금이 있으시면 말씀해 주세요'
    ]
  };
}

// 정보 부족 응답
function generateInsufficientInfoResponse(message: string, profile: Fields): FallbackResponse {
  const hasNumbers = /\d+만원|\d+억|\d+천만원/.test(message);
  
  if (hasNumbers) {
    return {
      content: `입력해주신 정보를 바탕으로 상담을 도와드리겠습니다. 🏠\n\n` +
               `더 정확한 조언을 위해 다음 정보를 추가로 알려주시면 좋겠습니다:\n\n` +
               `📋 **필수 정보**:\n` +
               `• 월소득 (세후)\n` +
               `• 매물 가격 또는 희망 예산\n` +
               `• 보유 현금\n` +
               `• 구체적인 목적 (구입/전세/투자 등)\n\n` +
               `💡 **예시**:\n` +
               `• "월소득 500만원, 5억원 아파트 구입하고 싶어요"\n` +
               `• "월소득 400만원, 전세 3억원 살 수 있을까요?"\n` +
               `• "월소득 600만원, 투자용 아파트 추천해주세요"\n\n` +
               `상황을 자세히 알려주시면 맞춤형 조언을 드리겠습니다!`,
      confidence: 'medium',
      expertType: 'general',
      fallbackType: 'insufficient_info',
      suggestions: [
        '월소득을 명확히 알려주세요',
        '매물 가격이나 예산을 말씀해 주세요',
        '구체적인 목적을 알려주세요'
      ]
    };
  }
  
  return {
    content: `안녕하세요! 부동산 대출 전문가입니다. 🏠\n\n` +
             `정확한 상담을 위해 몇 가지 정보가 필요합니다.\n\n` +
             `📋 **필요한 정보**:\n` +
             `• 월소득 (세후)\n` +
             `• 매물 가격 또는 희망 예산\n` +
             `• 보유 현금 (선택사항)\n` +
             `• 구체적인 목적\n\n` +
             `💡 **구체적인 질문 예시**:\n` +
             `• "월소득 500만원으로 5억원 아파트 살 수 있을까요?"\n` +
             `• "월소득 400만원, 전세 3억원 살 수 있을까요?"\n` +
             `• "보금자리론과 디딤돌 중 뭐가 나을까요?"\n\n` +
             `상황을 자세히 알려주시면 전문가 관점에서 정확한 조언을 드리겠습니다!`,
    confidence: 'high',
    expertType: 'general',
    fallbackType: 'insufficient_info',
    suggestions: [
      '월소득을 알려주세요',
      '매물 가격이나 예산을 말씀해 주세요',
      '구체적인 목적을 알려주세요'
    ]
  };
}

// 의도 불명확 응답
function generateUnclearIntentResponse(message: string): FallbackResponse {
  return {
    content: `질문을 이해했지만, 더 구체적인 정보가 필요합니다. 🤔\n\n` +
             `어떤 도움이 필요하신지 명확히 말씀해 주시면, 전문가 관점에서 정확한 조언을 드리겠습니다.\n\n` +
             `💡 **구체적인 질문 예시**:\n` +
             `• "월소득 500만원으로 5억원 아파트 살 수 있을까요?"\n` +
             `• "보금자리론과 디딤돌 중 뭐가 나을까요?"\n` +
             `• "강남 아파트 투자 어떻게 생각하세요?"\n` +
             `• "전세 3억원과 월세 보증금 5천+월세 80만원 중 뭐가 나아요?"\n\n` +
             `🏠 **도움드릴 수 있는 영역**:\n` +
             `• 대출 시나리오 분석\n` +
             `• 정책자금 상담\n` +
             `• 부동산 투자 조언\n` +
             `• 전세/월세 비교\n` +
             `• 서류 준비 및 신청 절차\n\n` +
             `더 구체적으로 말씀해 주시면 바로 도와드리겠습니다!`,
    confidence: 'medium',
    expertType: 'general',
    fallbackType: 'unclear_intent',
    suggestions: [
      '월소득과 매물 정보를 알려주세요',
      '구체적인 목적을 말씀해 주세요',
      '궁금한 정책자금이 있으시면 말씀해 주세요'
    ]
  };
}

// 복잡한 질문 응답
function generateComplexQuestionResponse(message: string): FallbackResponse {
  return {
    content: `복잡한 질문이시군요! 단계별로 나누어서 상담해드리겠습니다. 🎯\n\n` +
             `먼저 가장 중요한 부분부터 말씀해 주시면, 전문가 관점에서 정확한 조언을 드리겠습니다.\n\n` +
             `💡 **단계별 접근 방법**:\n` +
             `1️⃣ **기본 정보**: 월소득, 매물 가격, 보유 현금\n` +
             `2️⃣ **목적**: 구입/전세/투자 등\n` +
             `3️⃣ **구체적 질문**: 대출 한도, 정책자금, 비교 분석 등\n\n` +
             `🏠 **예시**:\n` +
             `• "월소득 500만원으로 5억원 아파트 살 수 있을까요?"\n` +
             `• "보금자리론과 디딤돌 중 뭐가 나을까요?"\n` +
             `• "강남 아파트 투자 어떻게 생각하세요?"\n\n` +
             `하나씩 차근차근 상담해드리겠습니다!`,
    confidence: 'medium',
    expertType: 'general',
    fallbackType: 'complex_question',
    suggestions: [
      '가장 중요한 질문부터 말씀해 주세요',
      '월소득과 매물 정보를 먼저 알려주세요',
      '구체적인 목적을 말씀해 주세요'
    ]
  };
}

// 에러 응답
function generateErrorResponse(): FallbackResponse {
  return {
    content: `죄송합니다. 일시적인 오류가 발생했습니다. 😅\n\n` +
             `다시 시도해 주시거나, 다른 방식으로 질문해 주시면 도와드리겠습니다.\n\n` +
             `💡 **간단한 질문 예시**:\n` +
             `• "월소득 500만원으로 5억원 아파트 살 수 있을까요?"\n` +
             `• "보금자리론과 디딤돌 중 뭐가 나을까요?"\n` +
             `• "전세 3억원과 월세 중 뭐가 나아요?"\n\n` +
             `문제가 지속되면 다시 시도해 주세요!`,
    confidence: 'low',
    expertType: 'general',
    fallbackType: 'error_handling',
    suggestions: [
      '다시 시도해 주세요',
      '다른 방식으로 질문해 주세요',
      '간단한 질문부터 시작해 주세요'
    ]
  };
}

// 기본 폴백 응답
function generateDefaultFallback(): FallbackResponse {
  return {
    content: `안녕하세요! 부동산 대출 전문가입니다. 🏠\n\n` +
             `어떤 도움이 필요하신지 구체적으로 말씀해 주시면, 전문가 관점에서 정확한 조언을 드리겠습니다.\n\n` +
             `💡 **도움드릴 수 있는 영역**:\n` +
             `• 대출 시나리오 분석\n` +
             `• 정책자금 상담\n` +
             `• 부동산 투자 조언\n` +
             `• 전세/월세 비교\n` +
             `• 서류 준비 및 신청 절차\n\n` +
             `📝 **구체적인 질문 예시**:\n` +
             `• "월소득 500만원으로 5억원 아파트 살 수 있을까요?"\n` +
             `• "보금자리론과 디딤돌 중 뭐가 나을까요?"\n` +
             `• "강남 아파트 투자 어떻게 생각하세요?"\n\n` +
             `상황을 자세히 알려주시면 맞춤형 조언을 드리겠습니다!`,
    confidence: 'high',
    expertType: 'general',
    fallbackType: 'unclear_intent',
    suggestions: [
      '월소득과 매물 정보를 알려주세요',
      '구체적인 목적을 말씀해 주세요',
      '궁금한 정책자금이 있으시면 말씀해 주세요'
    ]
  };
}

// 폴백 응답을 ExpertResponse 형식으로 변환
export function convertFallbackToExpertResponse(fallback: FallbackResponse): ExpertResponse {
  return {
    content: fallback.content,
    confidence: fallback.confidence,
    expertType: fallback.expertType
  };
}
