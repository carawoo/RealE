// Moved from lib/loan-calculator.ts
export interface LoanInputs {
  propertyPrice: number;
  downPayment: number;
  incomeMonthly: number;
  cashOnHand: number;
  loanPeriodYears: number;
  baseInterestRate?: number;
}

export interface LoanScenario {
  title: string;
  description: string;
  loanAmount: number;
  interestRate: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  ltv: number;
  dsr: number;
  supportProgram?: string;
  applicationLink?: string;
  advantages: string[];
  considerations: string[];
}

export interface PolicySupport {
  name: string;
  maxAmount: number;
  interestRate: number;
  conditions: string[];
  applicationLink: string;
}

export const POLICY_SUPPORTS: PolicySupport[] = [];

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

export function calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = years * 12;
  if (monthlyRate === 0) return Math.round(principal / totalMonths);
  const monthlyPayment = principal *
    (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1);
  return Math.round(monthlyPayment);
}

export function calculateTotalInterest(principal: number, monthlyPayment: number, years: number): number {
  const totalPayment = monthlyPayment * years * 12;
  return totalPayment - principal;
}

export function calculateLTV(loanAmount: number, propertyPrice: number): number {
  return (loanAmount / propertyPrice) * 100;
}

export function calculateDSR(monthlyPayment: number, monthlyIncome: number): number {
  return (monthlyPayment / monthlyIncome) * 100;
}

export function generateLoanScenarios(inputs: LoanInputs): LoanScenario[] {
  const { propertyPrice, downPayment, incomeMonthly, loanPeriodYears } = inputs;
  const baseRate = inputs.baseInterestRate || 4.5;
  const scenarios: LoanScenario[] = [];
  const maxLoanAmount = Math.min(propertyPrice * 0.8, propertyPrice - downPayment);
  const maxScenario: LoanScenario = {
    title: "최대 한도형",
    description: "구매력을 극대화하는 시나리오",
    loanAmount: maxLoanAmount,
    interestRate: baseRate + 0.3,
    monthlyPayment: calculateMonthlyPayment(maxLoanAmount, baseRate + 0.3, loanPeriodYears),
    totalInterest: 0,
    totalPayment: 0,
    ltv: calculateLTV(maxLoanAmount, propertyPrice),
    dsr: 0,
    advantages: ["높은 대출한도로 더 비싼 매물 구매 가능", "자기자본 최소화로 여유자금 확보", "레버리지 효과 극대화"],
    considerations: ["높은 월상환 부담", "금리상승 위험 노출", "대출 승인 조건 까다로움"],
  };

  const safeLoanAmount = Math.min(propertyPrice * 0.6, incomeMonthly * 12 * 5, propertyPrice - downPayment);
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
    advantages: ["낮은 월상환 부담", "대출 승인 용이", "금리상승 위험 최소화", "조기상환 여력 확보"],
    considerations: ["높은 자기자본 필요", "구매 가능한 매물 제한", "기회비용 발생 가능"],
  };

  const policyLoanAmount = Math.min(propertyPrice * 0.8, propertyPrice - downPayment);
  const policyScenario: LoanScenario = {
    title: "정책 활용형",
    description: "정부 지원 프로그램을 활용한 시나리오",
    loanAmount: policyLoanAmount,
    interestRate: baseRate,
    monthlyPayment: calculateMonthlyPayment(policyLoanAmount, baseRate, loanPeriodYears),
    totalInterest: 0,
    totalPayment: 0,
    ltv: calculateLTV(policyLoanAmount, propertyPrice),
    dsr: 0,
    supportProgram: undefined,
    applicationLink: undefined,
    advantages: ["낮은 정책금리 적용", "장기 고정금리 가능", "서민 주거안정 지원", "총 이자비용 절약"],
    considerations: ["자격조건 까다로움", "한도 제한", "심사기간 길 수 있음", "중도상환 제약 가능"],
  };

  [maxScenario, safeScenario, policyScenario].forEach(scenario => {
    scenario.totalInterest = calculateTotalInterest(scenario.loanAmount, scenario.monthlyPayment, loanPeriodYears);
    scenario.totalPayment = scenario.loanAmount + scenario.totalInterest;
    scenario.dsr = calculateDSR(scenario.monthlyPayment, incomeMonthly);
  });

  scenarios.push(maxScenario, safeScenario, policyScenario);
  return scenarios;
}

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export interface RepaymentTypeInfo {
  type: "원리금균등" | "체증식" | "원금균등";
  description: string;
  interestRateAdjustment: number;
  advantages: string[];
  considerations: string[];
}

export const REPAYMENT_TYPES: RepaymentTypeInfo[] = [
  {
    type: "원리금균등",
    description: "매월 동일한 금액을 상환하는 가장 일반적인 방식",
    interestRateAdjustment: 0,
    advantages: ["매월 상환액 일정", "가계 예산 관리 용이", "장기 재정 계획 수립 편리"],
    considerations: ["초기 이자 비중 높음", "원금 상환 속도 느림"],
  },
  {
    type: "체증식",
    description: "초기 상환액이 적고 시간이 지날수록 상환액이 증가하는 방식",
    interestRateAdjustment: 0.3,
    advantages: ["초기 상환 부담 경감", "초기 현금 흐름 개선", "신혼부부·청년층에 유리"],
    considerations: ["후반기 상환 부담 증가", "총 이자 비용 증가", "금리 추가 적용(+0.3%p)"],
  },
  {
    type: "원금균등",
    description: "매월 원금을 동일하게 상환하고 이자는 잔액에 따라 계산하는 방식",
    interestRateAdjustment: 0,
    advantages: ["총 이자비용 최소", "원금 상환 속도 빠름", "후반기 상환 부담 감소"],
    considerations: ["초기 상환 부담 높음", "초기 현금 흐름 부담", "소득 증가 예상 시 유리"],
  },
];

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
      return { initialPayment: equalPayment, averagePayment: equalPayment };
    case "체증식":
      const graceYears = Math.min(5, years);
      const interestOnlyPayment = principal * monthlyRate;
      const remainingYears = years - graceYears;
      const principalPayment = remainingYears > 0 ? calculateMonthlyPayment(principal, annualRate, remainingYears) : principal / totalMonths;
      return {
        initialPayment: Math.round(interestOnlyPayment),
        finalPayment: Math.round(principalPayment),
        averagePayment: Math.round((interestOnlyPayment * graceYears * 12 + principalPayment * remainingYears * 12) / totalMonths),
      };
    case "원금균등":
      const principalPerMonth = principal / totalMonths;
      const initialInterest = principal * monthlyRate;
      const finalInterest = (principal - principalPerMonth * (totalMonths - 1)) * monthlyRate;
      return {
        initialPayment: Math.round(principalPerMonth + initialInterest),
        finalPayment: Math.round(principalPerMonth + finalInterest),
        averagePayment: Math.round(principalPerMonth + (initialInterest + finalInterest) / 2),
      };
    default:
      return { initialPayment: 0, averagePayment: 0 };
  }
}


