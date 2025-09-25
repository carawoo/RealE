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

// 실무적 질문 답변 생성
export function generatePracticalExpertResponse(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  // 법무사비용 관련 질문
  if (text.includes('법무사') && (text.includes('비용') || text.includes('보수') || text.includes('수수료'))) {
    // 매매가격에서 법무사비용 추출 (개선된 버전)
    let price = 0;
    
    // 3억2500만원 같은 경우 먼저 처리
    const complexMatch = text.match(/(\d+)억(\d+)만원/);
    if (complexMatch) {
      const billion = parseInt(complexMatch[1]) * 100_000_000;
      const million = parseInt(complexMatch[2]) * 10_000;
      price = billion + million;
    } else {
      // 일반적인 경우 처리
      const priceMatch = text.match(/(\d+)억(\d+)?만원?/);
      if (priceMatch) {
        const billion = parseInt(priceMatch[1]) * 100_000_000;
        const million = priceMatch[2] ? parseInt(priceMatch[2]) * 10_000_000 : 0;
        price = billion + million;
      }
    }
    
    // 평수 추출
    const pyeongMatch = text.match(/(\d+)평/);
    const pyeong = pyeongMatch ? parseInt(pyeongMatch[1]) : 0;
    
    let content = `법무사비용은 매매가격과 평수에 따라 달라집니다.\n\n`;
    
    if (price > 0) {
      // 법무사비용 계산 (매매가격의 0.1-0.2% 정도)
      const minCost = Math.round(price * 0.001);
      const maxCost = Math.round(price * 0.002);
      
      content += `매매가격 ${(price / 100_000_000).toFixed(1)}억원 기준으로는:\n`;
      content += `• 법무사비용: 약 ${(minCost / 10000).toFixed(0)}만원 ~ ${(maxCost / 10000).toFixed(0)}만원\n`;
      content += `• 평균적으로 ${((minCost + maxCost) / 2 / 10000).toFixed(0)}만원 정도 예상하시면 됩니다\n\n`;
    }
    
    if (pyeong > 0) {
      content += `${pyeong}평 기준으로는:\n`;
      content += `• 평수당 약 3-5만원 정도\n`;
      content += `• 총 ${(pyeong * 4).toFixed(0)}만원 ~ ${(pyeong * 5).toFixed(0)}만원 예상\n\n`;
    }
    
    content += `법무사비용은 다음과 같이 구성됩니다:\n`;
    content += `• 등기신청 수수료\n`;
    content += `• 등기부등본 발급비\n`;
    content += `• 인지세 (매매가격의 0.1%)\n`;
    content += `• 기타 서류비\n\n`;
    content += `실제 비용은 법무사마다 다를 수 있으니 미리 상담받아보시는 것을 추천합니다.`;
    
    return {
      content,
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  // 중개수수료 관련 질문
  if (text.includes('중개수수료') || text.includes('중개비') || (text.includes('중개') && text.includes('비용'))) {
    const priceMatch = text.match(/(\d+)억(\d+)?만원?/);
    let price = 0;
    if (priceMatch) {
      const billion = parseInt(priceMatch[1]) * 100_000_000;
      const million = priceMatch[2] ? parseInt(priceMatch[2]) * 10_000_000 : 0;
      price = billion + million;
    }
    
    let content = `중개수수료는 매매가격에 따라 달라집니다.\n\n`;
    
    if (price > 0) {
      // 중개수수료 계산 (가격대별 차등)
      let rate = 0;
      if (price <= 100_000_000) {
        rate = 0.009; // 1억원 이하: 0.9%
      } else if (price <= 600_000_000) {
        rate = 0.007; // 1억원 초과 6억원 이하: 0.7%
      } else {
        rate = 0.004; // 6억원 초과: 0.4%
      }
      
      const cost = Math.round(price * rate);
      
      content += `매매가격 ${(price / 100_000_000).toFixed(1)}억원 기준으로는:\n`;
      content += `• 중개수수료: 약 ${(cost / 10000).toFixed(0)}만원 (${(rate * 100).toFixed(1)}%)\n\n`;
    }
    
    content += `중개수수료는 다음과 같이 계산됩니다:\n`;
    content += `• 1억원 이하: 0.9%\n`;
    content += `• 1억원 초과 6억원 이하: 0.7%\n`;
    content += `• 6억원 초과: 0.4%\n\n`;
    content += `실제로는 중개업소마다 다를 수 있으니 미리 확인해보시는 것을 추천합니다.`;
    
    return {
      content,
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  // 취득세 관련 질문
  if (text.includes('취득세') || (text.includes('세금') && text.includes('매매'))) {
    const priceMatch = text.match(/(\d+)억(\d+)?만원?/);
    let price = 0;
    if (priceMatch) {
      const billion = parseInt(priceMatch[1]) * 100_000_000;
      const million = priceMatch[2] ? parseInt(priceMatch[2]) * 10_000_000 : 0;
      price = billion + million;
    }
    
    let content = `취득세는 매매가격과 주택 유형에 따라 달라집니다.\n\n`;
    
    if (price > 0) {
      // 취득세 계산 (가격대별 차등)
      let rate = 0;
      if (price <= 100_000_000) {
        rate = 0.01; // 1억원 이하: 1%
      } else if (price <= 300_000_000) {
        rate = 0.02; // 1억원 초과 3억원 이하: 2%
      } else if (price <= 600_000_000) {
        rate = 0.03; // 3억원 초과 6억원 이하: 3%
      } else {
        rate = 0.04; // 6억원 초과: 4%
      }
      
      const tax = Math.round(price * rate);
      
      content += `매매가격 ${(price / 100_000_000).toFixed(1)}억원 기준으로는:\n`;
      content += `• 취득세: 약 ${(tax / 10000).toFixed(0)}만원 (${(rate * 100).toFixed(0)}%)\n\n`;
    }
    
    content += `취득세는 다음과 같이 계산됩니다:\n`;
    content += `• 1억원 이하: 1%\n`;
    content += `• 1억원 초과 3억원 이하: 2%\n`;
    content += `• 3억원 초과 6억원 이하: 3%\n`;
    content += `• 6억원 초과: 4%\n\n`;
    content += `생애최초 주택 구입 시에는 감면 혜택이 있을 수 있으니 확인해보시는 것을 추천합니다.`;
    
    return {
      content,
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  // 매매 관련 총 비용 질문
  if (text.includes('매매') && (text.includes('비용') || text.includes('총비용') || text.includes('얼마나'))) {
    const priceMatch = text.match(/(\d+)억(\d+)?만원?/);
    let price = 0;
    if (priceMatch) {
      const billion = parseInt(priceMatch[1]) * 100_000_000;
      const million = priceMatch[2] ? parseInt(priceMatch[2]) * 10_000_000 : 0;
      price = billion + million;
    }
    
    if (price > 0) {
      // 각종 비용 계산
      const brokerage = Math.round(price * 0.006); // 중개수수료 0.6%
      const acquisition = Math.round(price * 0.025); // 취득세 2.5%
      const legal = Math.round(price * 0.0015); // 법무사비용 0.15%
      const total = brokerage + acquisition + legal;
      
      let content = `매매가격 ${(price / 100_000_000).toFixed(1)}억원 기준 총 비용은 다음과 같습니다:\n\n`;
      content += `• 중개수수료: 약 ${(brokerage / 10000).toFixed(0)}만원\n`;
      content += `• 취득세: 약 ${(acquisition / 10000).toFixed(0)}만원\n`;
      content += `• 법무사비용: 약 ${(legal / 10000).toFixed(0)}만원\n`;
      content += `• 기타 비용: 약 50-100만원\n\n`;
      content += `총 예상 비용: 약 ${(total / 10000).toFixed(0)}만원 ~ ${((total + 1000000) / 10000).toFixed(0)}만원\n\n`;
      content += `실제로는 주택 유형과 지역에 따라 다를 수 있으니 미리 계산해보시는 것을 추천합니다.`;
      
      return {
        content,
        confidence: 'high',
        expertType: 'real_estate'
      };
    }
  }
  
  // 평수 관련 질문
  if (text.includes('평수') || text.includes('평') || text.includes('전용')) {
    const pyeongMatch = text.match(/(\d+)평/);
    const pyeong = pyeongMatch ? parseInt(pyeongMatch[1]) : 0;
    
    if (pyeong > 0) {
      let content = `${pyeong}평 주택에 대한 정보입니다:\n\n`;
      content += `• 전용면적: 약 ${pyeong}평 (${(pyeong * 3.3).toFixed(1)}㎡)\n`;
      content += `• 공급면적: 약 ${(pyeong * 1.2).toFixed(0)}평 (공용면적 포함)\n`;
      content += `• 적정 가격대: ${(pyeong * 0.3).toFixed(1)}억원 ~ ${(pyeong * 0.6).toFixed(1)}억원 (지역별 차이)\n\n`;
      content += `평수별 특징:\n`;
      if (pyeong >= 80) {
        content += `• 80평 이상: 넓은 거실과 침실, 가족용 주택\n`;
      } else if (pyeong >= 60) {
        content += `• 60-80평: 적당한 크기의 가족용 주택\n`;
      } else if (pyeong >= 40) {
        content += `• 40-60평: 신혼부부나 소가족용 주택\n`;
      } else {
        content += `• 40평 미만: 1-2인 가구용 주택\n`;
      }
      
      return {
        content,
        confidence: 'high',
        expertType: 'real_estate'
      };
    }
  }
  
  return {
    content: `실무적 질문이시군요. 구체적인 상황을 알려주시면 더 정확한 답변을 드릴 수 있습니다.`,
    confidence: 'medium',
    expertType: 'real_estate'
  };
}

// 메인 답변 생성 함수
export function generateNaturalExpertResponse(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  // 실무적 질문 (우선 처리) - 더 넓은 범위로 확장
  if (text.includes('법무사') || text.includes('중개수수료') || text.includes('취득세') || 
      text.includes('세금') || text.includes('비용') || text.includes('보수') ||
      text.includes('매매') || text.includes('평수') || text.includes('평') || 
      text.includes('전용') || text.includes('얼마나') || text.includes('총비용')) {
    return generatePracticalExpertResponse(message, profile);
  }
  
  // 정책 관련 질문
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
