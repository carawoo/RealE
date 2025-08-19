import { NextRequest, NextResponse } from "next/server";
import { 
  generateLoanScenarios, 
  convertScenarioToCard, 
  LoanInputs,
  formatKRW,
  parseWon,
  analyzeSpecificLoanPolicy,
  REPAYMENT_TYPES,
  formatPercent
} from "../../../lib/loan-calculator";

/**
 * 이 파일은 다음을 해결합니다.
 * - Supabase 저장 전/후 레이스를 없애기 위해, 클라이언트가 보낸 fields와 DB에서 읽은 값을 병합
 * - "숫자만 콤마 포함해서 말해줘"를 결정론으로 처리
 * - 전세→월세(0.3%/월) 간단 환산 제공
 * - 3종 대출 시나리오 생성 및 계산 기능 제공
 * - LLM 파싱 실패 시에도 친절한 폴백 제공("분석에 실패했어요" 제거)
 */

type Role = "user" | "assistant";
type Fields = { 
  incomeMonthly?: number; 
  cashOnHand?: number;
  propertyPrice?: number;
  downPayment?: number;
  loanPeriodYears?: number;
};
type MessageRow = { role: Role; content: string; fields: Fields | null };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ---------- utils ----------
function toComma(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "";
  return n.toLocaleString("ko-KR");
}

function extractFieldsFrom(text: string): Fields {
  const fields: Fields = {};
  
  // 월소득 추출
  const incM =
    text.match(/월\s*소득\s*([0-9억천만,\s]+)원?/i) ||
    text.match(/(?:월소득|소득)\s*([0-9억천만,\s]+)원?/i);
  if (incM?.[1]) {
    const v = parseWon(incM[1] + "원");
    if (v) fields.incomeMonthly = v;
  }
  
  // 보유현금 추출
  const cashM = text.match(/(?:보유\s*현금|현금)\s*([0-9억천만,\s]+)원?/i);
  if (cashM?.[1]) {
    const v = parseWon(cashM[1] + "원");
    if (v) fields.cashOnHand = v;
  }
  
  // 매매가/집값 추출
  const priceM = 
    text.match(/(?:매매가|집값|매물가|부동산가)\s*([0-9억천만,\s]+)원?/i) ||
    text.match(/([0-9억천만,\s]+)원?\s*(?:짜리|집|매물|구입|구매)/i);
  if (priceM?.[1]) {
    const v = parseWon(priceM[1] + "원");
    if (v) fields.propertyPrice = v;
  }
  
  // 계약금/자기자본 추출
  const downM = text.match(/(?:계약금|자기자본|자본금)\s*([0-9억천만,\s]+)원?/i);
  if (downM?.[1]) {
    const v = parseWon(downM[1] + "원");
    if (v) fields.downPayment = v;
  }
  
  // 대출기간 추출
  const periodM = text.match(/(?:대출기간|기간)\s*(\d+)\s*년/i);
  if (periodM?.[1]) {
    const years = parseInt(periodM[1], 10);
    if (years > 0 && years <= 50) fields.loanPeriodYears = years;
  }
  
  return fields;
}

function mergeFields(a?: Fields | null, b?: Fields | null): Fields {
  return {
    incomeMonthly: b?.incomeMonthly ?? a?.incomeMonthly,
    cashOnHand: b?.cashOnHand ?? a?.cashOnHand,
    propertyPrice: b?.propertyPrice ?? a?.propertyPrice,
    downPayment: b?.downPayment ?? a?.downPayment,
    loanPeriodYears: b?.loanPeriodYears ?? a?.loanPeriodYears,
  };
}

function isNumbersOnlyAsk(t: string) {
  return /숫자만\s*콤마\s*포함해서\s*말해줘/.test(t);
}

function isDomain(text: string, current: Fields): boolean {
  const t = text.replace(/\s+/g, "");
  const kw =
    /(전세|월세|보증금|매매|매수|매도|청약|대출|LTV|DSR|특례보금자리|주택|집|아파트|주거비|전월세|임대차|금리)/;
  if (isNumbersOnlyAsk(text)) return !!(current.incomeMonthly || current.cashOnHand);
  if (kw.test(t)) return true;
  if (/(월소득|소득|현금|보유현금|자기자본|자금)/.test(t)) return true;
  return false;
}

// ---------- Supabase ----------
async function fetchConversationProfile(conversationId: string): Promise<Fields> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return {};
  const url =
    `${SUPABASE_URL}/rest/v1/messages` +
    `?select=fields,role,content,created_at` +
    `&conversation_id=eq.${conversationId}` +
    `&order=created_at.asc`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return {};
    const rows: MessageRow[] = await res.json();
    let acc: Fields = {};
    for (const r of rows) {
      if (r?.fields) acc = mergeFields(acc, r.fields);
      if (r.role === "user") acc = mergeFields(acc, extractFieldsFrom(r.content));
    }
    return acc;
  } catch {
    return {};
  }
}

// ---------- replies ----------
function replyNumbersOnly(profile: Fields) {
  const { incomeMonthly: a, cashOnHand: b } = profile;
  if (a && b) return `${a.toLocaleString("ko-KR")} / ${b.toLocaleString("ko-KR")}`;
  if (a) return a.toLocaleString("ko-KR");
  if (b) return b.toLocaleString("ko-KR");
  return "0";
}

function replyJeonseToMonthly(text: string) {
  const deposit = parseWon(text);
  if (!deposit) return null;
  const monthly = Math.round(deposit * 0.003); // 0.3%/월
  return {
    content: `약 ${toComma(monthly)}원`,
    cards: [
      {
        title: "전세→월세 환산(0.3%/월)",
        monthly: `${toComma(monthly)}원`,
        notes: [
          `전세금: ${toComma(deposit)}원`,
          `계산: ${toComma(deposit)} × 0.003 = ${toComma(monthly)}원`,
        ],
      },
    ],
    checklist: ["전환율 지역/물건별 확인", "보증금 반환·보증보험 점검"],
  };
}

// 대출 시나리오 생성 및 응답 처리
function generateLoanScenariosResponse(profile: Fields) {
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

// 대출 관련 질문인지 확인
function isLoanScenarioRequest(text: string, profile: Fields): boolean {
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
function isSpecificLoanPolicyRequest(text: string): boolean {
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

// 최신 대출 정책 데이터 (동적 관리) - 2025년 실제 정책 반영
const CURRENT_LOAN_POLICY = {
  year: 2025,
  lastUpdated: "2025-01-20",
  ltv: {
    bogeumjari: {
      // 수도권 (서울/경기/인천) = 규제지역/조정대상지역
      metro: { apartment: 50, nonApartment: 45 }, // 규제지역: 일반 50%, 아파트외 5%p 차감
      nonMetro: { apartment: 70, nonApartment: 65 } // 비규제지역: 70%, 아파트외 5%p 차감
    },
    firstTime: {
      // 생애최초도 2025년 6월부터 규제 강화
      metro: { apartment: 70, nonApartment: 65 }, // 규제지역: 생애최초 70%, 아파트외 5%p 차감  
      nonMetro: { apartment: 80, nonApartment: 75 } // 비규제지역: 80%, 아파트외 5%p 차감
    }
  },
  dsr: { max: 70, firstTime: 70 },
  maxAmount: {
    bogeumjari: 600_000_000, // 6억 (2025년 절대상한 도입)
    jeonse: 200_000_000      // 2억
  },
  regions: {
    regulated: ['서울', '경기', '인천'], // 규제지역 (조정대상지역/투기과열지구)
    nonRegulated: ['부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']
  }
};

// 최신 정보 확인 알림
function getCurrentPolicyDisclaimer() {
  return `\n\n📌 **정보 업데이트**: ${CURRENT_LOAN_POLICY.lastUpdated} 기준\n` +
         `💡 **최신 정보**: [한국주택금융공사](https://www.hf.go.kr) | [기금e든든](https://www.hf.go.kr/hf/sub02/sub01_05_01.do)\n` +
         `⚠️ 정책 변경 가능성이 있으니 신청 전 반드시 확인하세요.`;
}

// 정책 데이터 업데이트 필요 체크 (개발자용)
function checkPolicyDataFreshness() {
  const now = new Date();
  const lastUpdate = new Date(CURRENT_LOAN_POLICY.lastUpdated);
  const daysDiff = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 30) {
    console.warn(`⚠️ Policy data is ${daysDiff} days old. Consider updating CURRENT_LOAN_POLICY.`);
  }
  
  return daysDiff;
}

// 질문의 맥락과 의도를 분석하는 함수
function analyzeQuestionContext(text: string): {
  questionType: 'application_process' | 'timeline' | 'requirements' | 'comparison' | 'calculation' | 'troubleshooting' | 'general_info';
  urgency: 'immediate' | 'planning' | 'research';
  experienceLevel: 'first_time' | 'experienced' | 'unknown';
  specificConcerns: string[];
} {
  const t = text.toLowerCase();
  
  // 질문 유형 분석
  let questionType: 'application_process' | 'timeline' | 'requirements' | 'comparison' | 'calculation' | 'troubleshooting' | 'general_info' = 'general_info';
  
  if (/절차|과정|방법|어떻게|신청.*방법/.test(t)) {
    questionType = 'application_process';
  } else if (/기간|언제|얼마.*걸|몇.*일|몇.*주|시간/.test(t)) {
    questionType = 'timeline';
  } else if (/조건|자격|요건|필요|준비/.test(t)) {
    questionType = 'requirements';
  } else if (/vs|비교|차이|어떤.*좋|추천/.test(t)) {
    questionType = 'comparison';
  } else if (/계산|한도|얼마|최대|금액/.test(t)) {
    questionType = 'calculation';
  } else if (/문제|오류|안.*돼|실패|거부|연장|만료/.test(t)) {
    questionType = 'troubleshooting';
  }
  
  // 긴급성 분석
  let urgency: 'immediate' | 'planning' | 'research' = 'research';
  if (/급해|빨리|즉시|당장|내일|이번.*주/.test(t) || /만료|연체|문제/.test(t)) {
    urgency = 'immediate';
  } else if (/계획|예정|준비|생각/.test(t)) {
    urgency = 'planning';
  }
  
  // 경험 수준 분석
  let experienceLevel: 'first_time' | 'experienced' | 'unknown' = 'unknown';
  if (/처음|첫.*번|모르|잘.*몰라|초보/.test(t)) {
    experienceLevel = 'first_time';
  } else if (/이미|기존|현재.*받|경험|아는/.test(t)) {
    experienceLevel = 'experienced';
  }
  
  // 구체적 관심사 추출
  const specificConcerns: string[] = [];
  if (/금리/.test(t)) specificConcerns.push('interest_rate');
  if (/서류/.test(t)) specificConcerns.push('documents');
  if (/시간|기간/.test(t)) specificConcerns.push('timeline');
  if (/한도|금액/.test(t)) specificConcerns.push('amount');
  if (/자격|조건/.test(t)) specificConcerns.push('eligibility');
  
  return { questionType, urgency, experienceLevel, specificConcerns };
}

// 맥락에 맞는 개인화된 응답을 생성하는 함수
function generateContextualResponse(context: ReturnType<typeof analyzeQuestionContext>, loanType: string, baseInfo: any): string {
  const { questionType, urgency, experienceLevel, specificConcerns } = context;
  
  let responseStart = "";
  let responseStyle = "";
  
  // 경험 수준에 따른 응답 스타일 조정
  if (experienceLevel === 'first_time') {
    responseStart = `**${loanType} 첫 신청자를 위한 안내** 🔰\n\n`;
    responseStyle = "자세하고 친절한 설명 위주";
  } else if (experienceLevel === 'experienced') {
    responseStart = `**${loanType} 추가 상담** 💼\n\n`;
    responseStyle = "핵심 포인트 위주의 전문적 설명";
  } else {
    responseStart = `**${loanType} 전문 상담** 🏠\n\n`;
    responseStyle = "균형잡힌 전문 상담";
  }
  
  // 긴급성에 따른 우선순위 조정
  if (urgency === 'immediate') {
    responseStart += `⚡ **긴급 상담**: 빠른 처리가 필요한 상황이시군요.\n\n`;
  } else if (urgency === 'planning') {
    responseStart += `📋 **사전 준비**: 계획 단계에서 미리 준비하시는군요.\n\n`;
  }
  
  return responseStart;
}

// 전문 정책 상담 응답 생성
function generateSpecificLoanPolicyResponse(text: string) {
  const t = text.toLowerCase();
  const questionContext = analyzeQuestionContext(text);
  
  // 디딤돌 대출 관련 질문 처리
  if (t.includes("디딤돌")) {
    // 상환방식 관련 구체적 질문인지 확인
    const isRepaymentTypeQuestion = /상환방식|원리금균등|체증식|원금균등/.test(t) ||
                                   (/금리.*\d|계산.*상환|월.*상환.*\d/.test(t) && parseWon(text));
    
    // 상환방식 계산이 필요한 경우에만 기존 로직 사용
    if (isRepaymentTypeQuestion) {
      let loanType = "일반";
      let loanAmount = 250_000_000; // 기본 2.5억
      let repaymentType: "원리금균등" | "체증식" | "원금균등" = "원리금균등";
      
      // 대출 유형 식별
      if (t.includes("신혼부부")) loanType = "신혼부부";
      if (t.includes("생애최초")) loanType = "생애최초";
      
      // 대출 금액 추출
      const amountMatch = parseWon(text);
      if (amountMatch) loanAmount = amountMatch;
      
      // 상환방식 식별
      if (t.includes("체증식")) repaymentType = "체증식";
      if (t.includes("원금균등")) repaymentType = "원금균등";
      
      const analysis = analyzeSpecificLoanPolicy(loanType, loanAmount, repaymentType);
      if (!analysis) {
        return {
          content: "분석에 실패했어요. 다시 시도해 주세요.",
          cards: null,
          checklist: null
        };
      }
      
      const typeInfo = analysis.repaymentType;
      const isGradual = repaymentType === "체증식";
      
      return {
        content: `**디딤돌 ${loanType} 대출 상담** 🏠\n\n` +
                 `${analysis.explanation}\n\n` +
                 `💡 **상환방식별 특징**:\n` +
                 `• ${typeInfo.description}\n` +
                 `• 기본금리: ${formatPercent(analysis.baseRate)}\n` +
                 `• 적용금리: ${formatPercent(analysis.adjustedRate)}` +
                 (isGradual ? ` (체증식 +0.3%p 적용)` : ``) + `\n\n` +
                 `📋 **월 상환액**:\n` +
                 (isGradual ? 
                   `• 초기 ${Math.ceil(5)} 년: 월 ${formatKRW(analysis.payments.initialPayment)}원 (이자만)\n` +
                   `• 이후 기간: 월 ${formatKRW(analysis.payments.finalPayment || 0)}원 (원리금)`
                   :
                   `• 매월: ${formatKRW(analysis.payments.initialPayment)}원`
                 ),
        cards: [{
          title: `디딤돌대출(${loanType}) - ${repaymentType}`,
          subtitle: typeInfo.description,
          monthly: isGradual ? 
            `초기 ${formatKRW(analysis.payments.initialPayment)}원 → 후기 ${formatKRW(analysis.payments.finalPayment || 0)}원` :
            `월 ${formatKRW(analysis.payments.initialPayment)}원`,
          totalInterest: `적용금리 ${formatPercent(analysis.adjustedRate)}`,
          notes: [
            `대출금액: ${formatKRW(loanAmount)}원`,
            `기본금리: ${formatPercent(analysis.baseRate)}`,
            ...(isGradual ? [`체증식 추가금리: +${formatPercent(typeInfo.interestRateAdjustment)}`] : []),
            `최종적용금리: ${formatPercent(analysis.adjustedRate)}`,
            `신청링크: https://www.hf.go.kr`
          ]
        }],
        checklist: [
          "기금e든든에서 최신 금리 재확인",
          "개인 신용상태 및 소득증빙 준비",
          "우대금리 적용 조건 확인 (신혼부부, 생애최초, 청약저축 등)",
          isGradual ? "체증식 선택 시 후반기 상환부담 증가 고려" : "고정금리 vs 변동금리 선택 검토",
          "타 은행 대출 조건과 비교 검토"
        ]
      };
    }
    
    // 일반적인 디딤돌 질문 (자격, 한도, 기간 등) 맥락 기반 처리
    const context = questionContext;
    const contextualStart = generateContextualResponse(context, "디딤돌 대출", {});
    
    let focusArea = "";
    let detailInfo = "";
    
    // 질문 유형별 맞춤 정보
    if (context.questionType === 'timeline') {
      focusArea = `⏰ **처리 시간**:\n` +
                 `• 표준: 2-3주 (서류 완비 기준)\n` +
                 `• 빠른 처리: 기금e든든 사전심사 시 1-2주\n` +
                 `• 복잡한 경우: 최대 4주\n\n`;
    } else if (context.questionType === 'requirements') {
      focusArea = `✅ **자격 조건** (${context.experienceLevel === 'first_time' ? '처음 신청자 중심' : '상세'}):\n` +
                 (context.experienceLevel === 'first_time' ? 
                   `• **핵심 3요소**: 무주택 + 연소득 7천만원 이하 + 주택가격 6억원 이하\n` +
                   `• **무주택 확인**: 본인과 배우자 모두 전국 기준 무주택\n` +
                   `• **소득 계산**: 부부합산 연소득 (전년도 기준)\n` +
                   `• **주택가격**: 실거래가 또는 감정가 기준\n\n`
                   :
                   `• 무주택 세대주 (부부합산 전국 기준)\n` +
                   `• 연소득 7천만원 이하 (부부합산)\n` +
                   `• 주택가격 6억원 이하\n` +
                   `• 생애최초/신혼부부 등 우대조건 추가 확인\n\n`
                 );
    } else if (context.questionType === 'calculation') {
      focusArea = `💰 **대출 한도 및 금리** (${CURRENT_LOAN_POLICY.year}년 기준):\n` +
                 `• 최대한도: ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.bogeumjari)}원\n` +
                 `• LTV 최대: ${Math.max(...Object.values(CURRENT_LOAN_POLICY.ltv.bogeumjari.metro))}% (비규제지역 기준)\n` +
                 `• 현재금리: 연 3.20~4.05% (변동금리)\n` +
                 `• 우대금리: 최대 0.5%p 차감 가능\n\n`;
    }
    
    // 경험 수준별 상세 정보
    if (context.experienceLevel === 'first_time') {
      detailInfo = `📋 **첫 신청자 필수 준비사항**:\n` +
                   `1. 기금e든든에서 모의심사 (자격확인)\n` +
                   `2. 필수서류 준비: 소득증명서, 재직증명서\n` +
                   `3. 추가서류: 주민등록등본, 건보자격확인서\n` +
                   `4. 매물서류: 매매계약서, 등기부등본\n` +
                   `5. 우대조건 확인: 신혼부부, 생애최초 등\n\n`;
    } else if (context.experienceLevel === 'experienced') {
      detailInfo = `🔄 **기존 경험자 체크포인트**:\n` +
                   `• 이전 대출과 DSR 중복 확인\n` +
                   `• 신용등급 변동사항 점검\n` +
                   `• 우대금리 조건 재확인\n` +
                   `• 상환방식 선택 (원리금균등/체증식/원금균등)\n\n`;
    }
    
    const urgencyNote = context.urgency === 'immediate' ? 
      `⚡ **긴급 처리 시**: 모든 서류를 미리 완비하고 기금e든든 모의심사를 완료한 상태에서 은행 방문하세요.\n` :
      ``;
    
    return {
      content: contextualStart +
               focusArea +
               detailInfo +
               urgencyNote +
               getCurrentPolicyDisclaimer(),
      cards: context.questionType === 'calculation' ? [{
        title: "디딤돌 대출 한도 계산",
        subtitle: `최대 ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.bogeumjari)}원`,
        monthly: "연 3.20~4.05%",
        totalInterest: "우대 시 최대 0.5%p 할인",
        notes: [
          `LTV 최대 ${Math.max(...Object.values(CURRENT_LOAN_POLICY.ltv.bogeumjari.metro))}% (지역별 차등)`,
          "무주택 세대주 대상",
          "연소득 7천만원 이하",
          "신혼부부/생애최초 우대",
          "상환방식: 원리금균등/체증식/원금균등"
        ]
      }] : null,
      checklist: context.experienceLevel === 'first_time' ? [
        "무주택 여부 정확히 확인 (전국 기준)",
        "부부합산 연소득 7천만원 이하 확인",
        "기금e든든 모의심사로 사전 자격확인",
        "우대금리 적용 조건 미리 파악"
      ] : [
        "기존 대출 현황 및 DSR 재계산",
        "신용등급 최신 상태 확인",
        "우대금리 조건 변경사항 체크",
        "상환방식별 월 상환액 비교"
      ]
    };
  }
  
  // 보금자리론 생애최초 질문 처리
  if ((t.includes("보금자리") || t.includes("보금자리론")) && t.includes("생애최초")) {
    const isRegulation = t.includes("규제") || t.includes("80%") || t.includes("70%");
    const isNonApartment = t.includes("아파트") && (t.includes("외") || t.includes("다른"));
    const isDeduction = t.includes("차감") || t.includes("5%");
    const isSeoulMetro = t.includes("수도권");
    
    const policy = CURRENT_LOAN_POLICY;
    const metroApt = policy.ltv.firstTime.metro.apartment;
    const metroNonApt = policy.ltv.firstTime.metro.nonApartment;
    const nonMetroApt = policy.ltv.firstTime.nonMetro.apartment;
    
    return {
      content: `**보금자리론 생애최초 대출 상담** 🏠\n\n` +
               `📋 **현재 LTV 한도 (${policy.year}년 기준)**:\n` +
               `• **수도권**: 아파트 ${metroApt}%, 아파트 외 ${metroNonApt}%\n` +
               `• **비수도권**: 아파트 ${nonMetroApt}%, 아파트 외 ${policy.ltv.firstTime.nonMetro.nonApartment}%\n\n` +
               `🏢 **주택유형별 LTV 적용**:\n` +
               `• **아파트**: ${metroApt}% (수도권 기준)\n` +
               `• **아파트 외 주택** (연립, 다세대, 단독): ${metroNonApt}%\n` +
               `  → 아파트 대비 ${metroApt - metroNonApt}%p 차감\n\n` +
               `💡 **생애최초 특례 혜택**:\n` +
               `• 일반 보금자리론 대비 우대 적용\n` +
               `• 최대 ${Math.max(...Object.values(policy.ltv.firstTime.metro), ...Object.values(policy.ltv.firstTime.nonMetro))}% 한도\n` +
               `• DSR ${policy.dsr.firstTime}% 이하 유지 필요\n\n` +
               `⚠️ **주의사항**:\n` +
               `지역 및 주택유형에 따라 LTV 차이가 있으니 정확한 한도는 개별 상담 필요${getCurrentPolicyDisclaimer()}`,
      cards: [{
        title: "보금자리론 생애최초 LTV 한도",
        subtitle: `${policy.year}년 최신 기준`,
        monthly: "수도권 기준",
        totalInterest: `최대 ${metroApt}% (아파트)`,
        notes: [
          `아파트: ${metroApt}% (수도권), ${nonMetroApt}% (비수도권)`,
          `아파트 외: ${metroNonApt}% (수도권), ${policy.ltv.firstTime.nonMetro.nonApartment}% (비수도권)`,
          "생애최초 특례 우대 적용",
          `DSR 최대 ${policy.dsr.firstTime}%`,
          "금리: 연 3.2~4.0% (변동금리)"
        ]
      }],
      checklist: [
        `아파트 vs 아파트 외 주택 LTV 차이 ${metroApt - metroNonApt}%p 확인`,
        `수도권 기준 자기자본 최소 ${100 - metroNonApt}% 준비 (아파트 외)`,
        "생애최초 자격조건 재확인 (무주택 세대주, 소득기준 등)",
        `DSR ${policy.dsr.firstTime}% 이하 유지 가능한지 소득 대비 상환능력 점검`
      ]
    };
  }
  
  // 보금자리론 신청 기간/절차 질문 처리 (맥락 기반)
  if ((t.includes("보금자리") || t.includes("보금자리론")) && 
      (t.includes("기간") || t.includes("신청") || t.includes("절차") || t.includes("얼마") || t.includes("언제"))) {
    
    const context = questionContext;
    const contextualStart = generateContextualResponse(context, "보금자리론", {});
    
    let timelineInfo = "";
    let procedureInfo = "";
    let urgentTips = "";
    
    // 질문 유형에 따른 맞춤 응답
    if (context.questionType === 'timeline') {
      // 시간/기간에 집중한 질문
      if (context.urgency === 'immediate') {
        timelineInfo = `⚡ **긴급 신청 시**:\n` +
                      `• 서류 완비 시 최단 **2주** 가능\n` +
                      `• 모든 서류를 미리 준비하고 은행 방문\n` +
                      `• 기금e든든 사전심사로 1-2일 단축\n\n`;
      } else {
        timelineInfo = `📅 **표준 처리기간**:\n` +
                      `• 일반적으로 **2-3주 소요** (서류 완비 기준)\n` +
                      `• 계절별 차이: 연말/연초 더 오래 걸림\n` +
                      `• 심사 복잡도에 따라 1-4주 범위\n\n`;
      }
    } else if (context.questionType === 'application_process') {
      // 절차/과정에 집중한 질문
      procedureInfo = `🔄 **신청 절차** (${context.experienceLevel === 'first_time' ? '처음 신청자용' : '상세 단계'}):\n` +
                     (context.experienceLevel === 'first_time' ? 
                       `1️⃣ **사전 준비**: 소득증명서, 재직증명서 준비\n` +
                       `2️⃣ **자격 확인**: 기금e든든에서 모의심사\n` +
                       `3️⃣ **은행 선택**: 우대금리 조건 비교\n` +
                       `4️⃣ **서류 제출**: 취급은행 방문 신청\n` +
                       `5️⃣ **심사 대기**: 3-7일 소요\n` +
                       `6️⃣ **승인 후 실행**: 계약 및 실행\n\n`
                       :
                       `• 서류 접수 → 심사 → 승인 → 실행\n` +
                       `• 각 단계별 3-7일 소요\n` +
                       `• 병행 가능: 모의심사와 서류준비\n\n`
                     );
    }
    
    // 긴급성에 따른 팁
    if (context.urgency === 'immediate') {
      urgentTips = `🚀 **빠른 진행 필수 팁**:\n` +
                   `• 모든 서류를 사전에 완벽 준비\n` +
                   `• 기금e든든 모의심사 먼저 완료\n` +
                   `• 은행에 미리 전화로 빠른 처리 요청\n` +
                   `• 오전 일찍 방문하여 당일 접수\n\n`;
    } else if (context.experienceLevel === 'first_time') {
      urgentTips = `💡 **첫 신청자 꿀팁**:\n` +
                   `• 기금e든든에서 사전 모의심사 필수\n` +
                   `• 여러 은행 조건 비교 후 선택\n` +
                   `• 서류 부족 시 재방문 하지 않도록 체크리스트 확인\n` +
                   `• 우대금리 조건(신혼부부, 생애최초) 미리 확인\n\n`;
    }
    
    const seasonalNote = new Date().getMonth() >= 10 || new Date().getMonth() <= 1 ? 
      `⚠️ **연말연초 주의**: 현재 신청이 몰리는 시기로 평소보다 1-2주 더 걸릴 수 있어요.\n` :
      `📊 **현재 상황**: 비교적 원활한 처리 시기입니다.\n`;
    
    return {
      content: contextualStart +
               timelineInfo +
               procedureInfo +
               urgentTips +
               seasonalNote +
               getCurrentPolicyDisclaimer(),
      
      cards: [{
        title: `보금자리론 ${context.questionType === 'timeline' ? '처리기간' : '신청절차'}`,
        subtitle: context.urgency === 'immediate' ? "긴급처리 가이드" : "표준 프로세스",
        monthly: context.urgency === 'immediate' ? "최단 2주" : "표준 2-3주",
        totalInterest: "연중 상시 접수",
        notes: context.urgency === 'immediate' ? [
          "모든 서류 사전 완비 필수",
          "기금e든든 모의심사 완료",
          "은행 사전 연락 후 방문",
          "최단 2주, 통상 2-3주 소요"
        ] : [
          "1단계: 서류준비 (1-3일)",
          "2단계: 신청접수 (1일)", 
          "3단계: 심사완료 (5-10일)",
          "4단계: 승인·실행 (3-5일)",
          "사전 모의심사 권장"
        ]
      }],
      
      checklist: context.experienceLevel === 'first_time' ? [
        "무주택 세대주 자격 확인",
        "연소득 7천만원 이하 확인",
        "소득증명서, 재직증명서 준비",
        "기금e든든 모의심사 완료"
      ] : [
        "필수서류 완비 상태 점검",
        "우대금리 적용 조건 재확인",
        "취급은행별 처리기간 문의",
        "신용등급 및 DSR 사전 점검"
      ]
    };
  }
  
  // LTV/DSR 한도 추정 및 구체적 계산 요청 (최우선 처리)
  if (/ltv.*dsr|dsr.*ltv/i.test(t) && (/한도|추정|계산|얼마/.test(t))) {
    return {
      content: `**LTV/DSR 한도 정확 계산** 💰\n\n` +
               `정확한 한도 계산을 위해 다음 정보를 알려주세요:\n\n` +
               `🏠 **필수 정보**:\n` +
               `• 월소득: "월소득 500만원"\n` +
               `• 매물가격: "5억원 아파트"\n` +
               `• 지역: "서울" 또는 "부산" 등\n` +
               `• 대상: "생애최초" 또는 "일반"\n\n` +
               `💡 **예시**: "월소득 500만원, 서울 5억원 아파트 생애최초 LTV DSR 한도 계산해줘"\n\n` +
               `📊 **즉시 계산 제공**:\n` +
               `• LTV 한도: 지역/유형별 정확한 비율\n` +
               `• DSR 한도: 소득 대비 상환능력\n` +
               `• 최대 대출금액: 구체적 금액\n` +
               `• 월상환액: 상환방식별 시뮬레이션${getCurrentPolicyDisclaimer()}`,
      cards: [{
        title: "LTV/DSR 한도 계산기",
        subtitle: "전문가 수준 정확한 계산",
        monthly: "즉시 계산 제공",
        totalInterest: "맞춤형 시뮬레이션",
        notes: [
          "실시간 LTV 비율 적용",
          "DSR 70% 기준 상환능력 분석", 
          "지역별/대상별 우대조건 반영",
          "3가지 상환방식 비교",
          "월상환액 정확 계산"
        ]
      }],
      checklist: [
        "월소득 정확한 금액 확인",
        "매물 지역 및 유형(아파트/아파트외) 파악",
        "생애최초/신혼부부 등 우대조건 확인",
        "기존 대출 잔액 및 DSR 영향 요소 점검"
      ]
    };
  }
  
  // 구체적 한도 질문 (지역+금액 포함)
  if (/(\d+억|\d+만원)/.test(t) && (/한도|얼마|최대|대출/.test(t)) && 
      /(서울|경기|인천|부산|대구|생애최초|아파트)/.test(t)) {
    
    const isFirstTime = t.includes("생애최초");
    const isMetro = /(서울|경기|인천)/.test(t);
    const isApartment = t.includes("아파트") && !t.includes("외");
    
    const policy = CURRENT_LOAN_POLICY;
    const ltvData = isFirstTime ? policy.ltv.firstTime : policy.ltv.bogeumjari;
    const regionData = isMetro ? ltvData.metro : ltvData.nonMetro;
    const ltvRate = isApartment ? regionData.apartment : regionData.nonApartment;
    
    // 매물가격 추출 시도
    const priceMatch = t.match(/(\d+)억/);
    const propertyPrice = priceMatch ? parseInt(priceMatch[1]) * 100_000_000 : null;
    const maxLoanAmount = propertyPrice ? Math.min(propertyPrice * (ltvRate / 100), policy.maxAmount.bogeumjari) : null;
    
    return {
      content: `**정확한 대출 한도 계산** 🎯\n\n` +
               `📍 **지역**: ${isMetro ? '수도권 규제지역' : '비규제지역'}\n` +
               `🏠 **유형**: ${isApartment ? '아파트' : '아파트 외 주택'}\n` +
               `👤 **대상**: ${isFirstTime ? '생애최초 특례' : '일반'}\n\n` +
               `📊 **LTV 한도**: ${ltvRate}%\n` +
               (propertyPrice ? 
                 `💰 **최대 대출금액**: ${formatKRW(maxLoanAmount)}원\n` +
                 `   (매물가 ${formatKRW(propertyPrice)}원 × ${ltvRate}%)\n\n`
                 : 
                 `💰 **한도 계산**: 매물가 × ${ltvRate}%\n\n`
               ) +
               `⚠️ **추가 고려사항**:\n` +
               `• DSR ${policy.dsr.max}% 이하 (소득 대비 상환능력)\n` +
               `• 절대상한: ${formatKRW(policy.maxAmount.bogeumjari)}원\n` +
               `• 소득증빙 및 신용도 심사 필요\n\n` +
               `📞 **정확한 월상환액 계산**을 원하시면:\n` +
               `"월소득 000만원" 정보를 추가로 알려주세요.${getCurrentPolicyDisclaimer()}`,
      cards: [{
        title: `${isFirstTime ? '생애최초' : '일반'} 대출 한도`,
        subtitle: `${isMetro ? '수도권' : '지방'} ${isApartment ? '아파트' : '아파트외'}`,
        monthly: maxLoanAmount ? formatKRW(maxLoanAmount) + "원" : `${ltvRate}% 적용`,
        totalInterest: `LTV ${ltvRate}%`,
        notes: [
          `지역: ${isMetro ? '서울/경기/인천 (규제지역)' : '기타 지역'}`,
          `주택유형: ${isApartment ? '아파트' : '아파트 외 (5%p 차감)'}`,
          `LTV 한도: ${ltvRate}%`,
          `절대상한: ${formatKRW(policy.maxAmount.bogeumjari)}원`,
          `DSR 상한: ${policy.dsr.max}%`
        ]
      }],
      checklist: [
        "매물가격 및 정확한 주소 확인", 
        "월소득 및 기존 대출 현황 파악",
        "생애최초/신혼부부 자격 요건 확인",
        "신용등급 및 소득증빙 서류 준비"
      ]
    };
  }
  
  // 일반적인 대출 질문 처리 (기간, 조건, 절차 등) - 위의 구체적 질문들 이후에 처리
  if (/대출.*기간|신청.*기간|얼마.*걸|언제.*신청/.test(t) ||
      /절차|방법|과정|준비|서류/.test(t) ||
      (/조건|자격|요건/.test(t) && !/한도/.test(t)) ||
      (/금리/.test(t) && !/계산|추정/.test(t))) {
    
    // 디딤돌 대출 관련 맞춤 답변 (맥락 기반)
    if (t.includes("디딤돌")) {
      const context = questionContext;
      const contextualStart = generateContextualResponse(context, "디딤돌 대출", {});
      
      let focusArea = "";
      let detailInfo = "";
      
      // 질문 유형별 맞춤 정보
      if (context.questionType === 'timeline') {
        focusArea = `⏰ **처리 시간**:\n` +
                   `• 표준: 2-3주 (서류 완비 기준)\n` +
                   `• 빠른 처리: 기금e든든 사전심사 시 1-2주\n` +
                   `• 복잡한 경우: 최대 4주\n\n`;
      } else if (context.questionType === 'requirements') {
        focusArea = `✅ **자격 조건** (${context.experienceLevel === 'first_time' ? '처음 신청자 중심' : '상세'}):\n` +
                   (context.experienceLevel === 'first_time' ? 
                     `• **핵심 3요소**: 무주택 + 연소득 7천만원 이하 + 주택가격 6억원 이하\n` +
                     `• **무주택 확인**: 본인과 배우자 모두 전국 기준 무주택\n` +
                     `• **소득 계산**: 부부합산 연소득 (전년도 기준)\n` +
                     `• **주택가격**: 실거래가 또는 감정가 기준\n\n`
                     :
                     `• 무주택 세대주 (부부합산 전국 기준)\n` +
                     `• 연소득 7천만원 이하 (부부합산)\n` +
                     `• 주택가격 6억원 이하\n` +
                     `• 생애최초/신혼부부 등 우대조건 추가 확인\n\n`
                   );
      } else if (context.questionType === 'calculation') {
        focusArea = `💰 **대출 한도 및 금리** (${CURRENT_LOAN_POLICY.year}년 기준):\n` +
                   `• 최대한도: ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.bogeumjari)}원\n` +
                   `• LTV 최대: ${Math.max(...Object.values(CURRENT_LOAN_POLICY.ltv.bogeumjari.metro))}% (비규제지역 기준)\n` +
                   `• 현재금리: 연 3.20~4.05% (변동금리)\n` +
                   `• 우대금리: 최대 0.5%p 차감 가능\n\n`;
      }
      
      // 경험 수준별 상세 정보
      if (context.experienceLevel === 'first_time') {
        detailInfo = `📋 **첫 신청자 필수 준비사항**:\n` +
                     `1. 기금e든든에서 모의심사 (자격확인)\n` +
                     `2. 필수서류 준비: 소득증명서, 재직증명서\n` +
                     `3. 추가서류: 주민등록등본, 건보자격확인서\n` +
                     `4. 매물서류: 매매계약서, 등기부등본\n` +
                     `5. 우대조건 확인: 신혼부부, 생애최초 등\n\n`;
      } else if (context.experienceLevel === 'experienced') {
        detailInfo = `🔄 **기존 경험자 체크포인트**:\n` +
                     `• 이전 대출과 DSR 중복 확인\n` +
                     `• 신용등급 변동사항 점검\n` +
                     `• 우대금리 조건 재확인\n` +
                     `• 상환방식 선택 (원리금균등/체증식/원금균등)\n\n`;
      }
      
      const urgencyNote = context.urgency === 'immediate' ? 
        `⚡ **긴급 처리 시**: 모든 서류를 미리 완비하고 기금e든든 모의심사를 완료한 상태에서 은행 방문하세요.\n` :
        ``;
      
      return {
        content: contextualStart +
                 focusArea +
                 detailInfo +
                 urgencyNote +
                 getCurrentPolicyDisclaimer(),
        cards: context.questionType === 'calculation' ? [{
          title: "디딤돌 대출 한도 계산",
          subtitle: `최대 ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.bogeumjari)}원`,
          monthly: "연 3.20~4.05%",
          totalInterest: "우대 시 최대 0.5%p 할인",
          notes: [
            `LTV 최대 ${Math.max(...Object.values(CURRENT_LOAN_POLICY.ltv.bogeumjari.metro))}% (지역별 차등)`,
            "무주택 세대주 대상",
            "연소득 7천만원 이하",
            "신혼부부/생애최초 우대",
            "상환방식: 원리금균등/체증식/원금균등"
          ]
        }] : null,
        checklist: context.experienceLevel === 'first_time' ? [
          "무주택 여부 정확히 확인 (전국 기준)",
          "부부합산 연소득 7천만원 이하 확인",
          "기금e든든 모의심사로 사전 자격확인",
          "우대금리 적용 조건 미리 파악"
        ] : [
          "기존 대출 현황 및 DSR 재계산",
          "신용등급 최신 상태 확인",
          "우대금리 조건 변경사항 체크",
          "상환방식별 월 상환액 비교"
        ]
      };
    }
    
    // 일반 대출 질문 (맥락 기반 응답)
    const context = questionContext;
    const contextualStart = generateContextualResponse(context, "주택금융 대출", {});
    
    let productRecommendation = "";
    let processInfo = "";
    let timelineInfo = "";
    
    // 질문 유형별 맞춤 정보
    if (context.questionType === 'timeline') {
      timelineInfo = `⏰ **처리 기간** (${context.urgency === 'immediate' ? '긴급 시' : '일반적'}):\n` +
                    (context.urgency === 'immediate' ? 
                      `• 최단: 1-2주 (모든 서류 완비 + 사전심사 완료)\n` +
                      `• 일반: 2-3주 (표준 처리)\n` +
                      `• 복잡: 3-4주 (추가 서류 또는 심사 지연)\n\n`
                      :
                      `• 일반적으로 2-4주 소요\n` +
                      `• 서류 완비 시 단축 가능\n` +
                      `• 연말/연초에는 더 오래 걸림\n\n`
                    );
    } else if (context.questionType === 'application_process') {
      processInfo = `📋 **신청 절차** (${context.experienceLevel === 'first_time' ? '처음 신청자용' : '일반'}):\n` +
                   (context.experienceLevel === 'first_time' ?
                     `1️⃣ **상품 선택**: 목적에 맞는 대출 상품 결정\n` +
                     `2️⃣ **자격 확인**: 각 상품별 자격 요건 체크\n` +
                     `3️⃣ **서류 준비**: 소득증명서 등 필수서류\n` +
                     `4️⃣ **사전 심사**: 기금e든든 모의심사\n` +
                     `5️⃣ **은행 선택**: 금리 조건 비교\n` +
                     `6️⃣ **정식 신청**: 방문 또는 온라인 신청\n\n`
                     :
                     `• 신청 → 심사 → 승인 → 실행\n` +
                     `• 각 단계별 평균 3-7일 소요\n` +
                     `• 병행 처리 가능한 부분 활용\n\n`
                   );
    }
    
    // 경험 수준별 상품 추천
    if (context.experienceLevel === 'first_time') {
      productRecommendation = `💡 **첫 신청자 맞춤 상품 추천**:\n` +
                             `• **디딤돌 대출**: 무주택자 구입자금 (최대 ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.bogeumjari)}원)\n` +
                             `• **보금자리론**: 생애최초/신혼부부 특례 (LTV 우대)\n` +
                             `• **버팀목 전세자금**: 전세보증금 대출 (최대 ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.jeonse)}원)\n\n` +
                             `🎯 **선택 기준**: 구입 vs 전세, 나이/혼인상태, 소득수준\n\n`;
    } else {
      productRecommendation = `💼 **주요 대출 상품 비교**:\n` +
                             `• 구입자금: 디딤돌, 보금자리론\n` +
                             `• 전세자금: 버팀목, 청년전용\n` +
                             `• 특례상품: 신혼부부, 생애최초\n\n`;
    }
    
    const urgencyTips = context.urgency === 'immediate' ? 
      `🚀 **긴급 처리 팁**:\n` +
      `• 모든 서류를 미리 완벽하게 준비\n` +
      `• 기금e든든에서 사전 모의심사 완료\n` +
      `• 여러 은행에 동시 문의로 빠른 처리\n` +
      `• 오전 일찍 방문하여 당일 접수 완료\n\n`
      : 
      `🏃‍♂️ **효율적 진행 팁**:\n` +
      `서류 미리 준비 → 사전 모의심사 → 은행 방문\n\n`;
    
    return {
      content: contextualStart +
               timelineInfo +
               processInfo +
               productRecommendation +
               urgencyTips +
               getCurrentPolicyDisclaimer(),
      cards: context.experienceLevel === 'first_time' ? [{
        title: "첫 대출 신청자 가이드",
        subtitle: "단계별 완벽 준비",
        monthly: "상품별 맞춤 추천",
        totalInterest: "우대조건 최대 활용",
        notes: [
          "1단계: 목적별 상품 선택",
          "2단계: 자격 요건 확인",
          "3단계: 필수서류 준비",
          "4단계: 사전심사 완료",
          "5단계: 은행별 조건 비교"
        ]
      }] : null,
      checklist: context.experienceLevel === 'first_time' ? [
        "대출 목적 명확히 정하기 (구입/전세/담보)",
        "나이, 혼인상태, 소득 기준 특례상품 확인",
        "기금e든든에서 상품별 모의심사",
        "필수서류 체크리스트 만들어 준비"
      ] : [
        "기존 대출 현황 및 DSR 영향 확인",
        "신용등급 최신 상태 점검",
        "상품별 금리 및 한도 비교",
        "우대조건 변경사항 재확인"
      ]
    };
  }
  
  // 상환방식 비교 요청
  if (t.includes("상환방식") || t.includes("상환 방식")) {
    return {
      content: `**대출 상환방식 비교** 📊\n\n` +
               `디딤돌 대출에서 선택 가능한 3가지 상환방식을 비교해 드려요.\n\n` +
               `💡 **중요**: 체증식 선택 시 고정금리에 0.3%p가 추가됩니다.`,
      cards: REPAYMENT_TYPES.map(type => ({
        title: type.type,
        subtitle: type.description,
        monthly: type.type === "체증식" ? "초기 부담 ↓ → 후기 부담 ↑" : 
                type.type === "원금균등" ? "초기 부담 ↑ → 후기 부담 ↓" : "매월 동일",
        totalInterest: type.interestRateAdjustment > 0 ? `금리 +${formatPercent(type.interestRateAdjustment)}` : "기본금리",
        notes: [
          `특징: ${type.description}`,
          `금리조정: ${type.interestRateAdjustment > 0 ? `+${formatPercent(type.interestRateAdjustment)}` : '없음'}`,
          ...type.advantages.map(adv => `✅ ${adv}`),
          ...type.considerations.map(con => `⚠️ ${con}`)
        ]
      })),
      checklist: [
        "초기 현금흐름 vs 총 이자비용 고려",
        "미래 소득증가 계획 반영",
        "체증식 선택 시 금리 0.3%p 추가 비용 계산",
        "가계 예산 및 재정 계획에 맞는 방식 선택"
      ]
    };
  }
  
  return null;
}

// ---------- 맥락 기반 질문 처리 ----------
function handleContextualQuestion(message: string, profile: Fields): { content: string; cards: null; checklist: null } | null {
  const msg = message.toLowerCase();
  
  // 소득 관련 질문
  if (/소득|월급|연봉|급여/.test(msg) && /얼마|몇|어느/.test(msg)) {
    if (profile.incomeMonthly) {
      return {
        content: `월소득은 ${profile.incomeMonthly.toLocaleString("ko-KR")}원이었어요.`,
        cards: null,
        checklist: null
      };
    }
  }
  
  // 자기자본/현금 관련 질문
  if (/자기자본|현금|돈|자금/.test(msg) && /얼마|몇|어느/.test(msg)) {
    if (profile.cashOnHand || profile.downPayment) {
      const amount = profile.cashOnHand || profile.downPayment;
      return {
        content: `자기자본은 ${amount.toLocaleString("ko-KR")}원이었어요.`,
        cards: null,
        checklist: null
      };
    }
  }
  
  // 집값/매매가 관련 질문
  if (/집값|매매가|주택가격|가격/.test(msg) && /얼마|몇|어느/.test(msg)) {
    if (profile.propertyPrice) {
      return {
        content: `매매가는 ${profile.propertyPrice.toLocaleString("ko-KR")}원이었어요.`,
        cards: null,
        checklist: null
      };
    }
  }
  
  // 전체 정보 요약 질문
  if (/정보|내용|요약|다시|다시|뭐/.test(msg) && (/말|설명|알려/.test(msg) || /였/.test(msg))) {
    const parts: string[] = [];
    if (profile.incomeMonthly) parts.push(`월소득: ${profile.incomeMonthly.toLocaleString("ko-KR")}원`);
    if (profile.cashOnHand) parts.push(`자기자본: ${profile.cashOnHand.toLocaleString("ko-KR")}원`);
    if (profile.propertyPrice) parts.push(`매매가: ${profile.propertyPrice.toLocaleString("ko-KR")}원`);
    
    if (parts.length > 0) {
      return {
        content: `지금까지 알려주신 정보는 다음과 같아요:\n\n${parts.join("\n")}\n\n추가로 궁금한 점이 있으시면 말씀해 주세요!`,
        cards: null,
        checklist: null
      };
    }
  }
  
  // 대출 추천 질문
  if (/추천|좋은|어떤/.test(msg) && /대출|상품/.test(msg)) {
    if (profile.incomeMonthly && profile.propertyPrice) {
      return {
        content: `말씀해주신 조건으로 다시 대출 시나리오를 분석해드릴게요. 구체적인 분석을 원하시면 "대출 시나리오 분석해줘" 라고 말씀해 주세요.`,
        cards: null,
        checklist: null
      };
    }
  }
  
  return null;
}

// ---------- 정책 문서 요약 처리 ----------
async function handlePolicySummaryRequest(message: string): Promise<{ content: string; cards: null; checklist: null } | null> {
  // 정책 요약 요청 패턴 감지
  const summaryIndicators = [
    "요약해줘", "정리해줘", "5줄 요약", "핵심만", "간단히",
    "정책.*요약", "보도자료.*요약", "발표.*요약"
  ];
  
  const hasSummaryRequest = summaryIndicators.some(pattern => 
    new RegExp(pattern, 'i').test(message)
  );

  // 긴 텍스트 (500자 이상)는 자동으로 요약 대상으로 간주
  const isLongText = message.length > 500;

  if (!hasSummaryRequest && !isLongText) {
    return null;
  }

  try {
    // 내부 요약 API 호출
    const response = await fetch('http://localhost:3000/api/policy-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });

    const data = await response.json();
    
    if (data.ok && data.summary) {
      return {
        content: `📋 **정책 문서 5줄 요약**\n\n${data.summary.join('\n')}\n\n📊 **요약 정보**\n- 원본 길이: ${data.originalLength.toLocaleString()}자\n- 요약 문장: ${data.summaryLines}줄`,
        cards: null,
        checklist: null
      };
    }
  } catch (error) {
    console.error('Policy summary request failed:', error);
  }

  return null;
}

// ---------- route ----------
export async function POST(req: NextRequest) {
  try {
    const { message, conversationId, fields: fieldsFromClient } = await req.json();

    const prev = conversationId ? await fetchConversationProfile(conversationId) : {};
    const merged: Fields = mergeFields(prev, fieldsFromClient ?? extractFieldsFrom(message ?? ""));

    if (isNumbersOnlyAsk(message)) {
      return NextResponse.json({ content: replyNumbersOnly(merged), cards: null, checklist: null });
    }

    // 대화 맥락 기반 질문 처리 (우선순위 높음)
    const contextResponse = handleContextualQuestion(message, merged);
    if (contextResponse) {
      return NextResponse.json(contextResponse);
    }

    // 정책 문서 요약 요청 처리
    const policyResponse = await handlePolicySummaryRequest(message);
    if (policyResponse) {
      return NextResponse.json(policyResponse);
    }

    // 전문 정책 상담 요청 확인
    if (isSpecificLoanPolicyRequest(message)) {
      const response = generateSpecificLoanPolicyResponse(message);
      if (response) {
        return NextResponse.json(response);
      }
    }

    // 대출 시나리오 요청 확인
    if (isLoanScenarioRequest(message, merged)) {
      const response = generateLoanScenariosResponse(merged);
      return NextResponse.json(response);
    }

    // 전세/월세 비교 분석 (전문가 수준)
    if (/전세.*월세.*비교|월세.*전세.*비교|전세.*vs.*월세|월세.*vs.*전세/.test(message) ||
        (/전세.*\d+/.test(message) && /월세.*\d+/.test(message)) ||
        (/보증금.*\d+/.test(message) && /월세.*\d+/.test(message))) {
      
      // 숫자 추출
      const jeonseMatch = message.match(/전세\s*(\d+[\d천만억,\s]*)|(\d+[\d천만억,\s]*)\s*전세/);
      const monthlyMatch = message.match(/월세\s*(\d+[\d천만,\s]*)|(\d+[\d천만,\s]*)\s*월세/);
      const depositMatch = message.match(/보증금\s*(\d+[\d천만억,\s]*)|(\d+[\d천만억,\s]*)\s*보증금/);
      
      const jeonseAmount = jeonseMatch ? parseWon((jeonseMatch[1] || jeonseMatch[2]) + "원") : null;
      const monthlyRent = monthlyMatch ? parseWon((monthlyMatch[1] || monthlyMatch[2]) + "원") : null;
      const depositAmount = depositMatch ? parseWon((depositMatch[1] || depositMatch[2]) + "원") : null;
      
      if (jeonseAmount && (monthlyRent || depositAmount)) {
        // 전문가 수준 비교 분석
        const standardRate = 0.003; // 표준 전환율 0.3%/월
        const impliedMonthly = jeonseAmount * standardRate;
        const actualMonthly = monthlyRent || 0;
        const actualDeposit = depositAmount || 0;
        
        // 연간 비용 계산
        const jeonseYearlyCost = jeonseAmount * standardRate * 12; // 기회비용
        const monthlyYearlyCost = (actualMonthly * 12) + (actualDeposit * standardRate * 12);
        
        const isJeonseBetter = jeonseYearlyCost < monthlyYearlyCost;
        const difference = Math.abs(jeonseYearlyCost - monthlyYearlyCost);
        
        return NextResponse.json({
          content: `**전세 vs 월세 전문 비교 분석** 📊\n\n` +
                   `🏠 **조건 비교**:\n` +
                   `• 전세: ${formatKRW(jeonseAmount)}원\n` +
                   (monthlyRent ? `• 월세: 보증금 ${formatKRW(actualDeposit)}원 + 월 ${formatKRW(monthlyRent)}원\n\n` : '\n') +
                   
                   `💰 **연간 총비용 분석** (기회비용 3.6% 적용):\n` +
                   `• 전세 연간비용: ${formatKRW(Math.round(jeonseYearlyCost))}원\n` +
                   (monthlyRent ? `• 월세 연간비용: ${formatKRW(Math.round(monthlyYearlyCost))}원\n` : '') +
                   `• 차이: ${formatKRW(Math.round(difference))}원\n\n` +
                   
                   `🎯 **전문가 추천**: ${isJeonseBetter ? '전세' : '월세'}가 유리\n` +
                   `💡 **절약효과**: 연간 약 ${formatKRW(Math.round(difference))}원\n\n` +
                   
                   `📈 **시장 분석**:\n` +
                   `• 표준 전환율: 월 0.3% (연 3.6%)\n` +
                   `• 실제 전환율: 월 ${((actualMonthly / (jeonseAmount - actualDeposit)) * 100).toFixed(2)}%\n` +
                   `• 시장 대비: ${((actualMonthly / (jeonseAmount - actualDeposit)) / standardRate) > 1 ? '높음' : '낮음'}\n\n` +
                   
                   `⚠️ **추가 고려사항**:\n` +
                   `• 전세: 보증금 반환 리스크, 전세보증보험 필수\n` +
                   `• 월세: 임대료 인상 가능성, 현금흐름 부담\n` +
                   `• 세제혜택: 월세세액공제 vs 전세자금대출 소득공제`,
          
          cards: [{
            title: "전세 vs 월세 비교 결과",
            subtitle: `${isJeonseBetter ? '전세' : '월세'} 추천 (연 ${formatKRW(Math.round(difference))}원 절약)`,
            monthly: `전세 ${formatKRW(Math.round(jeonseYearlyCost/12))}원/월`,
            totalInterest: `월세 ${formatKRW(Math.round(monthlyYearlyCost/12))}원/월`,
            notes: [
              `전세금: ${formatKRW(jeonseAmount)}원`,
              `월세: ${formatKRW(actualDeposit)}원 + ${formatKRW(monthlyRent)}원`,
              `기회비용율: 연 3.6% 적용`,
              `${isJeonseBetter ? '전세가 연간 ' + formatKRW(Math.round(difference)) + '원 유리' : '월세가 연간 ' + formatKRW(Math.round(difference)) + '원 유리'}`,
              "세제혜택 및 리스크 별도 고려 필요"
            ]
          }],
          
          checklist: [
            "전세보증보험 가입 (전세 선택 시)",
            "임대인 신용도 및 건물 상태 확인", 
            "월세세액공제 대상 여부 확인 (연 750만원 한도)",
            "향후 3-5년 거주계획 및 이사 비용 고려"
          ]
        });
      }
      
      // 정보 부족 시 안내
      return NextResponse.json({
        content: `**전세 vs 월세 비교 분석** 📊\n\n` +
                 `정확한 비교 분석을 위해 다음 정보를 알려주세요:\n\n` +
                 `💡 **예시**:\n` +
                 `"전세 2억5천 vs 보증금 3천만원 월세 90만원 비교"\n` +
                 `"전세 3억 vs 월세 120만원 비교"\n\n` +
                 `📊 **제공 분석**:\n` +
                 `• 연간 총비용 비교 (기회비용 포함)\n` +
                 `• 시장 전환율 대비 유불리\n` +
                 `• 세제혜택 및 리스크 분석\n` +
                 `• 상황별 맞춤 추천`,
        cards: null,
        checklist: ["전세금액 확인", "월세 및 보증금 확인", "거주 예정기간 고려", "현금흐름 계획 수립"]
      });
    }
    
    // 단순 전세→월세 환산 (기존 기능 유지)
    if (/전세.*월세.*환산|월세.*환산/.test(message) && !/비교/.test(message)) {
      const r = replyJeonseToMonthly(message);
      if (r) return NextResponse.json(r);
    }

    // 중기청 대출 관련 질문 처리 (맥락별 전문 상담)
    if (/중기청.*100|중기청.*대출|중기청.*전세/.test(message)) {
      const t = message.toLowerCase();
      
      // 기존 이용자 관련 질문들 (연장, 상환, 문제 상황)
      if (/이용.*중|받고.*있|기존|현재.*대출|연장|상환|반환|만료|허그|hug|집주인/.test(t)) {
        
        // HUG 대위변제 관련 질문
        if (/허그|hug|대위변제|집주인.*반환|반환.*거부/.test(t)) {
          return NextResponse.json({
            content: `**중기청 대출 HUG 대위변제 상담** 🏠\n\n` +
                     `현재 집주인이 전세금 반환을 거부하는 상황이시군요. 이런 경우 다음과 같은 절차로 진행됩니다:\n\n` +
                     
                     `📋 **HUG 대위변제 절차**:\n` +
                     `1️⃣ **임대차 만료 전 준비**\n` +
                     `• 집주인에게 전세금 반환 요구서 발송 (내용증명)\n` +
                     `• 반환 거부 시 HUG에 대위변제 신청\n\n` +
                     
                     `2️⃣ **은행 대출 연장 가능 여부**\n` +
                     `• **가능**: 중기청 대출 만료 전 은행과 상담\n` +
                     `• 연장 조건: 기존 대출 조건 유지 또는 일반 전세자금대출 전환\n` +
                     `• 연장 기간: 통상 1-2년 (은행별 상이)\n\n` +
                     
                     `3️⃣ **HUG 대위변제 후 처리**\n` +
                     `• HUG에서 대위변제금 수령 후 즉시 은행 대출 상환\n` +
                     `• 집주인에 대한 구상권 행사는 HUG에서 진행\n` +
                     `• 새 거주지에서 신규 전세자금대출 신청 가능\n\n` +
                     
                     `⚠️ **주의사항**:\n` +
                     `• 대위변제 신청은 임대차 만료 **30일 전**까지\n` +
                     `• 은행 연장 승인 후 HUG 변제금으로 상환해야 연체 방지\n` +
                     `• 전세보증보험 가입 여부에 따라 절차 상이`,
            
            cards: [{
              title: "중기청 대출 + HUG 대위변제",
              subtitle: "집주인 반환거부 시 대응 절차",
              monthly: "연장 후 HUG 상환",
              totalInterest: "기존 금리 유지",
              notes: [
                "1단계: 은행 연장 승인 (만료 전)",
                "2단계: HUG 대위변제 신청 (30일 전)",
                "3단계: 대위변제금으로 대출 상환",
                "신규 거주지 전세자금대출 재신청 가능",
                "전세보증보험 가입 여부 확인 필수"
              ]
            }],
            
            checklist: [
              "임대차계약서 및 전세보증보험증서 확인",
              "집주인 반환 요구 내용증명 발송",
              "은행에 대출 연장 사전 상담 (만료 1-2개월 전)",
              "HUG 대위변제 신청 절차 및 필요서류 준비"
            ]
          });
        }
        
        // 일반적인 기존 이용자 연장/상환 문의
        return NextResponse.json({
          content: `**기존 중기청 대출 이용자 상담** 📞\n\n` +
                   `현재 중기청 대출을 이용 중이시는군요. 기존 이용자분들은 다음과 같은 혜택을 받을 수 있습니다:\n\n` +
                   
                   `✅ **기존 대출 연장 가능**:\n` +
                   `• 중기청 대출 신규 종료와 별개로 **기존 대출자는 연장 가능**\n` +
                   `• 연장 조건: 기존 조건 유지 또는 일반 전세자금대출 조건 적용\n` +
                   `• 연장 기간: 은행별 1-3년 (최대 10년까지)\n\n` +
                   
                   `🔄 **만료 시 대안**:\n` +
                   `• **버팀목 전세자금대출**: 연 2.2-3.3% (기존보다 우대)\n` +
                   `• **디딤돌 전세자금**: 무주택자 대상\n` +
                   `• **일반 전세자금대출**: 시중은행 상품\n\n` +
                   
                   `📋 **연장 절차**:\n` +
                   `1. 만료 1-2개월 전 취급은행 방문\n` +
                   `2. 소득 및 신용상태 재심사\n` +
                   `3. 연장 승인 시 기존 조건 유지\n\n` +
                   
                   `💡 **추천 사항**:\n` +
                   `현재 중기청 대출 금리가 우대조건이므로 가능한 연장하시고, 불가 시 버팀목 대출로 전환하세요.`,
          
          cards: [{
            title: "중기청 대출 연장 가이드",
            subtitle: "기존 이용자 전용 혜택",
            monthly: "기존 금리 유지",
            totalInterest: "연장 시 동일 조건",
            notes: [
              "신규 신청 종료 ≠ 기존 대출 연장 불가",
              "만료 1-2개월 전 은행 상담 필수",
              "연장 불가 시 버팀목 대출 전환",
              "최대 10년까지 연장 가능",
              "소득·신용 재심사 후 결정"
            ]
          }],
          
          checklist: [
            "대출만료일 정확히 확인 (1-2개월 전 상담)",
            "소득증명서, 재직증명서 등 서류 준비",
            "신용등급 및 연체 이력 사전 점검",
            "연장 불가 시 대안 상품 미리 조회"
          ]
        });
      }
      
      // 신규 신청 관련 질문 (일반적인 종료 안내)
      return NextResponse.json({
        content: "⚠️ **중기청 대출 신규 신청 종료 안내**\n\n" +
        "중소기업 취업 청년 전월세 보증금 대출(일명 '중기청 100')은 **2024년 말 신규 신청이 종료**되었습니다.\n\n" +
        "💡 **대안 프로그램**: '청년 버팀목 전세자금대출'로 통합 운영\n" +
        "• 대상: 만 19~34세 무주택 세대주\n" +
        `• 한도: 최대 ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.jeonse)}원 (전세보증금의 80%)\n` +
        "• 금리: 연 2.2~3.3% (우대조건 시 최저 1.0%)\n" +
        "• 소득: 연 5천만원 이하\n\n" +
        "📞 **기존 이용자**이시라면 연장 상담이 가능하니 추가로 문의해 주세요.",
        cards: [{
          title: "청년 버팀목 전세자금대출",
          subtitle: "중기청 대출 대안 프로그램",
          monthly: `최대 ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.jeonse)}원`,
          totalInterest: "연 2.2~3.3%",
          notes: [
            "만 19~34세 무주택 세대주",
            "연소득 5천만원 이하", 
            "전세보증금 80% 한도",
            "중기청 대출보다 더 우대된 금리",
            "신청링크: https://www.hf.go.kr"
          ]
        }],
        checklist: [
          "중기청 대출 신규신청 불가 (2024년 말 종료)",
          "청년 버팀목 전세자금대출로 대체 신청",
          "기존 이용자는 연장 상담 가능",
          "우대금리 적용 조건 검토"
        ]
      });
    }

    // 도메인 체크는 맥락 질문이 처리되지 않은 경우에만
    if (!isDomain(message, merged)) {
      return NextResponse.json({
        content:
          "이 서비스는 '부동산/주택금융' 상담 전용이에요 🙂\n예) 전세↔월세, 전월세 전환율, LTV/DSR 한도, 특례보금자리, 매수/매도, 보증금 조정 등",
        cards: null,
        checklist: null,
      });
    }

    // 월소득 등 재정 정보 질문 처리 (더 지능적으로)
    if (/(월\s*소득|소득|현금|보유\s*현금)/.test(message)) {
      const parts: string[] = [];
      if (merged.incomeMonthly) parts.push(`월소득: ${toComma(merged.incomeMonthly)}원`);
      if (merged.cashOnHand) parts.push(`현금: ${toComma(merged.cashOnHand)}원`);
      if (merged.propertyPrice) parts.push(`매매가: ${toComma(merged.propertyPrice)}원`);
      if (merged.downPayment) parts.push(`자기자본: ${toComma(merged.downPayment)}원`);
      
      // 단순 정보 확인 질문이 아니라 분석/상담 요청인지 확인
      const isAnalysisRequest = /분석|계산|시나리오|추천|상담|어떻게|받.*수|가능.*한/.test(message.toLowerCase());
      const hasEnoughInfo = merged.incomeMonthly && (merged.propertyPrice || merged.cashOnHand);
      
      if (isAnalysisRequest && hasEnoughInfo) {
        // 대출 시나리오 분석으로 라우팅
        const response = generateLoanScenariosResponse(merged);
        return NextResponse.json(response);
      } else if (isAnalysisRequest && !hasEnoughInfo) {
        // 추가 정보 필요
        return NextResponse.json({
          content: parts.length > 0 ? 
            `알려주신 정보: ${parts.join(" / ")}\n\n추가로 필요한 정보:\n` +
            `${!merged.incomeMonthly ? "• 월소득\n" : ""}` +
            `${!merged.propertyPrice ? "• 매매가 또는 전세보증금\n" : ""}` +
            `${!merged.cashOnHand && !merged.downPayment ? "• 자기자본(현금)\n" : ""}\n` +
            `모든 정보를 말씀해 주시면 맞춤 대출 시나리오를 분석해 드릴게요.`
            :
            `대출 시나리오 분석을 위해 다음 정보가 필요해요:\n` +
            `• 월소득: "월소득 500만원"\n` +
            `• 매매가: "5억원 집 구입"\n` +
            `• 자기자본: "자기자본 1억원"\n\n` +
            `예시: "월소득 500만원, 5억원 집 구입, 자기자본 1억원 분석해줘"`,
          cards: null,
          checklist: ["월소득 확인", "매매가/전세보증금 확인", "자기자본 확인"]
        });
      } else {
        // 단순 정보 확인
        return NextResponse.json({ 
          content: parts.length > 0 ? parts.join(" / ") : "재정 정보를 알려주세요.",
          cards: null, 
          checklist: null 
        });
      }
    }

    // 일반 도메인 폴백 - 대출 시나리오 안내 추가
    return NextResponse.json({
      content:
        "요청을 이해했어요. 구체적으로 알려주시면 바로 계산/비교해 드릴게요.\n\n" +
        "💡 **대출 시나리오 분석**이 필요하시면:\n" +
        "\"월소득 500만원, 5억원 집 구입, 자기자본 1억원\" 처럼 말씀해 주세요.\n\n" +
        "다른 예시: \"전세 2억5천 vs 보증금 3억·월세 90만 비교\", \"LTV/DSR 한도 추정\"",
      cards: null,
      checklist: ["주거비 30% 룰 점검", "전세보증보험 여부 확인", "대출 한도/금리 비교", "정책자금 자격 확인"],
    });
  } catch {
    return NextResponse.json({
      content:
        "처리 중 예외가 발생했어요. 같은 내용을 한 번 더 보내 주세요. 계속되면 서버 로그를 첨부해 주세요.",
      cards: null,
      checklist: null,
    });
  }
}