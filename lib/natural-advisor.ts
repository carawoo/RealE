// lib/natural-advisor.ts
// 자연스럽고 실용적인 전문가 조언 시스템

import { Fields } from './utils';

export type NaturalResponse = {
  content: string;
  confidence: 'high' | 'medium' | 'low';
  expertType: 'real_estate' | 'banking' | 'policy' | 'general';
};

// 자연스러운 전문가 조언 생성
export function generateNaturalAdvisorResponse(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  // 1. 전세 만료 및 대출 연장 관련
  if (text.includes('전세') && (text.includes('만료') || text.includes('연장'))) {
    return handleJeonseExpiration(message, profile);
  }
  
  // 2. 결혼 및 주택 구입 관련
  if (text.includes('결혼') && (text.includes('매매') || text.includes('아파트') || text.includes('구입'))) {
    return handleMarriageHousePurchase(message, profile);
  }
  
  // 3. 대출 규제 및 계약 관련
  if (text.includes('대출규제') || text.includes('계약') || text.includes('신청')) {
    return handleLoanRegulation(message, profile);
  }
  
  // 4. 소득 및 대출 한도 관련
  if (text.includes('연봉') || text.includes('한도') || text.includes('dti') || text.includes('dsr')) {
    return handleIncomeLoanLimit(message, profile);
  }
  
  // 5. 정책자금 관련 (보금자리론, 디딤돌 등)
  if (text.includes('보금자리') || text.includes('디딤돌') || text.includes('버팀목') || text.includes('신생아')) {
    return handlePolicyLoans(message, profile);
  }
  
  // 6. 전세 vs 월세 비교
  if (text.includes('전세') && text.includes('월세')) {
    return handleJeonseVsMonthly(message, profile);
  }
  
  // 7. 부동산 투자 조언
  if (text.includes('투자') || text.includes('시세') || text.includes('수익률')) {
    return handleRealEstateInvestment(message, profile);
  }
  
  // 8. 일반적인 부동산 조언
  if (text.includes('아파트') || text.includes('주택') || text.includes('매매')) {
    return handleGeneralRealEstate(message, profile);
  }
  
  // 9. 기본 응답
  return {
    content: "구체적인 상황을 알려주시면 더 정확한 조언을 드릴 수 있어요!",
    confidence: 'medium',
    expertType: 'general'
  };
}

// 전세 만료 및 대출 연장 처리
function handleJeonseExpiration(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  if (text.includes('3개월째') && text.includes('10월까지만')) {
    return {
      content: "3개월째 일하고 계시는 상황에서 10월까지만 하시는 건 전혀 문제없어요. 오히려 안정적인 소득 기간이 있어서 대출 연장에 더 유리할 수 있습니다. 다음주 월요일 신청하시면 충분히 가능하실 거예요!",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  if (text.includes('일을 못할 것 같아서')) {
    return {
      content: "일을 못하시겠다면 무리하지 마시고 10월까지만 하시는 게 맞아요. 대출 연장에는 소득 안정성이 중요하니까, 억지로 계속하시는 것보다는 계획적으로 접근하시는 게 좋습니다.",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  return {
    content: "전세 만료일 11월 17일이면 대출 연장 신청하시기에 충분한 시간이 있어요. 소득 증명만 잘 준비하시면 문제없을 것 같습니다!",
    confidence: 'high',
    expertType: 'banking'
  };
}

// 결혼 및 주택 구입 처리
function handleMarriageHousePurchase(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  if (text.includes('3천') && text.includes('1.5~6') && text.includes('대구')) {
    return {
      content: "전혀 욕심 아닙니다! 대구에서 1.5~6억 아파트는 충분히 현실적인 목표예요. 둘이 합쳐서 3천만원이면 적당한 규모의 아파트 구입 가능합니다. 저평가 급매 아파트 잘 찾으면 더 좋은 조건으로 살 수 있어요!",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('사회초년생') && text.includes('결혼')) {
    return {
      content: "사회초년생이시라면 더욱 현명한 선택이에요! 결혼 전에 주택 구입하시면 신혼부부 혜택도 받을 수 있고, 대출 조건도 더 좋아집니다. 대구는 서울보다 부담이 적어서 좋은 선택이에요!",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('청약이 다떨어져서')) {
    return {
      content: "청약이 다 떨어졌다고 해서 포기할 필요 없어요! 매매로도 충분히 좋은 선택입니다. 오히려 청약보다 더 빠르게 원하는 집을 찾을 수 있어요. 대구는 매매 시장이 활발해서 좋은 기회가 많습니다!",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  return {
    content: "결혼하면서 주택 구입하시는 건 정말 현명한 선택이에요! 신혼부부 혜택도 받을 수 있고, 대출 조건도 좋아집니다. 구체적인 예산이나 지역을 알려주시면 더 정확한 조언을 드릴 수 있어요!",
    confidence: 'high',
    expertType: 'real_estate'
  };
}

// 대출 규제 및 계약 처리
function handleLoanRegulation(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  if (text.includes('대출규제') && text.includes('계약')) {
    return {
      content: "대출규제는 규제한 후부터 적용이라 이미 계약하신 거면 괜찮아보입니다! 6/27때도 그랬구요. 기존 계약은 그대로 유지되니까 걱정하지 마세요.",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  if (text.includes('이미 신청했으면')) {
    return {
      content: "이미 신청했으면 기존대로 갑니다! 신청 시점의 규정이 적용되니까 안심하세요. 규제는 앞으로의 신청에만 적용되는 거예요.",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  return {
    content: "대출 규제는 신규 신청부터 적용되니까 이미 진행 중인 건 괜찮아요! 기존 계약이나 신청은 그대로 유지됩니다.",
    confidence: 'high',
    expertType: 'banking'
  };
}

// 소득 및 대출 한도 처리
function handleIncomeLoanLimit(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  if (text.includes('연봉') && text.includes('빚') && text.includes('적으시고')) {
    return {
      content: "빚도 적으시고 연봉도 낮지 않아서 충분히 가능하실 거 같아요! DSR, DTI 기준도 잘 맞을 것 같습니다.",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  if (text.includes('4.2한도') && text.includes('dti')) {
    return {
      content: "그렇다면 이론상 4.2한도라 가능은 합니다! DTI도 들어올 거고, 소득 대비 부채 비율도 양호해 보여요.",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  if (text.includes('소득') && text.includes('대출')) {
    return {
      content: "소득 대비 대출 한도는 충분히 가능해 보여요! 구체적인 금액을 알려주시면 더 정확한 계산을 해드릴 수 있어요.",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  return {
    content: "소득과 대출 한도는 밀접한 관련이 있어요. 구체적인 수치를 알려주시면 더 정확한 조언을 드릴 수 있습니다!",
    confidence: 'medium',
    expertType: 'banking'
  };
}

// 정책자금 관련 처리
function handlePolicyLoans(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  if (text.includes('보금자리') && text.includes('신혼부부')) {
    return {
      content: "보금자리론 신혼부부 전용은 정말 좋은 상품이에요! 금리도 낮고 한도도 넉넉해서 신혼부부에게는 최고의 선택입니다. 신청하시면 충분히 가능하실 거예요!",
      confidence: 'high',
      expertType: 'policy'
    };
  }
  
  if (text.includes('디딤돌') && text.includes('생애최초')) {
    return {
      content: "디딤돌 생애최초는 정말 좋은 기회예요! 금리도 낮고 조건도 좋아서 놓치면 안 되는 상품입니다. 신청하시면 대부분 승인되니까 걱정하지 마세요!",
      confidence: 'high',
      expertType: 'policy'
    };
  }
  
  if (text.includes('버팀목') && text.includes('청년')) {
    return {
      content: "청년버팀목은 청년들에게는 정말 좋은 상품이에요! 전세자금으로도 사용할 수 있고 금리도 낮아서 많은 청년들이 이용하고 있습니다.",
      confidence: 'high',
      expertType: 'policy'
    };
  }
  
  if (text.includes('신생아') && text.includes('특례')) {
    return {
      content: "신생아특례대출은 정말 좋은 혜택이에요! 출산 후 2년 이내에 신청하시면 되니까 미리 준비해두시는 게 좋습니다.",
      confidence: 'high',
      expertType: 'policy'
    };
  }
  
  return {
    content: "정책자금은 정말 좋은 혜택이에요! 구체적으로 어떤 상품에 관심이 있으신지 알려주시면 더 자세한 조언을 드릴 수 있어요.",
    confidence: 'high',
    expertType: 'policy'
  };
}

// 전세 vs 월세 비교 처리
function handleJeonseVsMonthly(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  if (text.includes('전세') && text.includes('월세') && text.includes('비교')) {
    return {
      content: "전세와 월세는 각각 장단점이 있어요! 전세는 보증금이 많지만 월세 부담이 없고, 월세는 보증금이 적지만 월세 부담이 있습니다. 상황에 맞게 선택하시면 돼요!",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('전세') && text.includes('월세') && text.includes('어떤게')) {
    return {
      content: "전세와 월세 중 어떤 게 나은지는 개인 상황에 따라 달라요! 보유 자금과 월 소득을 고려해서 결정하시는 게 좋습니다.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  return {
    content: "전세와 월세 비교는 정말 중요한 결정이에요! 구체적인 금액을 알려주시면 더 정확한 비교를 해드릴 수 있어요.",
    confidence: 'high',
    expertType: 'real_estate'
  };
}

// 부동산 투자 조언 처리
function handleRealEstateInvestment(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  if (text.includes('투자') && text.includes('아파트')) {
    return {
      content: "아파트 투자는 장기적으로 좋은 선택이에요! 특히 지하철역 근처나 신도시는 성장 가능성이 높아서 투자 가치가 있습니다.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('시세') && text.includes('상승')) {
    return {
      content: "시세 상승은 지역과 시기에 따라 달라요! 하지만 장기적으로는 부동산이 안전한 투자 수단이 될 수 있습니다.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('수익률') && text.includes('투자')) {
    return {
      content: "부동산 투자 수익률은 보통 3-5% 정도예요! 하지만 지역과 시기에 따라 다를 수 있으니까 신중하게 선택하시는 게 좋습니다.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  return {
    content: "부동산 투자는 신중하게 접근하시는 게 좋아요! 구체적인 지역이나 예산을 알려주시면 더 정확한 조언을 드릴 수 있어요.",
    confidence: 'high',
    expertType: 'real_estate'
  };
}

// 일반적인 부동산 조언
function handleGeneralRealEstate(message: string, profile: Fields): NaturalResponse {
  const text = message.toLowerCase();
  
  if (text.includes('아파트') && text.includes('투자')) {
    return {
      content: "아파트 투자는 장기적으로 좋은 선택이에요! 특히 대구는 서울보다 부담이 적으면서도 성장 가능성이 있어서 좋습니다.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('매매') && text.includes('시기')) {
    return {
      content: "매매 시기는 지금도 나쁘지 않아요! 시장이 안정화되고 있어서 신중하게 선택하시면 좋은 집을 찾을 수 있을 거예요.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('아파트') && text.includes('구입')) {
    return {
      content: "아파트 구입은 정말 중요한 결정이에요! 구체적인 예산이나 지역을 알려주시면 더 정확한 조언을 드릴 수 있어요.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  return {
    content: "부동산 관련해서 궁금한 점이 있으시면 언제든 말씀해 주세요! 구체적인 상황을 알려주시면 더 정확한 조언을 드릴 수 있어요.",
    confidence: 'medium',
    expertType: 'real_estate'
  };
}
