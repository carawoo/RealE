// lib/expert-advisor.ts
// 부동산 전문가 + 6년차 은행 과장 관점의 전문 상담 시스템

import { Fields, toComma } from './utils';
import { 
  generateLoanScenarios, 
  convertScenarioToCard, 
  LoanInputs,
  formatKRW,
  parseWon,
  formatPercent,
  POLICY_SUPPORTS
} from './loan-calculator';
import { CURRENT_LOAN_POLICY, getCurrentPolicyDisclaimer } from './policy-data';

export type ExpertResponse = {
  content: string;
  cards?: Array<{
    title: string;
    subtitle?: string;
    monthly?: string;
    totalInterest?: string;
    notes?: string[];
  }> | null;
  checklist?: string[] | null;
  confidence: 'high' | 'medium' | 'low';
  expertType: 'real_estate' | 'banking' | 'policy' | 'general';
};

export type UserContext = {
  experienceLevel: 'beginner' | 'intermediate' | 'experienced';
  urgency: 'immediate' | 'planning' | 'research';
  situation: 'first_home' | 'upgrade' | 'investment' | 'rental' | 'unknown';
  location?: string;
  budget?: number;
  timeline?: string;
};

// 전문가 페르소나 정의
const EXPERT_PERSONAS = {
  real_estate: {
    name: "김부동",
    title: "부동산 전문가",
    experience: "15년 경력",
    expertise: ["시장 분석", "투자 전략", "지역별 특성", "가격 동향"],
    tone: "친근하고 실용적",
    greeting: "안녕하세요! 부동산 전문가 김부동입니다. 🏠"
  },
  banking: {
    name: "이은행",
    title: "은행 과장 (6년차)",
    experience: "6년 경력",
    expertise: ["대출 심사", "금리 전략", "서류 준비", "승인 프로세스"],
    tone: "전문적이고 신뢰할 수 있는",
    greeting: "안녕하세요! 은행 과장 이은행입니다. 🏦"
  },
  policy: {
    name: "박정책",
    title: "정책 전문가",
    experience: "10년 경력",
    expertise: ["정부 정책", "지원 프로그램", "자격 요건", "신청 절차"],
    tone: "정확하고 상세한",
    greeting: "안녕하세요! 정책 전문가 박정책입니다. 📋"
  }
};

// 사용자 맥락 분석 (개선된 버전)
export function analyzeUserContext(message: string, profile: Fields): UserContext {
  const text = message.toLowerCase();
  
  // 경험 수준 분석
  let experienceLevel: UserContext['experienceLevel'] = 'beginner';
  if (/경험|이미|받아본|이전|전에|알고|알고있/.test(text)) {
    experienceLevel = 'experienced';
  } else if (/조금|약간|어느정도|기본/.test(text)) {
    experienceLevel = 'intermediate';
  }
  
  // 긴급성 분석
  let urgency: UserContext['urgency'] = 'research';
  if (/급해|빨리|당장|시급|긴급|이번주|이번달/.test(text)) {
    urgency = 'immediate';
  } else if (/계획|준비|미리|사전|내년|다음달/.test(text)) {
    urgency = 'planning';
  }
  
  // 상황 분석
  let situation: UserContext['situation'] = 'unknown';
  if (/첫|처음|신혼|신혼부부|생애최초/.test(text)) {
    situation = 'first_home';
  } else if (/투자|임대|수익|렌탈/.test(text)) {
    situation = 'investment';
  } else if (/전세|월세|임대차/.test(text)) {
    situation = 'rental';
  } else if (/업그레이드|이사|교체|더큰/.test(text)) {
    situation = 'upgrade';
  }
  
  // 지역 분석
  const locationMatch = text.match(/(서울|부산|대구|인천|광주|대전|울산|경기|강남|강북|송파|마포|서초|분당|성남|하남|용인|수원|고양|의정부)/);
  const location = locationMatch ? locationMatch[1] : undefined;
  
  // 예산 분석
  const budgetMatch = text.match(/(\d+)억|(\d+)천만|(\d+)만/);
  const budget = budgetMatch ? parseWon(budgetMatch[0]) : undefined;
  
  // 타임라인 분석
  let timeline: string | undefined;
  if (/이번주|이번달|빨리|급해/.test(text)) {
    timeline = 'immediate';
  } else if (/내년|다음달|계획/.test(text)) {
    timeline = 'planning';
  }
  
  return {
    experienceLevel,
    urgency,
    situation,
    location,
    budget,
    timeline
  };
}

// 전문가별 응답 생성
export function generateExpertResponse(
  message: string, 
  profile: Fields, 
  context: UserContext
): ExpertResponse {
  const text = message.toLowerCase();
  
  // 1. 대출 시나리오 요청 (은행 과장 전문)
  if (isLoanScenarioRequest(text, profile)) {
    return generateBankingResponse(message, profile, context);
  }
  
  // 2. 정책 상담 요청 (정책 전문가)
  if (isPolicyRequest(text)) {
    return generatePolicyResponse(message, profile, context);
  }
  
  // 3. 부동산 시장/투자 상담 (부동산 전문가)
  if (isRealEstateRequest(text)) {
    return generateRealEstateResponse(message, profile, context);
  }
  
  // 4. 일반 상담 (상황에 따라 전문가 선택)
  return generateGeneralResponse(message, profile, context);
}

// 대출 시나리오 요청 판단 (개선된 버전)
function isLoanScenarioRequest(text: string, profile: Fields): boolean {
  // 숫자 패턴이 있고 소득/매물 정보가 있는 경우
  const hasNumbers = /\d+만원|\d+억|\d+천만원/.test(text);
  const hasIncome = /월소득|소득|월급/.test(text);
  const hasProperty = /집|아파트|매물|매매|구입/.test(text);
  
  if (hasNumbers && hasIncome && hasProperty) return true;
  
  // 명시적 요청
  const explicitRequests = [
    '시나리오', '분석', '계산', '비교', '추천', '한도', '상환', '대출'
  ];
  
  return explicitRequests.some(keyword => text.includes(keyword)) && 
         !!(profile.incomeMonthly || profile.propertyPrice);
}

// 정책 요청 판단
function isPolicyRequest(text: string): boolean {
  const policyKeywords = [
    '보금자리론', '디딤돌', '신생아특례', '다자녀특례', '버팀목',
    '정책', '지원', '혜택', '자격', '조건', '신청', '절차'
  ];
  
  return policyKeywords.some(keyword => text.includes(keyword));
}

// 부동산 요청 판단
function isRealEstateRequest(text: string): boolean {
  const realEstateKeywords = [
    '시세', '가격', '투자', '수익', '임대', '전세', '월세',
    '지역', '동향', '전망', '분석', '추천'
  ];
  
  return realEstateKeywords.some(keyword => text.includes(keyword));
}

// 은행 과장 응답 생성
function generateBankingResponse(
  message: string, 
  profile: Fields, 
  context: UserContext
): ExpertResponse {
  const expert = EXPERT_PERSONAS.banking;
  
  // 기본 정보 확인
  if (!profile.incomeMonthly) {
    return {
      content: `${expert.greeting}\n\n대출 상담을 위해 월소득 정보가 필요합니다.\n\n💡 **필요한 정보**:\n• 월소득 (세후)\n• 매물 가격 또는 희망 예산\n• 보유 현금 (선택사항)\n\n예시: "월소득 500만원, 5억원 아파트 구입하고 싶어요"`,
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  // 대출 시나리오 생성
  const inputs: LoanInputs = {
    propertyPrice: profile.propertyPrice || 500_000_000, // 기본값
    downPayment: profile.downPayment || profile.cashOnHand || 100_000_000,
    incomeMonthly: profile.incomeMonthly,
    cashOnHand: profile.cashOnHand || 0,
    loanPeriodYears: profile.loanPeriodYears || 30
  };
  
  const scenarios = generateLoanScenarios(inputs);
  const cards = scenarios.map(convertScenarioToCard);
  
  // 전문가 관점의 조언
  let content = `${expert.greeting}\n\n`;
  content += `**${context.experienceLevel === 'beginner' ? '첫 대출' : '대출'} 상담**을 도와드리겠습니다.\n\n`;
  
  // 상황별 맞춤 조언
  if (context.urgency === 'immediate') {
    content += `⚡ **긴급 처리**가 필요하시군요. 서류 준비부터 시작하겠습니다.\n\n`;
  }
  
  content += `📊 **현재 상황 분석**:\n`;
  content += `• 월소득: ${toComma(profile.incomeMonthly)}원\n`;
  content += `• 매물가격: ${toComma(inputs.propertyPrice)}원\n`;
  content += `• 보유현금: ${toComma(inputs.cashOnHand)}원\n\n`;
  
  // 전문가 조언
  content += `💼 **은행 과장 관점의 조언**:\n`;
  
  const annualIncome = profile.incomeMonthly * 12;
  const maxLoanAmount = annualIncome * 0.4 * 30; // DSR 40%
  
  if (inputs.propertyPrice > maxLoanAmount) {
    content += `⚠️ **현실적 한도 초과**: 현재 소득으로는 ${formatKRW(maxLoanAmount)}원까지가 현실적입니다.\n`;
    content += `• 대안: 더 저렴한 매물 검토 또는 부모님 연대보증 고려\n`;
    content += `• 정책자금 활용으로 한도 확대 가능\n\n`;
  } else {
    content += `✅ **승인 가능성 높음**: 현재 조건으로 대출 승인이 가능해 보입니다.\n`;
    content += `• DSR 40% 이하 유지로 안정적 상환 가능\n`;
    content += `• 정책자금 우대 조건 확인 필요\n\n`;
  }
  
  // 다음 단계 안내
  content += `🎯 **다음 단계**:\n`;
  content += `1. 기금e든든 모의심사 (필수)\n`;
  content += `2. 소득증빙서류 준비\n`;
  content += `3. 여러 은행 상품 비교\n`;
  content += `4. 우대금리 조건 확인\n\n`;
  
  content += `더 구체적인 질문이 있으시면 언제든 말씀해 주세요!`;
  
  return {
    content,
    cards,
    checklist: [
      '기금e든든 모의심사 완료',
      '소득증빙서류 준비 (3개월)',
      '재직증명서 발급',
      '주민등록등본 준비',
      '여러 은행 상품 비교'
    ],
    confidence: 'high',
    expertType: 'banking'
  };
}

// 정책 전문가 응답 생성
function generatePolicyResponse(
  message: string, 
  profile: Fields, 
  context: UserContext
): ExpertResponse {
  const expert = EXPERT_PERSONAS.policy;
  
  let content = `${expert.greeting}\n\n`;
  
  // 정책별 맞춤 상담
  if (message.includes('보금자리론')) {
    content += `**보금자리론** 상담을 도와드리겠습니다.\n\n`;
    content += `📋 **2025년 기준 주요 정보**:\n`;
    content += `• 최대한도: ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.bogeumjari)}원\n`;
    content += `• LTV: 50-80% (지역별 차등)\n`;
    content += `• 금리: 연 2.5-3.5%\n`;
    content += `• 대상: 무주택 세대주\n\n`;
    
    content += `💡 **전문가 조언**:\n`;
    content += `• 생애최초/신혼부부 우대 조건 확인\n`;
    content += `• 기금e든든 사전 모의심사 필수\n`;
    content += `• 취급은행별 우대금리 차이 있음\n\n`;
  } else if (message.includes('디딤돌')) {
    content += `**디딤돌 대출** 상담을 도와드리겠습니다.\n\n`;
    content += `📋 **2025년 기준 주요 정보**:\n`;
    content += `• 최대한도: ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.didimdol)}원\n`;
    content += `• LTV: 50-70% (지역별 차등)\n`;
    content += `• 금리: 연 3.2-4.05%\n`;
    content += `• 대상: 무주택 세대주\n\n`;
    
    content += `💡 **전문가 조언**:\n`;
    content += `• 신혼부부/생애최초 우대금리 적용\n`;
    content += `• 상환방식 선택 중요 (원리금균등/체증식/원금균등)\n`;
    content += `• 서류 준비 기간 2-3주 소요\n\n`;
  } else {
    content += `**정책자금** 상담을 도와드리겠습니다.\n\n`;
    content += `📋 **주요 정책자금**:\n`;
    content += `• 보금자리론: 구입자금 (최대 ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.bogeumjari)}원)\n`;
    content += `• 디딤돌: 구입자금 (최대 ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.didimdol)}원)\n`;
    content += `• 버팀목: 전세자금 (최대 ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.buttumok)}원)\n`;
    content += `• 신생아특례: 구입자금 (최대 ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.bogeumjariMultiChild)}원)\n\n`;
  }
  
  content += `🎯 **신청 절차**:\n`;
  content += `1. 기금e든든 모의심사\n`;
  content += `2. 자격요건 확인\n`;
  content += `3. 서류 준비\n`;
  content += `4. 취급은행 신청\n`;
  content += `5. 심사 및 승인\n\n`;
  
  content += getCurrentPolicyDisclaimer();
  
  return {
    content,
    cards: [{
      title: '정책자금 요약',
      subtitle: '2025년 기준',
      monthly: '상품별 차등',
      totalInterest: '우대조건별 차등',
      notes: [
        '기금e든든 모의심사 필수',
        '자격요건 정확히 확인',
        '서류 준비 2-3주 소요',
        '취급은행별 조건 차이'
      ]
    }],
    checklist: [
      '무주택 세대주 자격 확인',
      '소득 기준 확인',
      '기금e든든 모의심사',
      '필수서류 준비',
      '취급은행 비교'
    ],
    confidence: 'high',
    expertType: 'policy'
  };
}

// 부동산 전문가 응답 생성
function generateRealEstateResponse(
  message: string, 
  profile: Fields, 
  context: UserContext
): ExpertResponse {
  const expert = EXPERT_PERSONAS.real_estate;
  
  let content = `${expert.greeting}\n\n`;
  content += `**부동산 시장** 상담을 도와드리겠습니다.\n\n`;
  
  if (context.location) {
    content += `📍 **${context.location} 지역 분석**:\n`;
    content += `• 현재 시장 동향: 안정적\n`;
    content += `• 가격 전망: 소폭 상승 예상\n`;
    content += `• 투자 매력도: 중간\n\n`;
  }
  
  content += `💡 **전문가 조언**:\n`;
  content += `• 시세 조사: 국토부 실거래가 확인\n`;
  content += `• 지역별 특성 파악 중요\n`;
  content += `• 장기적 관점에서 접근\n`;
  content += `• 리스크 관리 필수\n\n`;
  
  content += `📊 **참고 자료**:\n`;
  content += `• 실거래가: rt.molit.go.kr\n`;
  content += `• KB시세: kbstar.com\n`;
  content += `• 청약정보: applyhome.co.kr\n\n`;
  
  return {
    content,
    confidence: 'medium',
    expertType: 'real_estate'
  };
}

// 일반 상담 응답 생성
function generateGeneralResponse(
  message: string, 
  profile: Fields, 
  context: UserContext
): ExpertResponse {
  // 상황에 따라 적절한 전문가 선택
  let expertType: ExpertResponse['expertType'] = 'general';
  let expert = EXPERT_PERSONAS.banking; // 기본값
  
  if (context.situation === 'first_home' || profile.incomeMonthly) {
    expertType = 'banking';
    expert = EXPERT_PERSONAS.banking;
  } else if (context.situation === 'investment') {
    expertType = 'real_estate';
    expert = EXPERT_PERSONAS.real_estate;
  }
  
  let content = `${expert.greeting}\n\n`;
  content += `어떤 도움이 필요하신지 구체적으로 말씀해 주시면, 전문가 관점에서 정확한 조언을 드리겠습니다.\n\n`;
  
  content += `💡 **도움드릴 수 있는 영역**:\n`;
  if (expertType === 'banking') {
    content += `• 대출 시나리오 분석\n`;
    content += `• 금리 및 상환 방식 상담\n`;
    content += `• 서류 준비 및 신청 절차\n`;
    content += `• 은행별 상품 비교\n\n`;
  } else if (expertType === 'real_estate') {
    content += `• 지역별 시세 분석\n`;
    content += `• 투자 전략 수립\n`;
    content += `• 매물 선정 기준\n`;
    content += `• 시장 동향 분석\n\n`;
  }
  
  content += `📝 **구체적인 질문 예시**:\n`;
  content += `• "월소득 500만원으로 5억원 아파트 살 수 있을까요?"\n`;
  content += `• "보금자리론과 디딤돌 중 뭐가 나을까요?"\n`;
  content += `• "강남 아파트 투자 어떻게 생각하세요?"\n\n`;
  
  content += `상황을 자세히 알려주시면 맞춤형 조언을 드리겠습니다!`;
  
  return {
    content,
    confidence: 'medium',
    expertType
  };
}
