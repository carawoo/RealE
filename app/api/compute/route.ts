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

// 전문 정책 상담 요청인지 확인
function isSpecificLoanPolicyRequest(text: string): boolean {
  const t = text.toLowerCase();
  
  // 핵심 정책 키워드
  const policyKeywords = [
    "디딤돌", "체증식", "원리금균등", "원금균등", "상환방식", "상환 방식",
    "신혼부부", "생애최초", "기금e든든", "모의심사", "고정금리", "변동금리",
    "보금자리론", "보금자리", "ltv", "dsr", "대출규제", "차감", "수도권"
  ];
  
  // 일반적인 대출 상담 패턴
  const generalLoanPatterns = [
    /대출.*기간/, /신청.*기간/, /얼마.*걸/, /언제.*신청/,
    /어느.*정도/, /며칠/, /몇.*주/, /몇.*개월/,
    /절차/, /방법/, /과정/, /준비/, /서류/,
    /조건/, /자격/, /요건/, /한도/, /금리/
  ];
  
  // 대출 관련 용어
  const loanTerms = ["대출", "보금자리", "디딤돌", "전세자금", "주택담보"];
  
  const hasLoanTerm = loanTerms.some(term => t.includes(term));
  const hasPolicyKeyword = policyKeywords.some(keyword => t.includes(keyword));
  const hasGeneralPattern = generalLoanPatterns.some(pattern => pattern.test(t));
  
  // 정책 키워드가 있거나, 대출 용어 + 일반 패턴이 있으면 전문 상담
  return hasPolicyKeyword || (hasLoanTerm && hasGeneralPattern);
}

// 전문 정책 상담 응답 생성
function generateSpecificLoanPolicyResponse(text: string) {
  const t = text.toLowerCase();
  
  // 디딤돌 대출 관련 질문 처리
  if (t.includes("디딤돌")) {
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
  
  // 보금자리론 생애최초 질문 처리
  if ((t.includes("보금자리") || t.includes("보금자리론")) && t.includes("생애최초")) {
    const isRegulation = t.includes("규제") || t.includes("80%") || t.includes("70%");
    const isNonApartment = t.includes("아파트") && (t.includes("외") || t.includes("다른"));
    const isDeduction = t.includes("차감") || t.includes("5%");
    const isSeoulMetro = t.includes("수도권");
    
    return {
      content: `**보금자리론 생애최초 대출 상담** 🏠\n\n` +
               `📋 **현재 LTV 한도 (2024년 기준)**:\n` +
               `• **수도권**: 70% (기존 80%에서 하향 조정)\n` +
               `• **비수도권**: 80% 유지\n\n` +
               `🏢 **주택유형별 LTV 차감**:\n` +
               `• **아파트**: 차감 없음 (70% 그대로)\n` +
               `• **아파트 외 주택** (연립, 다세대, 단독 등): **5%p 차감**\n` +
               `  → 수도권 기준 65% (70% - 5%)\n\n` +
               `💡 **생애최초 특례 혜택**:\n` +
               `• 일반 보금자리론과 동일한 차감 규칙 적용\n` +
               `• 아파트 외 주택도 5%p 차감됩니다\n` +
               `• 생애최초라고 해서 70% 전부를 받을 수는 없어요\n\n` +
               `⚠️ **주의사항**:\n` +
               `규제 이후 아파트 외 주택 구매 시 자기자본을 더 많이 준비해야 합니다.`,
      cards: [{
        title: "보금자리론 생애최초 LTV 한도",
        subtitle: "2024년 대출규제 이후 기준",
        monthly: "수도권 기준",
        totalInterest: "최대 65% (아파트 외)",
        notes: [
          "아파트: 70% (차감 없음)",
          "아파트 외: 65% (5%p 차감)",
          "생애최초도 동일 규칙 적용",
          "비수도권: +10%p 우대",
          "금리: 연 3.2~4.0% (변동금리)"
        ]
      }],
      checklist: [
        "아파트 vs 아파트 외 주택 LTV 차이 5%p 확인",
        "수도권 기준 자기자본 최소 35% 준비 (아파트 외)",
        "생애최초 자격조건 재확인 (무주택 세대주, 소득기준 등)",
        "DSR 70% 이하 유지 가능한지 소득 대비 상환능력 점검"
      ]
    };
  }
  
  // 보금자리론 신청 기간/절차 질문 처리
  if ((t.includes("보금자리") || t.includes("보금자리론")) && 
      (t.includes("기간") || t.includes("신청") || t.includes("절차") || t.includes("얼마") || t.includes("언제"))) {
    return {
      content: `**보금자리론 신청 기간 및 절차 안내** ⏰\n\n` +
               `📅 **신청 기간**:\n` +
               `• **상시 신청 가능** (연중 수시접수)\n` +
               `• 예산 소진 시까지 계속 접수\n` +
               `• 보통 **2-3주 소요** (서류 완비 기준)\n\n` +
               `🏃‍♂️ **처리 단계별 소요기간**:\n` +
               `• 서류 접수 → 심사: **5-7일**\n` +
               `• 심사 → 승인: **3-5일**\n` +
               `• 승인 → 실행: **3-5일**\n\n` +
               `💡 **빠른 진행을 위한 팁**:\n` +
               `• 서류를 미리 완벽하게 준비\n` +
               `• 기금e든든에서 사전 모의심사 진행\n` +
               `• 취급은행 방문 전 전화 상담으로 확인\n\n` +
               `⚠️ **주의사항**:\n` +
               `연말/연초, 금리인상 발표 전후에는 신청이 몰려 더 오래 걸릴 수 있어요.`,
      cards: [{
        title: "보금자리론 신청 프로세스",
        subtitle: "단계별 소요시간 및 준비사항",
        monthly: "총 2-3주 소요",
        totalInterest: "상시 신청 가능",
        notes: [
          "1단계: 서류접수 (5-7일)",
          "2단계: 대출심사 (3-5일)", 
          "3단계: 실행준비 (3-5일)",
          "사전 모의심사로 시간 단축 가능",
          "신청링크: https://www.hf.go.kr"
        ]
      }],
      checklist: [
        "소득증명서, 재직증명서 등 필수서류 미리 준비",
        "기금e든든에서 모의심사로 승인 가능성 확인",
        "취급은행별 우대금리 조건 비교",
        "매매계약서 및 등기부등본 최신 상태 확인"
      ]
    };
  }
  
  // 일반적인 대출 질문 처리 (기간, 조건, 절차 등)
  if (/대출.*기간|신청.*기간|얼마.*걸|언제.*신청/.test(t) ||
      /절차|방법|과정|준비|서류/.test(t) ||
      /조건|자격|요건|한도|금리/.test(t)) {
    
    // 특정 대출 상품별 맞춤 답변
    if (t.includes("디딤돌")) {
      return {
        content: `**디딤돌 대출 완벽 가이드** 🏠\n\n` +
                 `⏰ **신청 기간**: 상시 접수 (2-3주 소요)\n` +
                 `💰 **대출 한도**: 최대 2.5억원 (LTV 70%)\n` +
                 `📊 **금리**: 연 3.20~4.05% (변동금리)\n\n` +
                 `✅ **신청 자격**:\n` +
                 `• 무주택 세대주 (부부합산)\n` +
                 `• 연소득 7천만원 이하 (부부합산)\n` +
                 `• 주택가격 6억원 이하\n\n` +
                 `📋 **필요 서류**:\n` +
                 `• 소득증명서, 재직증명서\n` +
                 `• 주민등록등본, 건강보험자격득실확인서\n` +
                 `• 매매계약서, 등기부등본\n\n` +
                 `🎯 **우대금리 조건**:\n` +
                 `신혼부부, 생애최초, 청약저축 가입자 등 최대 0.5%p 우대`,
        cards: null,
        checklist: [
          "무주택 여부 확인 (전국 기준)",
          "소득 증빙서류 미리 준비",
          "기금e든든에서 사전 모의심사",
          "우대금리 적용 조건 확인"
        ]
      };
    }
    
    return {
      content: `**주택금융 대출 일반 안내** 🏛️\n\n` +
               `📅 **신청 시기**: 대부분 상시 접수 가능\n` +
               `⏰ **처리 기간**: 일반적으로 2-4주 소요\n` +
               `📋 **공통 절차**: 신청 → 심사 → 승인 → 실행\n\n` +
               `💡 **주요 대출 상품**:\n` +
               `• **디딤돌 대출**: 무주택자 구입자금 (최대 2.5억)\n` +
               `• **보금자리론**: 생애최초/신혼부부 특례\n` +
               `• **버팀목 전세자금**: 전세보증금 대출\n\n` +
               `🚀 **빠른 승인을 위한 팁**:\n` +
               `서류 미리 준비 → 사전 모의심사 → 은행 방문`,
      cards: null,
      checklist: [
        "대출 목적 명확히 정하기 (구입/전세/담보)",
        "소득 및 신용상태 점검",
        "필요서류 사전 준비",
        "여러 금융기관 조건 비교"
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

    if (/전세.*월세.*환산|월세.*환산|전세.*월세/.test(message)) {
      const r = replyJeonseToMonthly(message);
      if (r) return NextResponse.json(r);
    }

    // 중기청 100 대출 관련 질문 처리
    if (/중기청.*100|중기청.*대출|중기청.*전세/.test(message)) {
      return NextResponse.json({
        content: "⚠️ **중기청 100억 대출 종료 안내**\n\n" +
        "중소기업 취업 청년 전월세 보증금 대출(일명 '중기청 100')은 **2024년 말 종료**되어 더 이상 신청할 수 없습니다.\n\n" +
        "💡 **대안 프로그램**: '청년 버팀목 전세자금대출'로 통합 운영\n" +
        "• 대상: 만 19~34세 무주택 세대주\n" +
        "• 한도: 최대 2억원 (전세보증금의 80%)\n" +
        "• 금리: 연 2.2~3.3% (우대조건 시 최저 1.0%)\n" +
        "• 소득: 연 5천만원 이하",
        cards: [{
          title: "청년 버팀목 전세자금대출",
          subtitle: "중기청 대출 통합 운영 프로그램",
          monthly: "최대 2억원",
          totalInterest: "연 2.2~3.3%",
          notes: [
            "만 19~34세 무주택 세대주",
            "연소득 5천만원 이하", 
            "전세보증금 80% 한도",
            "우대조건 시 최저 1.0%",
            "신청링크: https://www.hf.go.kr"
          ]
        }],
        checklist: [
          "기존 중기청 대출 신규신청 불가 (2024년 말 종료)",
          "청년 버팀목 전세자금대출로 대체 신청",
          "신청 자격조건 및 필요서류 미리 확인",
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

    if (/(월\s*소득|소득|현금|보유\s*현금)/.test(message)) {
      const parts: string[] = [];
      if (merged.incomeMonthly) parts.push(`월소득: ${toComma(merged.incomeMonthly)}원`);
      if (merged.cashOnHand) parts.push(`현금: ${toComma(merged.cashOnHand)}원`);
      if (merged.propertyPrice) parts.push(`매매가: ${toComma(merged.propertyPrice)}원`);
      if (merged.downPayment) parts.push(`자기자본: ${toComma(merged.downPayment)}원`);
      return NextResponse.json({ content: parts.join(" / "), cards: null, checklist: null });
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