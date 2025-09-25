// lib/context-memory.ts
// 대화 맥락 기억 및 연관 답변 시스템

import { Fields } from './utils';

export type ConversationContext = {
  previousQuestions: string[];
  previousAnswers: string[];
  userProfile: Fields;
  conversationTopic: string;
  lastExpertType: 'real_estate' | 'banking' | 'policy' | 'general';
  conversationFlow: string[];
};

// 대화 맥락 분석
export function analyzeConversationContext(
  message: string, 
  profile: Fields, 
  previousContext?: ConversationContext
): ConversationContext {
  const text = message.toLowerCase();
  
  // 이전 맥락이 있는 경우 연관성 분석
  if (previousContext) {
    const isFollowUp = isFollowUpQuestion(message, previousContext);
    const isRelated = isRelatedQuestion(message, previousContext);
    
    if (isFollowUp || isRelated) {
      return {
        ...previousContext,
        previousQuestions: [...previousContext.previousQuestions, message],
        conversationTopic: previousContext.conversationTopic,
        lastExpertType: previousContext.lastExpertType,
        conversationFlow: [...previousContext.conversationFlow, 'follow_up']
      };
    }
  }
  
  // 새로운 주제 분석
  const topic = analyzeTopic(message);
  const expertType = determineExpertType(message);
  
  return {
    previousQuestions: [message],
    previousAnswers: [],
    userProfile: profile,
    conversationTopic: topic,
    lastExpertType: expertType,
    conversationFlow: ['new_topic']
  };
}

// 후속 질문 판단
function isFollowUpQuestion(message: string, context: ConversationContext): boolean {
  const text = message.toLowerCase();
  
  // 후속 질문 패턴
  const followUpPatterns = [
    /그럼|그러면|그래서|그리고|또한|추가로|더|또|그런데|하지만|그러나/,
    /어떻게|어디서|언제|왜|무엇|어떤|어느|몇|얼마/,
    /확인|알아보|문의|상담|신청|받|가|해|되|가능/,
    /감면|혜택|우대|조건|자격|요건|절차|방법|과정/
  ];
  
  return followUpPatterns.some(pattern => pattern.test(text));
}

// 연관 질문 판단
function isRelatedQuestion(message: string, context: ConversationContext): boolean {
  const text = message.toLowerCase();
  const lastQuestion = context.previousQuestions[context.previousQuestions.length - 1]?.toLowerCase() || '';
  
  // 공통 키워드 분석
  const currentKeywords = extractKeywords(text);
  const previousKeywords = extractKeywords(lastQuestion);
  
  // 키워드 겹침 비율 계산
  const commonKeywords = currentKeywords.filter(keyword => previousKeywords.includes(keyword));
  const overlapRatio = commonKeywords.length / Math.max(currentKeywords.length, previousKeywords.length);
  
  return overlapRatio > 0.3; // 30% 이상 겹치면 연관 질문으로 판단
}

// 키워드 추출
function extractKeywords(text: string): string[] {
  const keywords = [
    '대출', '보금자리론', '디딤돌', '버팀목', '신생아특례', '신혼부부', '생애최초',
    '법무사', '중개수수료', '취득세', '세금', '비용', '보수',
    '매매', '전세', '월세', '투자', '시세', '가격',
    '혼인신고', '자격', '조건', '요건', '절차', '방법',
    '감면', '혜택', '우대', '확인', '문의', '상담'
  ];
  
  return keywords.filter(keyword => text.includes(keyword));
}

// 주제 분석
function analyzeTopic(message: string): string {
  const text = message.toLowerCase();
  
  if (text.includes('정책') || text.includes('보금자리') || text.includes('디딤돌') || 
      text.includes('버팀목') || text.includes('신생아') || text.includes('신혼부부') ||
      text.includes('생애최초') || text.includes('청년')) {
    return 'policy_loan';
  }
  
  if (text.includes('대출') || text.includes('신청') || text.includes('절차') || 
      text.includes('금리') || text.includes('이자') || text.includes('한도')) {
    return 'loan_process';
  }
  
  if (text.includes('법무사') || text.includes('중개수수료') || text.includes('취득세') || 
      text.includes('세금') || text.includes('비용') || text.includes('보수')) {
    return 'transaction_cost';
  }
  
  if (text.includes('투자') || text.includes('시세') || text.includes('가격') || 
      text.includes('지역') || text.includes('아파트') || text.includes('주택')) {
    return 'real_estate_market';
  }
  
  return 'general';
}

// 전문가 타입 결정
function determineExpertType(message: string): 'real_estate' | 'banking' | 'policy' | 'general' {
  const text = message.toLowerCase();
  
  if (text.includes('정책') || text.includes('보금자리') || text.includes('디딤돌') || 
      text.includes('버팀목') || text.includes('신생아') || text.includes('신혼부부') ||
      text.includes('생애최초') || text.includes('청년')) {
    return 'policy';
  }
  
  if (text.includes('대출') || text.includes('신청') || text.includes('절차') || 
      text.includes('금리') || text.includes('이자') || text.includes('한도')) {
    return 'banking';
  }
  
  if (text.includes('투자') || text.includes('시세') || text.includes('가격') || 
      text.includes('지역') || text.includes('아파트') || text.includes('주택') ||
      text.includes('법무사') || text.includes('중개수수료') || text.includes('취득세')) {
    return 'real_estate';
  }
  
  return 'general';
}

// 맥락 기반 답변 생성
export function generateContextualResponse(
  message: string, 
  profile: Fields, 
  context: ConversationContext
): string {
  const text = message.toLowerCase();
  
  // 감면 혜택 확인 방법 안내
  if (text.includes('감면') || text.includes('혜택') || text.includes('우대') || 
      text.includes('확인') || text.includes('어디서') || text.includes('어떻게')) {
    
    let content = `감면 혜택 확인 방법을 안내해드리겠습니다.\n\n`;
    
    if (context.conversationTopic === 'policy_loan') {
      content += `정책자금 감면 혜택 확인 방법:\n\n`;
      content += `1. 기금e든든 사이트 (https://www.hf.go.kr)\n`;
      content += `   • 모의심사에서 자동으로 감면 조건 확인\n`;
      content += `   • 신혼부부, 생애최초, 청약저축 등 우대조건 표시\n\n`;
      content += `2. 주택금융공사 콜센터 (1588-0111)\n`;
      content += `   • 평일 09:00-18:00, 토요일 09:00-13:00\n`;
      content += `   • 개인별 구체적인 감면 조건 상담 가능\n\n`;
      content += `3. 취급은행 방문\n`;
      content += `   • 신청 시점에 정확한 감면 조건 확인\n`;
      content += `   • 서류 제출로 최종 감면 여부 결정\n\n`;
    } else if (context.conversationTopic === 'transaction_cost') {
      content += `세금 감면 혜택 확인 방법:\n\n`;
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
      content += `일반적인 감면 혜택 확인 방법:\n\n`;
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
    
    content += `구체적인 상황을 알려주시면 더 정확한 안내를 드릴 수 있습니다.`;
    
    return content;
  }
  
  // 후속 질문에 대한 연관 답변
  if (context.conversationFlow.includes('follow_up')) {
    return generateFollowUpResponse(message, context);
  }
  
  return '';
}

// 후속 질문 답변 생성
function generateFollowUpResponse(message: string, context: ConversationContext): string {
  const text = message.toLowerCase();
  const lastTopic = context.conversationTopic;
  
  if (lastTopic === 'policy_loan' && text.includes('절차')) {
    return `정책자금 신청 절차를 단계별로 안내해드리겠습니다.\n\n` +
           `1단계: 기금e든든 모의심사 (자격 확인)\n` +
           `2단계: 필요 서류 준비 (소득증명서, 재직증명서 등)\n` +
           `3단계: 취급은행 방문하여 신청\n` +
           `4단계: 심사 (보통 2-3주 소요)\n` +
           `5단계: 승인 후 실행\n\n` +
           `각 단계별로 더 구체적인 정보가 필요하시면 말씀해 주세요.`;
  }
  
  if (lastTopic === 'transaction_cost' && text.includes('총비용')) {
    return `매매 시 총 비용을 정리해드리겠습니다.\n\n` +
           `주요 비용 항목:\n` +
           `• 중개수수료: 매매가격의 0.4-0.9%\n` +
           `• 취득세: 매매가격의 1-4%\n` +
           `• 법무사비용: 매매가격의 0.1-0.2%\n` +
           `• 기타: 인지세, 등록세 등\n\n` +
           `구체적인 매매가격을 알려주시면 정확한 계산을 해드릴 수 있습니다.`;
  }
  
  return '';
}
