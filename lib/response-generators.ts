import { Fields } from './utils';
import { analyzeQuestionContext, isRepaymentTypeQuestion } from './question-analyzer';
import { CURRENT_LOAN_POLICY, getCurrentPolicyDisclaimer } from './policy-data';
import { 
  generateLoanScenarios, 
  convertScenarioToCard, 
  LoanInputs,
  formatKRW,
  analyzeSpecificLoanPolicy,
  formatPercent
} from './loan-calculator';

// 대출 시나리오 생성 및 응답 처리
export function generateLoanScenariosResponse(profile: Fields) {
  const { incomeMonthly, cashOnHand, propertyPrice, downPayment, loanPeriodYears } = profile;
  
  // 필수 정보 확인
  if (!incomeMonthly || !propertyPrice) {
    return {
      content: "대출 시나리오 계산을 위해 다음 정보가 필요해요:\n" +
               "• 월소득\n• 매매가\n• 자기자본(계약금)\n\n" +
               "예: \"월소득 500만원, 5억원 집 구입, 자기자본 1억원\"",
      cards: null,
      checklist: ["월소득 확인", "매매가 확인", "자기자본 확인", "대출기간 결정(기본 30년)"]
    };
  }
  
  // 기본값 설정
  const inputs: LoanInputs = {
    propertyPrice,
    downPayment: downPayment || cashOnHand || propertyPrice * 0.2, // 기본값: 20%
    incomeMonthly,
    cashOnHand: cashOnHand || 0,
    loanPeriodYears: loanPeriodYears || 30 // 기본값: 30년
  };
  
  try {
    const scenarios = generateLoanScenarios(inputs);
    const cards = scenarios.map(convertScenarioToCard);
    
    return {
      content: `${formatKRW(propertyPrice)}원 매물에 대한 3가지 대출 시나리오를 분석했어요.`,
      cards,
      checklist: [
        "DSR 40% 이하 유지 권장",
        "금리 상승 시나리오 검토",
        "정책자금 자격조건 확인",
        "중도상환 계획 수립"
      ]
    };
  } catch (error) {
    return {
      content: "시나리오 계산 중 오류가 발생했어요. 입력 정보를 다시 확인해 주세요.",
      cards: null,
      checklist: null
    };
  }
}

// 맥락에 맞는 개인화된 응답을 생성하는 함수
export function generateContextualResponse(context: ReturnType<typeof analyzeQuestionContext>, loanType: string, baseInfo: any): string {
  const { questionType, urgency, experienceLevel } = context;
  
  let responseStart = "";
  
  // 경험 수준에 따른 응답 스타일 조정
  if (experienceLevel === 'first_time') {
    responseStart = `**${loanType} 첫 신청자를 위한 안내** 🔰\n\n`;
  } else if (experienceLevel === 'experienced') {
    responseStart = `**${loanType} 추가 상담** 💼\n\n`;
  } else {
    responseStart = `**${loanType} 전문 상담** 🏠\n\n`;
  }
  
  // 긴급성에 따른 우선순위 조정
  if (urgency === 'immediate') {
    responseStart += `⚡ **긴급 상담**: 빠른 처리가 필요한 상황이시군요.\n\n`;
  } else if (urgency === 'planning') {
    responseStart += `📋 **사전 준비**: 계획 단계에서 미리 준비하시는군요.\n\n`;
  }
  
  return responseStart;
}

// 전문 정책 상담 응답 생성 (기본 구조)
export function generateSpecificLoanPolicyResponse(text: string) {
  const t = text.toLowerCase();
  const questionContext = analyzeQuestionContext(text);
  
  // 디딤돌 대출 관련 질문 처리
  if (t.includes("디딤돌")) {
    // 상환방식 관련 구체적 질문인지 확인
    if (isRepaymentTypeQuestion(t)) {
      // 상환방식 계산 로직 (기존과 동일)
      return {
        content: "디딤돌 상환방식 계산 응답",
        cards: null,
        checklist: null
      };
    }
    
    // 일반적인 디딤돌 질문 (자격, 한도, 기간 등) 맥락 기반 처리
    const context = questionContext;
    const contextualStart = generateContextualResponse(context, "디딤돌 대출", {});
    
    return {
      content: contextualStart + "디딤돌 대출 상담 내용",
      cards: null,
      checklist: null
    };
  }
  
  // 보금자리론 생애최초 질문 처리
  if ((t.includes("보금자리") || t.includes("보금자리론")) && t.includes("생애최초")) {
    return {
      content: "보금자리론 생애최초 상담 내용",
      cards: null,
      checklist: null
    };
  }
  
  // 기타 정책 상담 응답들...
  
  return null; // 매칭되지 않는 경우
}
