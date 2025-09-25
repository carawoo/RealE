// lib/enhanced-fallback.ts
// 개선된 폴백 답변 시스템

import { Fields } from './utils';
import { ConversationContext } from './context-memory';

export type EnhancedFallbackResponse = {
  content: string;
  confidence: 'high' | 'medium' | 'low';
  expertType: 'real_estate' | 'banking' | 'policy' | 'general';
  suggestions?: string[];
  nextSteps?: string[];
};

// 개선된 폴백 답변 생성
export function generateEnhancedFallbackResponse(
  message: string, 
  profile: Fields, 
  context?: ConversationContext
): EnhancedFallbackResponse {
  const text = message.toLowerCase();
  
  // 맥락이 있는 경우 연관 답변 시도
  if (context && context.conversationTopic !== 'general') {
    const contextualResponse = generateContextualFallback(message, context);
    if (contextualResponse) {
      return contextualResponse;
    }
  }
  
  // 구체적인 확인 방법이 필요한 질문
  if (text.includes('확인') || text.includes('어디서') || text.includes('어떻게') || 
      text.includes('문의') || text.includes('상담') || text.includes('알아보')) {
    return generateVerificationGuidance(message, profile);
  }
  
  // 감면 혜택 관련 질문
  if (text.includes('감면') || text.includes('혜택') || text.includes('우대') || 
      text.includes('조건') || text.includes('자격')) {
    return generateBenefitGuidance(message, profile);
  }
  
  // 절차 관련 질문
  if (text.includes('절차') || text.includes('방법') || text.includes('과정') || 
      text.includes('신청') || text.includes('받') || text.includes('가')) {
    return generateProcessGuidance(message, profile);
  }
  
  // 일반적인 폴백
  return generateGeneralFallback(message, profile);
}

// 맥락 기반 폴백 답변
function generateContextualFallback(
  message: string, 
  context: ConversationContext
): EnhancedFallbackResponse | null {
  const text = message.toLowerCase();
  
  if (context.conversationTopic === 'policy_loan') {
    return {
      content: `정책자금 관련 질문이시군요. 이전 대화를 바탕으로 도움을 드리겠습니다.\n\n` +
               `정책자금 상담을 위해 다음 정보를 알려주시면 더 정확한 답변을 드릴 수 있습니다:\n\n` +
               `• 관심 있는 정책자금 (보금자리론, 디딤돌, 버팀목 등)\n` +
               `• 현재 소득 상황\n` +
               `• 주택 구입 목적 (자가/투자/전세)\n` +
               `• 구체적인 궁금한 점\n\n` +
               `예시: "보금자리론 신청 절차가 궁금해요" 또는 "생애최초 감면 조건을 확인하고 싶어요"`,
      confidence: 'high',
      expertType: 'policy',
      suggestions: [
        '보금자리론 신청 절차',
        '디딤돌 대출 조건',
        '생애최초 감면 혜택',
        '신혼부부 우대 조건'
      ],
      nextSteps: [
        '기금e든든 모의심사',
        '취급은행 상담 예약',
        '필요 서류 준비'
      ]
    };
  }
  
  if (context.conversationTopic === 'transaction_cost') {
    return {
      content: `부동산 거래 비용 관련 질문이시군요. 이전 대화를 바탕으로 도움을 드리겠습니다.\n\n` +
               `거래 비용 상담을 위해 다음 정보를 알려주시면 더 정확한 답변을 드릴 수 있습니다:\n\n` +
               `• 매매가격 또는 예상 예산\n` +
               `• 주택 유형 (아파트, 단독주택, 오피스텔 등)\n` +
               `• 구체적인 비용 항목 (중개수수료, 취득세, 법무사비용 등)\n` +
               `• 생애최초 여부\n\n` +
               `예시: "3억원 아파트 중개수수료 얼마나 나와요?" 또는 "취득세 감면 조건을 확인하고 싶어요"`,
      confidence: 'high',
      expertType: 'real_estate',
      suggestions: [
        '중개수수료 계산',
        '취득세 계산',
        '법무사비용 안내',
        '감면 혜택 확인'
      ],
      nextSteps: [
        '관할 세무서 문의',
        '부동산 중개업소 상담',
        '국세청 홈택스 확인'
      ]
    };
  }
  
  return null;
}

// 확인 방법 안내
function generateVerificationGuidance(
  message: string, 
  profile: Fields
): EnhancedFallbackResponse {
  const text = message.toLowerCase();
  
  let content = `확인 방법을 구체적으로 안내해드리겠습니다.\n\n`;
  
  if (text.includes('정책') || text.includes('대출') || text.includes('보금자리') || 
      text.includes('디딤돌') || text.includes('버팀목')) {
    content += `정책자금 확인 방법:\n\n`;
    content += `1. 기금e든든 사이트 (https://www.hf.go.kr)\n`;
    content += `   • 모의심사로 자격 조건 확인\n`;
    content += `   • 우대 조건 및 감면 혜택 확인\n\n`;
    content += `2. 주택금융공사 콜센터 (1588-0111)\n`;
    content += `   • 평일 09:00-18:00, 토요일 09:00-13:00\n`;
    content += `   • 개인별 구체적인 상담 가능\n\n`;
    content += `3. 취급은행 방문\n`;
    content += `   • 신청 시점에 정확한 조건 확인\n`;
    content += `   • 서류 제출로 최종 결정\n\n`;
  } else if (text.includes('세금') || text.includes('취득세') || text.includes('감면')) {
    content += `세금 감면 확인 방법:\n\n`;
    content += `1. 국세청 홈택스 (https://hometax.go.kr)\n`;
    content += `   • 취득세 계산기로 감면 조건 확인\n`;
    content += `   • 생애최초, 신혼부부 등 감면 여부 조회\n\n`;
    content += `2. 관할 세무서 방문\n`;
    content += `   • 개인별 구체적인 감면 조건 상담\n`;
    content += `   • 필요 서류 안내 및 신청 절차 안내\n\n`;
    content += `3. 부동산 중개업소 상담\n`;
    content += `   • 지역별 감면 정책 정보 제공\n`;
    content += `   • 실제 거래 경험 기반 조언\n\n`;
  } else {
    content += `일반적인 확인 방법:\n\n`;
    content += `1. 관련 기관 홈페이지\n`;
    content += `   • 정책자금: 주택금융공사 (hf.go.kr)\n`;
    content += `   • 세금: 국세청 홈택스 (hometax.go.kr)\n`;
    content += `   • 지방세: 해당 시/구청 홈페이지\n\n`;
    content += `2. 콜센터 문의\n`;
    content += `   • 정책자금: 1588-0111\n`;
    content += `   • 세금: 126 (국세청)\n`;
    content += `   • 지방세: 해당 시/구청 전화번호\n\n`;
    content += `3. 현장 방문\n`;
    content += `   • 취급은행, 세무서, 시/구청\n`;
    content += `   • 개인별 구체적인 상담 가능\n\n`;
  }
  
  content += `원하시면, 매매가/소득/자기자본 한 줄만 알려주셔도 바로 계산해 드릴게요.`;
  
  return {
    content,
    confidence: 'high',
    expertType: 'policy',
    suggestions: [
      '기금e든든 모의심사',
      '관할 세무서 방문',
      '취급은행 상담'
    ],
    nextSteps: [
      '필요 서류 준비',
      '상담 예약',
      '온라인 확인'
    ]
  };
}

// 혜택 안내
function generateBenefitGuidance(
  message: string, 
  profile: Fields
): EnhancedFallbackResponse {
  const text = message.toLowerCase();
  
  let content = `감면 혜택에 대해 안내해드리겠습니다.\n\n`;
  
  if (text.includes('생애최초') || text.includes('신혼부부')) {
    content += `생애최초/신혼부부 감면 혜택:\n\n`;
    content += `• 정책자금: 우대금리 최대 0.5%p 할인\n`;
    content += `• 취득세: 감면 혜택 (조건별 차등)\n`;
    content += `• 중개수수료: 일부 감면 가능\n\n`;
    content += `확인 방법:\n`;
    content += `1. 기금e든든 모의심사에서 자동 확인\n`;
    content += `2. 관할 세무서에서 취득세 감면 조건 확인\n`;
    content += `3. 부동산 중개업소에서 중개수수료 감면 문의\n\n`;
  } else if (text.includes('청년') || text.includes('청약저축')) {
    content += `청년/청약저축 감면 혜택:\n\n`;
    content += `• 정책자금: 우대금리 최대 0.2%p 할인\n`;
    content += `• 청약저축: 가입 기간에 따른 우대\n`;
    content += `• 청년전용: 별도 우대 조건\n\n`;
    content += `확인 방법:\n`;
    content += `1. 청약저축 가입 내역 확인\n`;
    content += `2. 기금e든든에서 청년전용 조건 확인\n`;
    content += `3. 취급은행에서 우대 조건 상담\n\n`;
  } else {
    content += `일반적인 감면 혜택:\n\n`;
    content += `• 정책자금: 신혼부부, 생애최초, 청약저축 등\n`;
    content += `• 세금: 생애최초, 신혼부부, 다자녀 등\n`;
    content += `• 중개수수료: 지역별, 업소별 차등\n\n`;
    content += `확인 방법:\n`;
    content += `1. 기금e든든 모의심사 (정책자금)\n`;
    content += `2. 국세청 홈택스 (세금)\n`;
    content += `3. 부동산 중개업소 (중개수수료)\n\n`;
  }
  
  content += `필요하면 한 줄 예시로 보내주세요: “매매 5억4천, 자기자본 1억, 월소득 500만”.`;
  
  return {
    content,
    confidence: 'high',
    expertType: 'policy',
    suggestions: [
      '기금e든든 모의심사',
      '국세청 홈택스 확인',
      '관할 세무서 방문'
    ],
    nextSteps: [
      '자격 조건 확인',
      '필요 서류 준비',
      '신청 절차 안내'
    ]
  };
}

// 절차 안내
function generateProcessGuidance(
  message: string, 
  profile: Fields
): EnhancedFallbackResponse {
  const text = message.toLowerCase();
  
  let content = `신청 절차를 안내해드리겠습니다.\n\n`;
  
  if (text.includes('정책') || text.includes('대출') || text.includes('보금자리') || 
      text.includes('디딤돌') || text.includes('버팀목')) {
    content += `정책자금 신청 절차:\n\n`;
    content += `1단계: 기금e든든 모의심사 (자격 확인)\n`;
    content += `2단계: 필요 서류 준비 (소득증명서, 재직증명서 등)\n`;
    content += `3단계: 취급은행 방문하여 신청\n`;
    content += `4단계: 심사 (보통 2-3주 소요)\n`;
    content += `5단계: 승인 후 실행\n\n`;
    content += `각 단계별로 더 구체적인 정보가 필요하시면 말씀해 주세요.`;
  } else if (text.includes('세금') || text.includes('취득세') || text.includes('신고')) {
    content += `세금 신고 절차:\n\n`;
    content += `1단계: 취득세 신고서 작성\n`;
    content += `2단계: 필요 서류 준비 (매매계약서, 등기부등본 등)\n`;
    content += `3단계: 관할 세무서 제출\n`;
    content += `4단계: 세액 계산 및 납부\n`;
    content += `5단계: 감면 신청 (해당 시)\n\n`;
    content += `각 단계별로 더 구체적인 정보가 필요하시면 말씀해 주세요.`;
  } else {
    content += `일반적인 신청 절차:\n\n`;
    content += `1단계: 자격 조건 확인\n`;
    content += `2단계: 필요 서류 준비\n`;
    content += `3단계: 관련 기관 방문 또는 온라인 신청\n`;
    content += `4단계: 심사 및 승인\n`;
    content += `5단계: 실행 및 완료\n\n`;
    content += `구체적인 신청 대상을 알려주시면 더 정확한 절차를 안내해드릴 수 있습니다.`;
  }
  
  return {
    content,
    confidence: 'high',
    expertType: 'banking',
    suggestions: [
      '기금e든든 모의심사',
      '필요 서류 준비',
      '취급은행 상담'
    ],
    nextSteps: [
      '자격 조건 확인',
      '서류 준비',
      '신청 절차 진행'
    ]
  };
}

// 일반적인 폴백
function generateGeneralFallback(
  message: string, 
  profile: Fields
): EnhancedFallbackResponse {
  const text = message.toLowerCase();
  
  let content = `안녕하세요! 부동산 대출 전문가입니다.\n\n`;
  content += `어떤 도움이 필요하신지 구체적으로 말씀해 주시면, 실무 경험을 바탕으로 정확한 조언을 드리겠습니다.\n\n`;
  
  content += `주요 상담 영역:\n`;
  content += `• 정책자금 상담 (보금자리론, 디딤돌, 버팀목 등)\n`;
  content += `• 대출 신청 절차 및 조건\n`;
  content += `• 부동산 거래 비용 (중개수수료, 취득세, 법무사비용 등)\n`;
  content += `• 감면 혜택 확인 방법\n`;
  content += `• 부동산 투자 조언\n\n`;
  
  content += `구체적인 질문 예시:\n`;
  content += `• "보금자리론 신청 절차가 궁금해요"\n`;
  content += `• "3억원 아파트 중개수수료 얼마나 나와요?"\n`;
  content += `• "생애최초 감면 조건을 확인하고 싶어요"\n`;
  content += `• "월소득 500만원으로 5억원 아파트 살 수 있을까요?"\n\n`;
  
  content += `상황을 자세히 알려주시면 맞춤형 조언을 드리겠습니다!`;
  
  return {
    content,
    confidence: 'high',
    expertType: 'general',
    suggestions: [
      '정책자금 상담',
      '대출 신청 절차',
      '거래 비용 계산',
      '감면 혜택 확인'
    ],
    nextSteps: [
      '구체적인 상황 설명',
      '관련 서류 준비',
      '상담 예약'
    ]
  };
}
