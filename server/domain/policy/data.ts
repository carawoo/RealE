// 정부 지원 대출 프로그램 데이터
export interface PolicyProgram {
  id: string;
  name: string;
  description: string;
  maxAmount: number;
  interestRate: number;
  termYears: number;
  conditions: string[];
  requiredDocuments: string[];
  applicationLink: string;
  detailLink: string;
  eligibilityCheckLink: string;
  eligibilityCheck: (userProfile: UserProfile) => boolean;
  priority: number; // 우선순위 (낮을수록 우선)
}

export interface UserProfile {
  age: number;
  income: number;
  isFirstTime: boolean;
  hasChildren: boolean;
  childrenCount: number;
  isNewborn: boolean;
  isMultiChild: boolean;
  propertyPrice: number;
  downPayment: number;
  employmentType: 'employee' | 'freelancer' | 'business';
  creditScore: number;
}

export const POLICY_PROGRAMS: PolicyProgram[] = [
  {
    id: 'didimdol',
    name: '디딤돌대출',
    description: '서민 주거안정을 위한 정책자금 대출',
    maxAmount: 200000000, // 2억원
    interestRate: 2.5,
    termYears: 30,
    conditions: [
      '무주택자 (본인 및 배우자)',
      '소득 기준: 4인 가족 기준 연소득 7천만원 이하',
      '자산 기준: 4인 가족 기준 3억 5천만원 이하',
      '신용등급 6등급 이하',
      '대출 잔액 1억원 이하'
    ],
    requiredDocuments: [
      '소득금액증명원',
      '가족관계증명서',
      '주민등록등본',
      '신용정보조회서',
      '부동산등기부등본'
    ],
    applicationLink: 'https://www.koomco.or.kr/loan/didimdol',
    detailLink: 'https://www.koomco.or.kr/loan/didimdol',
    eligibilityCheckLink: 'https://www.koomco.or.kr/loan/didimdol/eligibility',
    eligibilityCheck: (profile) => {
      return profile.income <= 70000000 && // 연소득 7천만원 이하
             profile.creditScore <= 6 && // 신용등급 6등급 이하
             profile.isFirstTime; // 무주택자
    },
    priority: 1
  },
  {
    id: 'bogeumjari',
    name: '보금자리론',
    description: '생애최초 주택구입자를 위한 특별 대출',
    maxAmount: 300000000, // 3억원
    interestRate: 2.0,
    termYears: 30,
    conditions: [
      '생애최초 주택구입자',
      '소득 기준: 4인 가족 기준 연소득 9천만원 이하',
      '자산 기준: 4인 가족 기준 4억 5천만원 이하',
      '신용등급 7등급 이하',
      '대출 잔액 1억 5천만원 이하'
    ],
    requiredDocuments: [
      '소득금액증명원',
      '가족관계증명서',
      '주민등록등본',
      '신용정보조회서',
      '부동산등기부등본',
      '생애최초 주택구입 확인서'
    ],
    applicationLink: 'https://www.koomco.or.kr/loan/bogeumjari',
    detailLink: 'https://www.koomco.or.kr/loan/bogeumjari',
    eligibilityCheckLink: 'https://www.koomco.or.kr/loan/bogeumjari/eligibility',
    eligibilityCheck: (profile) => {
      return profile.income <= 90000000 && // 연소득 9천만원 이하
             profile.creditScore <= 7 && // 신용등급 7등급 이하
             profile.isFirstTime; // 생애최초
    },
    priority: 2
  },
  {
    id: 'newborn',
    name: '신생아 특례대출',
    description: '신생아 가정을 위한 특별 대출',
    maxAmount: 500000000, // 5억원
    interestRate: 1.5,
    termYears: 30,
    conditions: [
      '2022년 1월 1일 이후 출생한 자녀가 있는 가정',
      '소득 기준: 4인 가족 기준 연소득 1억 2천만원 이하',
      '자산 기준: 4인 가족 기준 6억원 이하',
      '신용등급 8등급 이하',
      '대출 잔액 2억원 이하'
    ],
    requiredDocuments: [
      '소득금액증명원',
      '가족관계증명서',
      '주민등록등본',
      '신용정보조회서',
      '부동산등기부등본',
      '출생증명서'
    ],
    applicationLink: 'https://www.koomco.or.kr/loan/newborn',
    detailLink: 'https://www.koomco.or.kr/loan/newborn',
    eligibilityCheckLink: 'https://www.koomco.or.kr/loan/newborn/eligibility',
    eligibilityCheck: (profile) => {
      return profile.income <= 120000000 && // 연소득 1억 2천만원 이하
             profile.creditScore <= 8 && // 신용등급 8등급 이하
             profile.isNewborn; // 신생아 가정
    },
    priority: 3
  },
  {
    id: 'multichild',
    name: '다자녀 특례대출',
    description: '다자녀 가정을 위한 특별 대출',
    maxAmount: 400000000, // 4억원
    interestRate: 1.8,
    termYears: 30,
    conditions: [
      '자녀 2명 이상 가정',
      '소득 기준: 4인 가족 기준 연소득 1억원 이하',
      '자산 기준: 4인 가족 기준 5억원 이하',
      '신용등급 8등급 이하',
      '대출 잔액 1억 8천만원 이하'
    ],
    requiredDocuments: [
      '소득금액증명원',
      '가족관계증명서',
      '주민등록등본',
      '신용정보조회서',
      '부동산등기부등본',
      '자녀 출생증명서'
    ],
    applicationLink: 'https://www.koomco.or.kr/loan/multichild',
    detailLink: 'https://www.koomco.or.kr/loan/multichild',
    eligibilityCheckLink: 'https://www.koomco.or.kr/loan/multichild/eligibility',
    eligibilityCheck: (profile) => {
      return profile.income <= 100000000 && // 연소득 1억원 이하
             profile.creditScore <= 8 && // 신용등급 8등급 이하
             profile.isMultiChild; // 다자녀 가정
    },
    priority: 4
  }
];

// 사용자 프로필에서 정책 프로그램 매칭
export function findMatchingPrograms(userProfile: UserProfile): PolicyProgram[] {
  return POLICY_PROGRAMS
    .filter(program => program.eligibilityCheck(userProfile))
    .sort((a, b) => a.priority - b.priority);
}

// 프리랜서 소득 증명 방법
export const FREELANCER_INCOME_PROOF = [
  {
    method: '계약서 및 세금계산서',
    description: '현재와 과거 계약서, 세금계산서로 소득 증명',
    requirements: ['계약서', '세금계산서', '사업자등록증명원'],
    difficulty: '쉬움'
  },
  {
    method: '사업자등록증 및 소득신고',
    description: '사업자등록증과 사업소득 신고 내역으로 증명',
    requirements: ['사업자등록증', '종합소득세 신고서', '부가가치세 신고서'],
    difficulty: '보통'
  },
  {
    method: '은행 거래 내역',
    description: '소득 입금 내역으로 정기적인 소득 증명',
    requirements: ['은행 거래내역서', '입금 증빙서류'],
    difficulty: '쉬움'
  },
  {
    method: '카드 매출 내역',
    description: '카드 사용액 2천만원 이상 시 매출 내역으로 증명',
    requirements: ['카드 매출내역서', '사업자등록증'],
    difficulty: '보통'
  }
];

// 금융기관별 대출 상담 연락처
export const FINANCIAL_INSTITUTIONS = [
  {
    name: '주택도시기금',
    phone: '1588-8111',
    website: 'https://www.koomco.or.kr',
    loanPage: 'https://www.koomco.or.kr/loan',
    specialties: ['정책자금', '디딤돌대출', '보금자리론']
  },
  {
    name: '국민은행',
    phone: '1588-9999',
    website: 'https://www.kbstar.com',
    loanPage: 'https://www.kbstar.com/loan',
    specialties: ['주택담보대출', '신용대출', '정책자금']
  },
  {
    name: '신한은행',
    phone: '1599-8000',
    website: 'https://www.shinhan.com',
    loanPage: 'https://www.shinhan.com/loan',
    specialties: ['주택담보대출', '신용대출', '정책자금']
  },
  {
    name: '우리은행',
    phone: '1588-2000',
    website: 'https://www.wooribank.com',
    loanPage: 'https://www.wooribank.com/loan',
    specialties: ['주택담보대출', '신용대출', '정책자금']
  }
];