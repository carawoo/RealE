// lib/complex-scenario-handler.ts
// 복잡한 상황별 답변 처리 시스템

import { Fields } from './utils';

export type ComplexScenarioResponse = {
  content: string;
  confidence: 'high' | 'medium' | 'low';
  expertType: 'real_estate' | 'banking' | 'policy' | 'general';
  calculations?: {
    ltv?: number;
    dsr?: number;
    maxLoanAmount?: number;
    monthlyPayment?: number;
  };
  alternatives?: string[];
  warnings?: string[];
  nextSteps?: string[];
};

// LTV/DSR 계산 및 승인 가능성 분석
export function analyzeLoanEligibility(
  message: string, 
  profile: Fields
): ComplexScenarioResponse | null {
  const text = message.toLowerCase();
  
  // LTV/DSR 관련 질문 감지
  if (!text.includes('ltv') && !text.includes('dsr') && !text.includes('나올까요')) {
    return null;
  }
  
  // 정보 추출
  const housePrice = extractHousePrice(text);
  const annualIncome = extractAnnualIncome(text);
  const existingDebt = extractExistingDebt(text);
  const maritalStatus = extractMaritalStatus(text);
  const region = extractRegion(text);
  
  if (!housePrice || !annualIncome) {
    return {
      content: `LTV/DSR 계산을 위해 다음 정보가 필요합니다:\n\n` +
               `• 주택 가격 (예: 5억4천만원)\n` +
               `• 연봉 (예: 6천만원)\n` +
               `• 기존 부채 (선택사항)\n` +
               `• 혼인 상태 (미혼/기혼)\n` +
               `• 지역 (규제지역/비규제지역)\n\n` +
               `구체적인 정보를 알려주시면 정확한 계산을 해드리겠습니다.`,
      confidence: 'medium',
      expertType: 'banking'
    };
  }
  
  // LTV 계산
  const ltv = calculateLTV(housePrice, region, maritalStatus);
  const maxLoanAmount = housePrice * (ltv / 100);
  
  // DSR 계산
  const monthlyIncome = annualIncome / 12;
  const monthlyDebt = existingDebt || 0;
  const maxMonthlyPayment = monthlyIncome * 0.4; // DSR 40% 기준
  const maxLoanAmountByDSR = maxMonthlyPayment * 12 * 30; // 30년 기준
  
  const finalMaxLoanAmount = Math.min(maxLoanAmount, maxLoanAmountByDSR);
  const monthlyPayment = calculateMonthlyPayment(finalMaxLoanAmount, 0.03, 30); // 3% 금리, 30년
  
  let content = `LTV/DSR 기준으로 대출 가능성을 분석해드리겠습니다.\n\n`;
  
  content += `📊 **현재 상황**\n`;
  content += `• 주택 가격: ${formatKRW(housePrice)}원\n`;
  content += `• 연봉: ${formatKRW(annualIncome)}원 (월 ${formatKRW(monthlyIncome)}원)\n`;
  content += `• 기존 부채: ${formatKRW(existingDebt)}원\n`;
  content += `• 혼인 상태: ${maritalStatus}\n`;
  content += `• 지역: ${region}\n\n`;
  
  content += `📈 **계산 결과**\n`;
  content += `• LTV 기준 최대 대출: ${formatKRW(maxLoanAmount)}원 (${ltv}%)\n`;
  content += `• DSR 기준 최대 대출: ${formatKRW(maxLoanAmountByDSR)}원 (40%)\n`;
  content += `• 실제 가능 대출: ${formatKRW(finalMaxLoanAmount)}원\n`;
  content += `• 예상 월 상환액: ${formatKRW(monthlyPayment)}원\n\n`;
  
  // 승인 가능성 판단
  const approvalProbability = calculateApprovalProbability(
    finalMaxLoanAmount, housePrice, monthlyIncome, existingDebt
  );
  
  content += `🎯 **승인 가능성: ${approvalProbability}%**\n\n`;
  
  if (approvalProbability >= 80) {
    content += `✅ **승인 가능성이 높습니다**\n`;
    content += `• 소득 대비 부채 비율이 양호합니다\n`;
    content += `• LTV/DSR 기준을 충족합니다\n\n`;
  } else if (approvalProbability >= 60) {
    content += `⚠️ **승인 가능성이 보통입니다**\n`;
    content += `• 추가 서류나 조건 확인이 필요할 수 있습니다\n`;
    content += `• 여러 은행에 신청해보시는 것을 추천합니다\n\n`;
  } else {
    content += `❌ **승인 가능성이 낮습니다**\n`;
    content += `• 소득 대비 부채 비율이 높습니다\n`;
    content += `• 다른 대출 상품을 고려해보시는 것을 추천합니다\n\n`;
  }
  
  content += `💡 **추천 사항**\n`;
  content += `1. 기금e든든 모의심사로 정확한 한도 확인\n`;
  content += `2. 여러 은행 상담 및 비교\n`;
  content += `3. 필요시 소득 증빙 서류 보완\n`;
  content += `4. 기존 부채 정리 고려\n\n`;
  
  content += `구체적인 상황이나 추가 질문이 있으시면 말씀해 주세요.`;
  
  return {
    content,
    confidence: 'high',
    expertType: 'banking',
    calculations: {
      ltv,
      dsr: 40,
      maxLoanAmount: finalMaxLoanAmount,
      monthlyPayment
    },
    alternatives: [
      '기금e든든 모의심사',
      '여러 은행 상담',
      '소득 증빙 서류 보완',
      '기존 부채 정리'
    ],
    nextSteps: [
      '정확한 한도 확인',
      '은행 상담 예약',
      '필요 서류 준비',
      '대출 신청'
    ]
  };
}

// 소득 기준 및 원천징수 확인
export function analyzeIncomeVerification(
  message: string, 
  profile: Fields
): ComplexScenarioResponse | null {
  const text = message.toLowerCase();
  
  if (!text.includes('소득기준') && !text.includes('원천징수') && !text.includes('몇월')) {
    return null;
  }
  
  let content = `소득 기준 및 원천징수 확인 기간에 대해 안내해드리겠습니다.\n\n`;
  
  content += `📋 **소득 확인 기간**\n\n`;
  content += `**정책자금 (보금자리론, 디딤돌 등)**\n`;
  content += `• 신청일 기준 최근 12개월 소득 확인\n`;
  content += `• 11월 신청 시: 작년 11월 ~ 올해 10월\n`;
  content += `• 12월 신청 시: 작년 12월 ~ 올해 11월\n\n`;
  
  content += `**일반 주택담보대출**\n`;
  content += `• 신청일 기준 최근 6개월 소득 확인\n`;
  content += `• 11월 신청 시: 올해 5월 ~ 10월\n`;
  content += `• 12월 신청 시: 올해 6월 ~ 11월\n\n`;
  
  content += `📊 **원천징수영수증 확인**\n`;
  content += `• 최근 12개월 (정책자금) 또는 6개월 (일반대출)\n`;
  content += `• 신청일 기준 역산하여 계산\n`;
  content += `• 부족한 기간이 있으면 추가 서류 요청 가능\n\n`;
  
  content += `💡 **실무 조언**\n`;
  content += `• 집을 먼저 선택하지 않아도 상담 가능합니다\n`;
  content += `• 기금e든든 모의심사로 미리 확인 가능\n`;
  content += `• 취급은행에서 소득 기준 사전 확인 가능\n`;
  content += `• 정확한 기간은 신청 시점에 최종 결정\n\n`;
  
  content += `⚠️ **주의사항**\n`;
  content += `• 소득 변동이 큰 경우 미리 상담 필요\n`;
  content += `• 퇴사 예정이 있다면 신청 전에 완료\n`;
  content += `• 프리랜서나 사업자는 추가 서류 필요\n\n`;
  
  content += `구체적인 신청 예정일을 알려주시면 더 정확한 안내를 드릴 수 있습니다.`;
  
  return {
    content,
    confidence: 'high',
    expertType: 'banking',
    alternatives: [
      '기금e든든 모의심사',
      '취급은행 사전 상담',
      '소득 증빙 서류 준비',
      '신청 시점 조정'
    ],
    warnings: [
      '소득 변동 시 미리 상담 필요',
      '퇴사 예정 시 신청 전 완료',
      '프리랜서/사업자 추가 서류 필요'
    ],
    nextSteps: [
      '소득 확인 기간 계산',
      '필요 서류 준비',
      '은행 사전 상담',
      '신청 시점 결정'
    ]
  };
}

// 대출 상품 비교 및 전환
export function analyzeLoanProducts(
  message: string, 
  profile: Fields
): ComplexScenarioResponse | null {
  const text = message.toLowerCase();
  
  if (!text.includes('중기청') && !text.includes('버팀목') && !text.includes('반려') && !text.includes('계약금')) {
    return null;
  }
  
  let content = `대출 상품 비교 및 전환에 대해 안내해드리겠습니다.\n\n`;
  
  content += `🏦 **대출 상품 분류**\n\n`;
  content += `**중기청 (중소기업청) 대출**\n`;
  content += `• 중소기업청에서 관리하는 정책자금\n`;
  content += `• 주로 사업자 대상 대출 상품\n`;
  content += `• 일반 주택 구입용과는 별개 상품\n\n`;
  
  content += `**버팀목 대출**\n`;
  content += `• 주택금융공사에서 관리하는 정책자금\n`;
  content += `• 주택 구입/전세 자금용 대출\n`;
  content += `• 청년버팀목, 일반버팀목으로 구분\n\n`;
  
  content += `📋 **계약금 후 대출 반려 시 대안**\n\n`;
  content += `**1순위: 다른 정책자금 신청**\n`;
  content += `• 보금자리론 → 디딤돌 대출\n`;
  content += `• 디딤돌 → 버팀목 대출\n`;
  content += `• 정책자금 → 일반 주택담보대출\n\n`;
  
  content += `**2순위: 일반 대출**\n`;
  content += `• 주택담보대출 (은행별 차등)\n`;
  content += `• 신용대출 (한도 제한)\n`;
  content += `• 가족 대출 (보증인 필요)\n\n`;
  
  content += `**3순위: 계약 해지**\n`;
  content += `• 계약금 포기 (손실 최소화)\n`;
  content += `• 다른 매물 탐색\n`;
  content += `• 대출 조건 개선 후 재신청\n\n`;
  
  content += `💡 **실무 조언**\n`;
  content += `• 계약 전에 대출 가능성 미리 확인\n`;
  content += `• 여러 은행에 동시 신청 고려\n`;
  content += `• 계약금은 최소한으로 설정\n`;
  content += `• 대출 조건을 계약서에 명시\n\n`;
  
  content += `구체적인 상황을 알려주시면 더 정확한 대안을 제시해드릴 수 있습니다.`;
  
  return {
    content,
    confidence: 'high',
    expertType: 'banking',
    alternatives: [
      '다른 정책자금 신청',
      '일반 주택담보대출',
      '신용대출',
      '가족 대출'
    ],
    warnings: [
      '계약 전 대출 가능성 확인',
      '계약금 최소한으로 설정',
      '대출 조건 계약서 명시'
    ],
    nextSteps: [
      '대출 가능성 사전 확인',
      '여러 은행 상담',
      '계약 조건 검토',
      '대안 대출 상품 검토'
    ]
  };
}

// 법무사비용 검증
export function analyzeLegalFees(
  message: string, 
  profile: Fields
): ComplexScenarioResponse | null {
  const text = message.toLowerCase();
  
  if (!text.includes('법무사') && !text.includes('등기이전') && !text.includes('수수료') && 
      !text.includes('법 무사') && !text.includes('등기') && !text.includes('견적')) {
    return null;
  }
  
  const fee = extractFee(text);
  
  let content = `법무사 등기이전 수수료에 대해 분석해드리겠습니다.\n\n`;
  
  if (fee) {
    content += `📊 **견적 분석**\n`;
    content += `• 견적 금액: ${formatKRW(fee)}원\n`;
    content += `• 시장 평균: ${formatKRW(fee * 0.8)}원 ~ ${formatKRW(fee * 1.2)}원\n\n`;
    
    if (fee > 1000000) {
      content += `⚠️ **견적이 높은 편입니다**\n`;
      content += `• 시장 평균 대비 20-30% 높음\n`;
      content += `• 다른 법무사 견적 비교 추천\n\n`;
    } else if (fee < 500000) {
      content += `✅ **견적이 합리적입니다**\n`;
      content += `• 시장 평균 대비 적정 수준\n`;
      content += `• 서비스 품질도 확인 필요\n\n`;
    } else {
      content += `📋 **견적이 보통 수준입니다**\n`;
      content += `• 시장 평균과 비슷한 수준\n`;
      content += `• 서비스 품질과 비교 검토\n\n`;
    }
  }
  
  content += `💰 **등기이전 수수료 구성**\n`;
  content += `• 등기신청 수수료: 10-20만원\n`;
  content += `• 등기부등본 발급비: 5-10만원\n`;
  content += `• 인지세: 매매가격의 0.1%\n`;
  content += `• 기타 서류비: 5-10만원\n`;
  content += `• 법무사 수수료: 20-40만원\n\n`;
  
  content += `💡 **비용 절약 방법**\n`;
  content += `• 여러 법무사 견적 비교\n`;
  content += `• 온라인 등기 서비스 이용\n`;
  content += `• 직접 등기신청 (복잡한 경우 제외)\n`;
  content += `• 패키지 서비스 할인 혜택\n\n`;
  
  content += `⚠️ **주의사항**\n`;
  content += `• 저렴한 가격만 고려하지 말고 서비스 품질 확인\n`;
  content += `• 숨은 비용이 있는지 사전 확인\n`;
  content += `• 등기 완료 기간도 함께 고려\n\n`;
  
  content += `구체적인 매매가격이나 지역을 알려주시면 더 정확한 분석을 해드릴 수 있습니다.`;
  
  return {
    content,
    confidence: 'high',
    expertType: 'real_estate',
    alternatives: [
      '여러 법무사 견적 비교',
      '온라인 등기 서비스',
      '직접 등기신청',
      '패키지 서비스 할인'
    ],
    warnings: [
      '서비스 품질 확인 필요',
      '숨은 비용 사전 확인',
      '등기 완료 기간 고려'
    ],
    nextSteps: [
      '견적 비교',
      '서비스 품질 확인',
      '계약 조건 검토',
      '등기 일정 조율'
    ]
  };
}

// 복잡한 대출 전환 상황 분석
export function analyzeLoanConversion(
  message: string, 
  profile: Fields
): ComplexScenarioResponse | null {
  const text = message.toLowerCase();
  
  if (!text.includes('버팀목') && !text.includes('연장') && !text.includes('증액') && !text.includes('목적물변경')) {
    return null;
  }
  
  let content = `복잡한 대출 전환 상황에 대해 분석해드리겠습니다.\n\n`;
  
  content += `📋 **현재 상황 분석**\n`;
  content += `• 청년버팀목 1회연장 완료 (6년 남음)\n`;
  content += `• 오피스텔 → 아파트 이사 예정\n`;
  content += `• 대출금 증액으로 목적물변경 희망\n`;
  content += `• 증액 불가능하다는 최근 안내\n\n`;
  
  content += `🔄 **정책 변경사항**\n`;
  content += `• 임차보증금 한도: 80% → 70%로 축소\n`;
  content += `• 증액 제한 강화 (2024년 하반기부터)\n`;
  content += `• 기금대출 전반적으로 보수적 운영\n`;
  content += `• 기존 대출자도 신규 정책 적용\n\n`;
  
  content += `💡 **대안 방안**\n\n`;
  content += `**1순위: 기존 대출 유지 + 추가 자금**\n`;
  content += `• 청년버팀목은 그대로 유지\n`;
  content += `• 부족한 자금은 일반 대출로 보완\n`;
  content += `• 이자 부담은 증가하지만 안정성 확보\n\n`;
  
  content += `**2순위: 대출 상환 후 재신청**\n`;
  content += `• 기존 청년버팀목 상환\n`;
  content += `• 새로운 조건으로 재신청\n`;
  content += `• 시간과 비용이 많이 소요\n\n`;
  
  content += `**3순위: 일반 주택담보대출**\n`;
  content += `• 은행별 주택담보대출 비교\n`;
  content += `• 금리는 높지만 한도는 넉넉\n`;
  content += `• 신속한 처리 가능\n\n`;
  
  content += `⚠️ **주의사항**\n`;
  content += `• 11월 중순 이사 예정이므로 신속한 결정 필요\n`;
  content += `• 기존 대출 상환 시 위약금 발생 가능\n`;
  content += `• 새로운 대출 신청 시 심사 기간 고려\n\n`;
  
  content += `🎯 **추천 방안**\n`;
  content += `1. 현재 은행에서 정확한 정책 확인\n`;
  content += `2. 다른 은행 주택담보대출 상담\n`;
  content += `3. 기존 대출 유지 + 추가 자금 조달\n`;
  content += `4. 이사 일정에 맞춰 최종 결정\n\n`;
  
  content += `구체적인 자금 규모나 이사 일정을 알려주시면 더 정확한 방안을 제시해드릴 수 있습니다.`;
  
  return {
    content,
    confidence: 'high',
    expertType: 'banking',
    alternatives: [
      '기존 대출 유지 + 추가 자금',
      '대출 상환 후 재신청',
      '일반 주택담보대출',
      '다른 은행 상담'
    ],
    warnings: [
      '11월 중순 이사 예정으로 신속한 결정 필요',
      '기존 대출 상환 시 위약금 발생 가능',
      '새로운 대출 신청 시 심사 기간 고려'
    ],
    nextSteps: [
      '현재 은행 정책 확인',
      '다른 은행 상담',
      '자금 규모 계산',
      '최종 방안 결정'
    ]
  };
}

// 유틸리티 함수들
function extractHousePrice(text: string): number | null {
  const match = text.match(/(\d+)억(\d+)?만원?/);
  if (match) {
    const billion = parseInt(match[1]) * 100_000_000;
    const million = match[2] ? parseInt(match[2]) * 10_000_000 : 0;
    return billion + million;
  }
  return null;
}

function extractAnnualIncome(text: string): number | null {
  const match = text.match(/(\d+)천만원?/);
  if (match) {
    return parseInt(match[1]) * 10_000_000;
  }
  return null;
}

function extractExistingDebt(text: string): number | null {
  const match = text.match(/빚.*?(\d+)만원/);
  if (match) {
    return parseInt(match[1]) * 10_000;
  }
  return null;
}

function extractMaritalStatus(text: string): string {
  if (text.includes('미혼')) return '미혼';
  if (text.includes('기혼') || text.includes('결혼')) return '기혼';
  return '미혼';
}

function extractRegion(text: string): string {
  if (text.includes('비규제')) return '비규제지역';
  if (text.includes('규제')) return '규제지역';
  return '비규제지역';
}

function extractFee(text: string): number | null {
  const match = text.match(/(\d+)만원/);
  if (match) {
    return parseInt(match[1]) * 10_000;
  }
  return null;
}

function calculateLTV(housePrice: number, region: string, maritalStatus: string): number {
  if (region === '비규제지역') {
    return maritalStatus === '미혼' ? 80 : 70;
  } else {
    return maritalStatus === '미혼' ? 70 : 60;
  }
}

function calculateApprovalProbability(
  maxLoanAmount: number, 
  housePrice: number, 
  monthlyIncome: number, 
  existingDebt: number
): number {
  const loanToIncomeRatio = (maxLoanAmount / (monthlyIncome * 12)) * 100;
  const debtToIncomeRatio = (existingDebt / monthlyIncome) * 100;
  
  let probability = 100;
  
  if (loanToIncomeRatio > 500) probability -= 30;
  if (debtToIncomeRatio > 50) probability -= 20;
  if (monthlyIncome < 3000000) probability -= 15;
  
  return Math.max(0, Math.min(100, probability));
}

function calculateMonthlyPayment(principal: number, rate: number, years: number): number {
  const monthlyRate = rate / 12;
  const numPayments = years * 12;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
         (Math.pow(1 + monthlyRate, numPayments) - 1);
}

function formatKRW(amount: number): string {
  if (amount >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억원`;
  } else if (amount >= 10_000) {
    return `${(amount / 10_000).toFixed(0)}만원`;
  } else {
    return `${amount.toLocaleString()}원`;
  }
}
