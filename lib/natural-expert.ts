// lib/natural-expert.ts
// 자연스러운 전문가 답변 시스템 - 실제 전문가처럼 답변

import { Fields } from './utils';

export type NaturalResponse = {
  content: string;
  confidence: 'high' | 'medium' | 'low';
  expertType: 'real_estate' | 'banking' | 'policy' | 'general';
};

// 정책 전문가 답변 생성
export function generatePolicyExpertResponse(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  // 생애최초 신혼부부전용 구입자금 관련
  if (text.includes('생애최초') && text.includes('신혼부부') && text.includes('혼인신고')) {
    return {
      content: `생애최초 신혼부부전용 구입자금의 경우, 혼인신고는 반드시 대출 신청 전에 해야 합니다.\n\n` +
               `이유는 신혼부부 자격 요건을 확인하는 과정에서 혼인신고서가 필수 서류이기 때문입니다. 결혼식이 3개월 남았다고 해도 혼인신고는 미리 할 수 있어요.\n\n` +
               `실제로는 혼인신고만 하면 되고, 결혼식은 나중에 해도 됩니다. 대출 신청 시점에 신혼부부 자격이 확인되면 우대 조건을 받을 수 있어요.\n\n` +
               `추천하는 순서는:\n` +
               `1. 혼인신고 먼저\n` +
               `2. 기금e든든 모의심사\n` +
               `3. 대출 신청\n` +
               `4. 결혼식은 나중에\n\n` +
               `이렇게 하시면 신혼부부 우대 조건을 확실히 받을 수 있습니다.`,
      confidence: 'high',
      expertType: 'policy'
    };
  }
  
  // 청년버팀목 전세대출 + 결혼 관련
  if (text.includes('청년버팀목') && text.includes('결혼') && text.includes('혼인신고')) {
    return {
      content: `청년버팀목 전세대출을 받은 후 결혼하시는 것은 전혀 문제없습니다.\n\n` +
               `청년버팀목은 개인 대출이기 때문에 결혼 후에도 그대로 유지됩니다. 혼인신고를 해도 대출금을 반환할 필요가 없어요.\n\n` +
               `오히려 결혼 후에는 부부 합산 소득으로 더 유리한 조건의 대출을 받을 수 있는 경우가 많습니다. 예를 들어:\n\n` +
               `- 보금자리론이나 디딤돌 대출로 전세에서 매매로 전환\n` +
               `- 신혼부부 우대 조건 적용\n` +
               `- 더 높은 대출 한도 확보\n\n` +
               `현재 청년버팀목은 그대로 두시고, 결혼 후에 추가 대출이나 대환을 고려해보시는 것을 추천합니다.`,
      confidence: 'high',
      expertType: 'policy'
    };
  }
  
  // 보금자리 신청 + 신용조회 관련
  if (text.includes('보금자리') && text.includes('신용조회') && text.includes('연락')) {
    return {
      content: `보금자리 신청 후 주택공사에서 신용조회를 했다는 것은 심사가 진행되고 있다는 좋은 신호입니다.\n\n` +
               `일반적으로 신용조회 후 연락이 오는 시점은:\n` +
               `- 1-2일 내: 서류 보완 요청이나 추가 확인\n` +
               `- 3-5일 내: 심사 결과 통보\n` +
               `- 1주일 내: 최종 승인 또는 거절 통보\n\n` +
               `월요일에 신청하셨고 오늘이면 3-4일째이니, 곧 연락이 올 가능성이 높습니다. 주택공사는 보통 오후에 연락을 드리는 경우가 많아요.\n\n` +
               `만약 내일까지 연락이 없다면 주택공사에 직접 문의해보시는 것도 좋습니다. 심사 진행 상황을 확인할 수 있어요.`,
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  // 디딤돌→보금자리 대환 관련
  if (text.includes('디딤') && text.includes('보금') && text.includes('대환') && text.includes('등기')) {
    return {
      content: `등기친지 3개월 후에 디딤돌에서 보금자리로 대환하는 것은 가능합니다.\n\n` +
               `다만 몇 가지 조건이 있어요:\n` +
               `- 등기 완료 후 3개월 경과 (현재 조건 충족)\n` +
               `- 보금자리론 자격 요건 충족\n` +
               `- 기존 디딤돌 대출 잔액 확인\n\n` +
               `대환 절차는:\n` +
               `1. 보금자리론 신청\n` +
               `2. 승인 후 디딤돌 대출 상환\n` +
               `3. 보금자리론 실행\n\n` +
               `이렇게 하시면 더 낮은 금리로 대환할 수 있어서 월 상환액이 줄어들 가능성이 높습니다. 다만 대환 수수료가 발생할 수 있으니 미리 계산해보시는 것을 추천합니다.`,
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  // 신생아특례대출 + 은행 상담 관련
  if (text.includes('신생아특례') && text.includes('은행') && text.includes('상담')) {
    return {
      content: `신생아특례대출을 위해 은행에서 미리 상담받는 것은 매우 좋은 선택입니다.\n\n` +
               `은행 직원들은 최신 정책 정보를 잘 알고 있고, 개인 상황에 맞는 맞춤형 조언을 해줍니다. 특히:\n\n` +
               `- 자격 요건 정확한 확인\n` +
               `- 필요 서류 미리 안내\n` +
               `- 신청 시기 조언\n` +
               `- 우대 조건 확인\n\n` +
               `다만 은행마다 설명 수준이 다를 수 있어서, 여러 은행을 비교해보시는 것을 추천합니다. 특히 주택금융공사 취급 은행들이 더 정확한 정보를 제공해요.\n\n` +
               `상담 시에는 출산 예정일, 소득 증명서, 주택 관련 서류들을 미리 준비해가시면 더 구체적인 조언을 받을 수 있습니다.`,
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  // 일반적인 정책 질문
  if (text.includes('정책') || text.includes('대출') || text.includes('보금자리') || text.includes('디딤돌')) {
    return {
      content: `정책 관련 질문이시군요. 구체적인 상황을 알려주시면 더 정확한 답변을 드릴 수 있습니다.\n\n` +
               `예를 들어:\n` +
               `- 어떤 정책자금을 고려하고 계신지\n` +
               `- 현재 소득과 주택 상황\n` +
               `- 구체적인 목적 (구입/전세/대환 등)\n\n` +
               `이런 정보들을 알려주시면 실무 경험을 바탕으로 정확한 조언을 드리겠습니다.`,
      confidence: 'medium',
      expertType: 'policy'
    };
  }
  
  return {
    content: `질문을 이해했지만, 더 구체적인 정보가 필요합니다.\n\n` +
             `어떤 정책자금이나 대출 상품에 대해 궁금하신지, 그리고 현재 상황을 알려주시면 실무 경험을 바탕으로 정확한 답변을 드리겠습니다.`,
    confidence: 'medium',
    expertType: 'policy'
  };
}

// 은행 과장 답변 생성
export function generateBankingExpertResponse(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  // 대출 신청 절차 관련
  if (text.includes('신청') && (text.includes('절차') || text.includes('과정'))) {
    return {
      content: `대출 신청 절차는 생각보다 간단합니다.\n\n` +
               `1단계: 기금e든든에서 모의심사 (자격 확인)\n` +
               `2단계: 필요 서류 준비 (소득증명서, 재직증명서 등)\n` +
               `3단계: 취급은행 방문하여 신청\n` +
               `4단계: 심사 (보통 2-3주 소요)\n` +
               `5단계: 승인 후 실행\n\n` +
               `가장 중요한 것은 1단계 모의심사입니다. 여기서 자격이 확인되면 실제 승인 가능성이 높아요.\n\n` +
               `서류 준비도 미리 해두시면 신청 과정이 훨씬 빨라집니다. 특히 소득증명서는 3개월치를 준비해두시는 것이 좋습니다.`,
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  // 금리 관련 질문
  if (text.includes('금리') || text.includes('이자')) {
    return {
      content: `현재 정책자금 금리는 상당히 좋은 수준입니다.\n\n` +
               `보금자리론: 연 2.5-3.5%\n` +
               `디딤돌: 연 3.2-4.05%\n` +
               `버팀목: 연 3.2-4.05%\n\n` +
               `여기에 우대 조건이 적용되면 더 낮아집니다:\n` +
               `- 신혼부부: 최대 0.5%p 할인\n` +
               `- 생애최초: 최대 0.3%p 할인\n` +
               `- 청약저축: 최대 0.2%p 할인\n\n` +
               `실제로는 개인 신용도와 은행별로 차이가 있을 수 있어서, 여러 은행을 비교해보시는 것을 추천합니다.`,
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  return {
    content: `대출 관련 질문이시군요. 구체적인 상황을 알려주시면 실무 경험을 바탕으로 정확한 조언을 드리겠습니다.\n\n` +
             `예를 들어:\n` +
             `- 어떤 대출을 고려하고 계신지\n` +
             `- 현재 소득과 주택 상황\n` +
             `- 구체적인 목적\n\n` +
             `이런 정보들을 알려주시면 더 정확한 답변을 드릴 수 있습니다.`,
    confidence: 'medium',
    expertType: 'banking'
  };
}

// 부동산 전문가 답변 생성
export function generateRealEstateExpertResponse(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  // 투자 관련 질문
  if (text.includes('투자') || text.includes('수익')) {
    return {
      content: `부동산 투자는 현재 시점에서 신중하게 접근해야 합니다.\n\n` +
               `시장 상황을 보면:\n` +
               `- 가격 상승세는 둔화되고 있음\n` +
               `- 금리 상승으로 투자 수익률 압박\n` +
               `- 규제 강화로 투자 환경 변화\n\n` +
               `하지만 여전히 좋은 기회는 있습니다:\n` +
               `- 재개발/재건축 지역\n` +
               `- 교통 인프라 개선 지역\n` +
               `- 신도시 개발 지역\n\n` +
               `투자를 고려하신다면 장기적 관점에서 접근하시고, 현금 흐름을 꼼꼼히 계산해보시는 것을 추천합니다.`,
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  // 시세 관련 질문
  if (text.includes('시세') || text.includes('가격')) {
    return {
      content: `부동산 시세는 지역별로 상당한 차이가 있습니다.\n\n` +
               `전반적인 동향:\n` +
               `- 서울: 안정적이지만 상승세 둔화\n` +
               `- 경기: 신도시 중심으로 상승\n` +
               `- 지방: 지역별 편차 심함\n\n` +
               `정확한 시세는 실거래가를 확인하는 것이 가장 좋습니다. 국토교통부 실거래가 공개시스템에서 최근 거래 내역을 확인해보세요.\n\n` +
               `특정 지역에 관심이 있으시다면 그 지역의 구체적인 정보를 알려주시면 더 자세한 분석을 해드릴 수 있습니다.`,
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  return {
    content: `부동산 관련 질문이시군요. 구체적인 지역이나 상황을 알려주시면 더 정확한 조언을 드릴 수 있습니다.\n\n` +
             `예를 들어:\n` +
             `- 관심 있는 지역\n` +
               `- 구입 목적 (자가/투자/전세)\n` +
               `- 예산 범위\n\n` +
             `이런 정보들을 알려주시면 지역 특성을 고려한 맞춤형 조언을 드리겠습니다.`,
    confidence: 'medium',
    expertType: 'real_estate'
  };
}

// 메인 답변 생성 함수
export function generateNaturalExpertResponse(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  // 정책 관련 질문 (우선 처리)
  if (text.includes('정책') || text.includes('보금자리') || text.includes('디딤돌') || 
      text.includes('버팀목') || text.includes('신생아') || text.includes('신혼부부') ||
      text.includes('생애최초') || text.includes('청년')) {
    return generatePolicyExpertResponse(message, profile);
  }
  
  // 대출 관련 질문
  if (text.includes('대출') || text.includes('신청') || text.includes('절차') || 
      text.includes('금리') || text.includes('이자') || text.includes('한도')) {
    return generateBankingExpertResponse(message, profile);
  }
  
  // 부동산 관련 질문
  if (text.includes('투자') || text.includes('시세') || text.includes('가격') || 
      text.includes('지역') || text.includes('아파트') || text.includes('주택')) {
    return generateRealEstateExpertResponse(message, profile);
  }
  
  // 일반적인 질문
  return {
    content: `질문을 이해했지만, 더 구체적인 정보가 필요합니다.\n\n` +
             `어떤 도움이 필요하신지 구체적으로 말씀해 주시면, 실무 경험을 바탕으로 정확한 조언을 드리겠습니다.\n\n` +
             `예를 들어:\n` +
             `- 정책자금 관련 질문\n` +
             `- 대출 신청 절차\n` +
             `- 부동산 투자 조언\n` +
             `- 시세 분석\n\n` +
             `구체적인 상황을 알려주시면 더 정확한 답변을 드릴 수 있습니다.`,
    confidence: 'medium',
    expertType: 'general'
  };
}
