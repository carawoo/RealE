// lib/loan-calculator.ts
// 대출 시나리오 계산을 위한 핵심 라이브러리

export interface LoanInputs {
  propertyPrice: number;      // 매매가 (원)
  downPayment: number;        // 계약금/자기자본 (원)
  incomeMonthly: number;      // 월소득 (원)
  cashOnHand: number;         // 보유현금 (원)
  loanPeriodYears: number;    // 대출기간 (년)
  baseInterestRate?: number;  // 기준금리 (%, 기본값: 4.5%)
}

export interface LoanScenario {
  title: string;
  description: string;
  loanAmount: number;         // 대출금액 (원)
  interestRate: number;       // 적용금리 (%)
  monthlyPayment: number;     // 월상환액 (원)
  totalInterest: number;      // 총이자 (원)
  totalPayment: number;       // 총상환액 (원)
  ltv: number;               // LTV 비율 (%)
  dsr: number;               // DSR 비율 (%)
  supportProgram?: string;    // 지원 프로그램명
  applicationLink?: string;   // 신청 링크
  advantages: string[];       // 장점
  considerations: string[];   // 고려사항
}

export interface PolicySupport {
  name: string;
  maxAmount: number;         // 최대 지원금액 (원)
  interestRate: number;      // 지원금리 (%)
  conditions: string[];      // 지원조건
  applicationLink: string;   // 신청링크
}

// 정책 지원 프로그램 데이터 (2025년 기준)
// 주의: 중기청 100억 대출은 2024년 말 종료되어 더 이상 운영되지 않음
export const POLICY_SUPPORTS: PolicySupport[] = [
  {
    name: "디딤돌대출(일반)",
    maxAmount: 250_000_000,
    interestRate: 3.3, // 2025년 기준 기본금리
    conditions: ["무주택 세대주", "연소득 6천만원 이하", "부부합산 순자산 3.88억원 이하", "주택가격 6억원 이하"],
    applicationLink: "https://www.hf.go.kr"
  },
  {
    name: "디딤돌대출(신혼부부)",
    maxAmount: 250_000_000,
    interestRate: 3.1, // 신혼부부 우대금리 0.2%p 적용
    conditions: ["무주택 세대주", "혼인신고일 기준 7년 이내", "연소득 7천만원 이하", "부부합산 순자산 3.88억원 이하"],
    applicationLink: "https://www.hf.go.kr"
  },
  {
    name: "디딤돌대출(생애최초)",
    maxAmount: 250_000_000,
    interestRate: 3.1, // 생애최초 우대금리 0.2%p 적용
    conditions: ["무주택 세대주", "생애최초 주택구입", "연소득 7천만원 이하", "부부합산 순자산 3.88억원 이하"],
    applicationLink: "https://www.hf.go.kr"
  },
  {
    name: "보금자리론(생애최초)",
    maxAmount: 400_000_000,
    interestRate: 2.9,
    conditions: ["생애최초 주택구입", "무주택 세대주", "연소득 7천만원 이하", "주택가격 9억원 이하"],
    applicationLink: "https://nhuf.molit.go.kr"
  },
  {
    name: "신생아 특례대출",
    maxAmount: 500_000_000,
    interestRate: 1.6,
    conditions: ["2022년 이후 출생 자녀", "무주택 세대주", "연소득 1.3억원 이하", "주택가격 9억원 이하"],
    applicationLink: "https://www.hf.go.kr"
  },
  {
    name: "다자녀 특례대출",
    maxAmount: 400_000_000,
    interestRate: 2.2,
    conditions: ["자녀 2명 이상", "무주택 세대주", "연소득 1억원 이하", "주택가격 8억원 이하"],
    applicationLink: "https://www.hf.go.kr"
  },
  {
    name: "청년 버팀목 전세자금대출",
    maxAmount: 200_000_000,
    interestRate: 2.2,
    conditions: ["만 19~34세 무주택 세대주", "연소득 5천만원 이하", "전세보증금 80% 한도", "중기청 대출 통합운영"],
    applicationLink: "https://www.hf.go.kr"
  },
  {
    name: "일반 버팀목 전세자금대출",
    maxAmount: 300_000_000,
    interestRate: 2.5,
    conditions: ["무주택 세대주", "연소득 7천만원 이하", "전세보증금 80% 한도", "임대차계약서 필요"],
    applicationLink: "https://www.hf.go.kr"
  },
  {
    name: "KB국민은행 주택담보대출",
    maxAmount: 1_000_000_000,
    interestRate: 4.2,
    conditions: ["주택 담보 제공", "DTI 70% 이하", "LTV 70% 이하", "소득증빙 필요"],
    applicationLink: "https://www.kbstar.com"
  },
  {
    name: "신한은행 주택담보대출",
    maxAmount: 1_000_000_000,
    interestRate: 4.1,
    conditions: ["주택 담보 제공", "DTI 70% 이하", "LTV 70% 이하", "재직증명서 필요"],
    applicationLink: "https://www.shinhan.com"
  },
  {
    name: "하나은행 주택담보대출",
    maxAmount: 1_000_000_000,
    interestRate: 4.3,
    conditions: ["주택 담보 제공", "DTI 70% 이하", "LTV 70% 이하", "소득증빙 3개월"],
    applicationLink: "https://www.kebhana.com"
  },
  {
    name: "우리은행 주택담보대출",
    maxAmount: 1_000_000_000,
    interestRate: 4.2,
    conditions: ["주택 담보 제공", "DTI 70% 이하", "LTV 70% 이하", "급여이체 우대금리"],
    applicationLink: "https://www.wooribank.com"
  },
  {
    name: "KB국민은행 신용대출",
    maxAmount: 150_000_000,
    interestRate: 5.8,
    conditions: ["연소득 2천만원 이상", "재직기간 6개월 이상", "신용등급 6등급 이상", "소득증빙 필요"],
    applicationLink: "https://www.kbstar.com"
  },
  {
    name: "신한은행 신용대출",
    maxAmount: 150_000_000,
    interestRate: 5.6,
    conditions: ["연소득 2천만원 이상", "재직기간 1년 이상", "신용등급 6등급 이상", "급여이체 필수"],
    applicationLink: "https://www.shinhan.com"
  },
  {
    name: "토스뱅크 신용대출",
    maxAmount: 100_000_000,
    interestRate: 4.9,
    conditions: ["연소득 2천만원 이상", "신용등급 7등급 이상", "모바일 전용", "간편 신청"],
    applicationLink: "https://www.tossbank.com"
  },
  {
    name: "카카오뱅크 신용대출",
    maxAmount: 100_000_000,
    interestRate: 5.2,
    conditions: ["연소득 1천500만원 이상", "신용등급 7등급 이상", "모바일 전용", "365일 신청"],
    applicationLink: "https://www.kakaobank.com"
  },
  {
    name: "아파트담보대출(은행 공통)",
    maxAmount: 1_500_000_000,
    interestRate: 3.8,
    conditions: ["아파트 담보 제공", "LTV 80% 이하", "DTI 60% 이하", "주택가격 20억원 이하"],
    applicationLink: "https://www.hf.go.kr"
  },
  {
    name: "오피스텔담보대출",
    maxAmount: 800_000_000,
    interestRate: 4.5,
    conditions: ["오피스텔 담보 제공", "LTV 60% 이하", "DTI 60% 이하", "임대수익 인정"],
    applicationLink: "https://www.hf.go.kr"
  },
  {
    name: "상가담보대출",
    maxAmount: 1_000_000_000,
    interestRate: 5.2,
    conditions: ["상가 담보 제공", "LTV 50% 이하", "임대료 수익 증빙", "사업자등록증 필요"],
    applicationLink: "https://www.hf.go.kr"
  },
  {
    name: "중소기업진흥공단 창업자금",
    maxAmount: 300_000_000,
    interestRate: 2.0,
    conditions: ["창업 3년 이내", "사업자등록증", "사업계획서", "기술평가 우수"],
    applicationLink: "https://www.sbc.or.kr"
  },
  {
    name: "농협 주택담보대출",
    maxAmount: 800_000_000,
    interestRate: 4.0,
    conditions: ["농협 조합원", "주택 담보 제공", "LTV 70% 이하", "지역 우대금리"],
    applicationLink: "https://www.nonghyup.com"
  },
  {
    name: "새마을금고 주택자금",
    maxAmount: 500_000_000,
    interestRate: 4.1,
    conditions: ["조합원 가입", "주택 담보 제공", "지역 거주자", "LTV 70% 이하"],
    applicationLink: "https://www.kfcc.co.kr"
  }
];

// 2억5천, 3억, 3천만원, 4500만원, 120만원, 250000000 등
export function parseWon(text: string): number | null {
  const t = text.replace(/\s+/g, "").replace(/,/g, "");

  let m = t.match(/(\d+)\s*억\s*(\d+)\s*천/);
  if (m) return parseInt(m[1]) * 100_000_000 + parseInt(m[2]) * 10_000_000;

  m = t.match(/(\d+)\s*억\s*(\d+)\s*만?원?/);
  if (m) return parseInt(m[1]) * 100_000_000 + parseInt(m[2]) * 10_000;

  m = t.match(/(\d+)\s*억(원)?/);
  if (m) return parseInt(m[1]) * 100_000_000;

  m = t.match(/(\d+)\s*천\s*만?원?/);
  if (m) return parseInt(m[1]) * 10_000_000;

  m = t.match(/(\d+)\s*만\s*원/);
  if (m) return parseInt(m[1]) * 10_000;

  m = t.match(/(\d{2,})(?:원)?$/);
  if (m) return parseInt(m[1], 10);

  return null;
}

// 월 상환액 계산 (원리금균등상환)
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  years: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = years * 12;
  
  if (monthlyRate === 0) {
    return principal / totalMonths;
  }
  
  const monthlyPayment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
    (Math.pow(1 + monthlyRate, totalMonths) - 1);
  
  return Math.round(monthlyPayment);
}

// 총 이자 계산
export function calculateTotalInterest(
  principal: number,
  monthlyPayment: number,
  years: number
): number {
  const totalPayment = monthlyPayment * years * 12;
  return totalPayment - principal;
}

// LTV 계산
export function calculateLTV(loanAmount: number, propertyPrice: number): number {
  return (loanAmount / propertyPrice) * 100;
}

// DSR 계산 (간단버전 - 주택담보대출만 고려)
export function calculateDSR(monthlyPayment: number, monthlyIncome: number): number {
  return (monthlyPayment / monthlyIncome) * 100;
}

// 3종 시나리오 생성
export function generateLoanScenarios(inputs: LoanInputs): LoanScenario[] {
  const { propertyPrice, downPayment, incomeMonthly, loanPeriodYears } = inputs;
  const baseRate = inputs.baseInterestRate || 4.5;
  
  const scenarios: LoanScenario[] = [];
  
  // 1. 최대 한도형 (구매력 극대화)
  const maxLoanAmount = Math.min(
    propertyPrice * 0.8,  // LTV 80% 기준
    propertyPrice - downPayment
  );
  const maxScenario: LoanScenario = {
    title: "최대 한도형",
    description: "구매력을 극대화하는 시나리오",
    loanAmount: maxLoanAmount,
    interestRate: baseRate + 0.3,  // 시중은행 일반금리
    monthlyPayment: calculateMonthlyPayment(maxLoanAmount, baseRate + 0.3, loanPeriodYears),
    totalInterest: 0,
    totalPayment: 0,
    ltv: calculateLTV(maxLoanAmount, propertyPrice),
    dsr: 0,
    advantages: [
      "높은 대출한도로 더 비싼 매물 구매 가능",
      "자기자본 최소화로 여유자금 확보",
      "레버리지 효과 극대화"
    ],
    considerations: [
      "높은 월상환 부담",
      "금리상승 위험 노출",
      "대출 승인 조건 까다로움"
    ]
  };
  
  // 2. 안전 상환형 (부채 최소화)
  const safeLoanAmount = Math.min(
    propertyPrice * 0.6,  // LTV 60% 기준
    incomeMonthly * 12 * 5,  // 연소득 5배 기준
    propertyPrice - downPayment
  );
  const safeScenario: LoanScenario = {
    title: "안전 상환형",
    description: "부채를 최소화하는 안전한 시나리오",
    loanAmount: safeLoanAmount,
    interestRate: baseRate,
    monthlyPayment: calculateMonthlyPayment(safeLoanAmount, baseRate, loanPeriodYears),
    totalInterest: 0,
    totalPayment: 0,
    ltv: calculateLTV(safeLoanAmount, propertyPrice),
    dsr: 0,
    advantages: [
      "낮은 월상환 부담",
      "대출 승인 용이",
      "금리상승 위험 최소화",
      "조기상환 여력 확보"
    ],
    considerations: [
      "높은 자기자본 필요",
      "구매 가능한 매물 제한",
      "기회비용 발생 가능"
    ]
  };
  
  // 3. 정책 활용형 (지원금·특례 활용)
  const eligiblePolicy = POLICY_SUPPORTS.find(policy => 
    maxLoanAmount <= policy.maxAmount
  ) || POLICY_SUPPORTS[0];
  
  const policyLoanAmount = Math.min(
    eligiblePolicy.maxAmount,
    propertyPrice * 0.8,
    propertyPrice - downPayment
  );
  
  const policyScenario: LoanScenario = {
    title: "정책 활용형",
    description: "정부 지원 프로그램을 활용한 시나리오",
    loanAmount: policyLoanAmount,
    interestRate: eligiblePolicy.interestRate,
    monthlyPayment: calculateMonthlyPayment(policyLoanAmount, eligiblePolicy.interestRate, loanPeriodYears),
    totalInterest: 0,
    totalPayment: 0,
    ltv: calculateLTV(policyLoanAmount, propertyPrice),
    dsr: 0,
    supportProgram: eligiblePolicy.name,
    applicationLink: eligiblePolicy.applicationLink,
    advantages: [
      "낮은 정책금리 적용",
      "장기 고정금리 가능",
      "서민 주거안정 지원",
      "총 이자비용 절약"
    ],
    considerations: [
      "자격조건 까다로움",
      "한도 제한",
      "심사기간 길 수 있음",
      "중도상환 제약 가능"
    ]
  };
  
  // 총 이자 및 총 상환액, DSR 계산
  [maxScenario, safeScenario, policyScenario].forEach(scenario => {
    scenario.totalInterest = calculateTotalInterest(
      scenario.loanAmount,
      scenario.monthlyPayment,
      loanPeriodYears
    );
    scenario.totalPayment = scenario.loanAmount + scenario.totalInterest;
    scenario.dsr = calculateDSR(scenario.monthlyPayment, incomeMonthly);
  });
  
  scenarios.push(maxScenario, safeScenario, policyScenario);
  
  return scenarios;
}

// 숫자 포맷팅 유틸리티
export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// 상환방식별 특화 정보
export interface RepaymentTypeInfo {
  type: "원리금균등" | "체증식" | "원금균등";
  description: string;
  interestRateAdjustment: number; // 금리 조정폭
  advantages: string[];
  considerations: string[];
}

export const REPAYMENT_TYPES: RepaymentTypeInfo[] = [
  {
    type: "원리금균등",
    description: "매월 동일한 금액을 상환하는 가장 일반적인 방식",
    interestRateAdjustment: 0,
    advantages: ["매월 상환액 일정", "가계 예산 관리 용이", "장기 재정 계획 수립 편리"],
    considerations: ["초기 이자 비중 높음", "원금 상환 속도 느림"]
  },
  {
    type: "체증식",
    description: "초기 상환액이 적고 시간이 지날수록 상환액이 증가하는 방식",
    interestRateAdjustment: 0.3, // 디딤돌 대출 기준 +0.3%p
    advantages: ["초기 상환 부담 경감", "초기 현금 흐름 개선", "신혼부부·청년층에 유리"],
    considerations: ["후반기 상환 부담 증가", "총 이자 비용 증가", "금리 추가 적용(+0.3%p)"]
  },
  {
    type: "원금균등",
    description: "매월 원금을 동일하게 상환하고 이자는 잔액에 따라 계산하는 방식",
    interestRateAdjustment: 0,
    advantages: ["총 이자비용 최소", "원금 상환 속도 빠름", "후반기 상환 부담 감소"],
    considerations: ["초기 상환 부담 높음", "초기 현금 흐름 부담", "소득 증가 예상 시 유리"]
  }
];

// 상환방식별 월 상환액 계산
export function calculatePaymentByType(
  principal: number,
  annualRate: number,
  years: number,
  type: "원리금균등" | "체증식" | "원금균등" = "원리금균등"
): { initialPayment: number; finalPayment?: number; averagePayment: number } {
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = years * 12;
  
  switch (type) {
    case "원리금균등":
      const equalPayment = calculateMonthlyPayment(principal, annualRate, years);
      return {
        initialPayment: equalPayment,
        averagePayment: equalPayment
      };
      
    case "체증식":
      // 체증식: 초기 5년간 이자만 납부, 이후 원리금균등
      const graceYears = Math.min(5, years);
      const interestOnlyPayment = principal * monthlyRate;
      const remainingYears = years - graceYears;
      const principalPayment = remainingYears > 0 ? 
        calculateMonthlyPayment(principal, annualRate, remainingYears) : principal / totalMonths;
      
      return {
        initialPayment: Math.round(interestOnlyPayment),
        finalPayment: Math.round(principalPayment),
        averagePayment: Math.round((interestOnlyPayment * graceYears * 12 + principalPayment * remainingYears * 12) / totalMonths)
      };
      
    case "원금균등":
      const principalPerMonth = principal / totalMonths;
      const initialInterest = principal * monthlyRate;
      const finalInterest = (principal - principalPerMonth * (totalMonths - 1)) * monthlyRate;
      
      return {
        initialPayment: Math.round(principalPerMonth + initialInterest),
        finalPayment: Math.round(principalPerMonth + finalInterest),
        averagePayment: Math.round(principalPerMonth + (initialInterest + finalInterest) / 2)
      };
      
    default:
      return { initialPayment: 0, averagePayment: 0 };
  }
}

// 전문 대출 상담 기능
export function analyzeSpecificLoanPolicy(
  loanType: string,
  loanAmount: number,
  repaymentType: "원리금균등" | "체증식" | "원금균등" = "원리금균등"
) {
  const typeInfo = REPAYMENT_TYPES.find(t => t.type === repaymentType);
  if (!typeInfo) return null;
  
  let baseRate = 3.3; // 디딤돌 기본금리
  let programName = "디딤돌대출(일반)";
  
  // 대출 유형별 기본금리 및 혜택 설정
  if (loanType.includes("신혼부부")) {
    baseRate = 3.1;
    programName = "디딤돌대출(신혼부부)";
  } else if (loanType.includes("생애최초")) {
    baseRate = 3.1;
    programName = "디딤돌대출(생애최초)";
  }
  
  // 상환방식에 따른 금리 조정
  const adjustedRate = baseRate + typeInfo.interestRateAdjustment;
  const payments = calculatePaymentByType(loanAmount, adjustedRate, 30, repaymentType);
  
  return {
    programName,
    baseRate,
    adjustedRate,
    repaymentType: typeInfo,
    payments,
    explanation: `${programName}에서 ${repaymentType} 상환방식 선택 시 금리는 ${adjustedRate}%가 적용됩니다.`
  };
}

// 시나리오를 UI 카드 형태로 변환
export function convertScenarioToCard(scenario: LoanScenario) {
  return {
    title: scenario.title,
    subtitle: scenario.description,
    monthly: `월 ${formatKRW(scenario.monthlyPayment)}원`,
    totalInterest: `총 이자 ${formatKRW(scenario.totalInterest)}원`,
    notes: [
      `대출금액: ${formatKRW(scenario.loanAmount)}원`,
      `적용금리: ${formatPercent(scenario.interestRate)}`,
      `LTV: ${formatPercent(scenario.ltv)}`,
      `DSR: ${formatPercent(scenario.dsr)}`,
      ...(scenario.supportProgram ? [`지원프로그램: ${scenario.supportProgram}`] : []),
      ...(scenario.applicationLink ? [`📝 ${scenario.supportProgram || '해당 대출'} 신청은 한국주택금융공사 홈페이지에서 가능합니다`, `신청링크: ${scenario.applicationLink}`] : [])
    ]
  };
}
