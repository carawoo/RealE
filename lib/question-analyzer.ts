import { Fields } from './utils';

// 대출 관련 질문인지 확인
export function isLoanScenarioRequest(text: string, profile: Fields): boolean {
  const t = text.toLowerCase();
  
  // 간단한 정보 질문들은 제외
  if (/얼마|몇|어느|뭐|무엇|언제|어디|왜|어떻게/.test(t) && t.length < 20) {
    return false;
  }
  
  // 명시적인 시나리오 요청
  const explicitKeywords = [
    "시나리오", "분석해줘", "계산해줘", "비교해줘", "추천해줘",
    "최대한도", "안전상환", "정책활용", "대출 상품"
  ];
  
  const hasExplicitRequest = explicitKeywords.some(keyword => t.includes(keyword));
  
  // 프로필이 충분히 있는지 확인
  const hasBasicProfile = !!(profile.incomeMonthly && (profile.propertyPrice || profile.cashOnHand));
  
  // 숫자만 나열된 경우 (월소득 500만원, 5억원 집 구입 등) 자동 분석 트리거
  const hasNumbersPattern = /\d+만원|\d+억|\d+천만원/.test(text) && 
                           (text.includes("월소득") || text.includes("소득")) &&
                           (text.includes("집") || text.includes("구입") || text.includes("매매"));
  
  // 1. 명시적 요청이 있고 프로필이 있거나
  // 2. 숫자 패턴이 있고 기본 프로필이 있는 경우
  return (hasExplicitRequest && hasBasicProfile) || (hasNumbersPattern && hasBasicProfile);
}

// 전문 정책 상담 요청인지 확인 (더 포괄적으로 개선)
export function isSpecificLoanPolicyRequest(text: string): boolean {
  const t = text.toLowerCase();
  
  // 핵심 정책 키워드
  const policyKeywords = [
    "디딤돌", "체증식", "원리금균등", "원금균등", "상환방식", "상환 방식",
    "신혼부부", "생애최초", "기금e든든", "모의심사", "고정금리", "변동금리",
    "보금자리론", "보금자리", "ltv", "dsr", "대출규제", "차감", "수도권",
    "버팀목", "청년", "주택금융", "주택담보", "전세자금", "매수", "구입"
  ];
  
  // 일반적인 대출 상담 패턴 (더 포괄적으로)
  const generalLoanPatterns = [
    /대출.*기간/, /신청.*기간/, /얼마.*걸/, /언제.*신청/, /어느.*정도/, /며칠/, /몇.*주/, /몇.*개월/,
    /절차/, /방법/, /과정/, /준비/, /서류/, /조건/, /자격/, /요건/, /한도/, /금리/,
    /어떻게/, /뭐.*필요/, /무엇.*필요/, /처음/, /시작/, /진행/, /받.*방법/,
    /신청.*하/, /받.*수/, /가능.*한/, /됩니까/, /되나요/, /할.*수/, /어디서/,
    /궁금/, /알고.*싶/, /문의/, /상담/, /도움/, /추천/, /선택/, /비교/
  ];
  
  // 대출 관련 용어 (더 포괄적으로)
  const loanTerms = ["대출", "보금자리", "디딤돌", "전세자금", "주택담보", "버팀목", "청년", "신혼부부", "생애최초"];
  
  // 부동산 관련 키워드
  const realEstateTerms = ["주택", "집", "아파트", "매매", "전세", "월세", "임대", "구입", "매수"];
  
  const hasLoanTerm = loanTerms.some(term => t.includes(term));
  const hasPolicyKeyword = policyKeywords.some(keyword => t.includes(keyword));
  const hasGeneralPattern = generalLoanPatterns.some(pattern => pattern.test(t));
  const hasRealEstateTerm = realEstateTerms.some(term => t.includes(term));
  
  // 더 포괄적인 매칭 조건
  return hasPolicyKeyword || 
         (hasLoanTerm && hasGeneralPattern) ||
         (hasLoanTerm && t.length > 5) || // 대출 용어가 있고 5자 이상이면 상담 가능
         (hasRealEstateTerm && hasGeneralPattern); // 부동산 용어 + 일반 패턴
}

// 질문 맥락 분석 (새로 추가된 기능)
export function analyzeQuestionContext(text: string) {
  const t = text.toLowerCase();
  
  // 질문 유형 분석
  let questionType: 'application_process' | 'timeline' | 'requirements' | 'comparison' | 'calculation' | 'troubleshooting' | 'general_info' = 'general_info';
  
  if (/절차|방법|과정|준비|서류|신청.*하|받.*방법/.test(t)) {
    questionType = 'application_process';
  } else if (/기간|얼마.*걸|언제|며칠|몇.*주|몇.*개월|빨리|급해/.test(t)) {
    questionType = 'timeline';
  } else if (/조건|자격|요건|무엇.*필요|뭐.*필요/.test(t)) {
    questionType = 'requirements';
  } else if (/비교|vs|차이|어떤.*더|추천/.test(t)) {
    questionType = 'comparison';
  } else if (/계산|얼마|한도|ltv|dsr|금리/.test(t)) {
    questionType = 'calculation';
  } else if (/문제|오류|안.*되|실패|어려워/.test(t)) {
    questionType = 'troubleshooting';
  }
  
  // 긴급성 분석
  let urgency: 'immediate' | 'planning' | 'research' = 'research';
  if (/급해|빨리|당장|시급|긴급/.test(t)) {
    urgency = 'immediate';
  } else if (/계획|준비|미리|사전/.test(t)) {
    urgency = 'planning';
  }
  
  // 경험 수준 분석
  let experienceLevel: 'first_time' | 'experienced' | 'unknown' = 'unknown';
  if (/처음|첫.*신청|처음.*받|경험.*없/.test(t)) {
    experienceLevel = 'first_time';
  } else if (/이미|받아본|경험.*있|이전.*신청/.test(t)) {
    experienceLevel = 'experienced';
  }
  
  return { questionType, urgency, experienceLevel };
}

// 디딤돌 상환 방식 질문인지 확인
export function isRepaymentTypeQuestion(text: string): boolean {
  const t = text.toLowerCase();
  return /상환.*방식|원리금균등|원금균등|체증식|상환.*종류/.test(t);
}
