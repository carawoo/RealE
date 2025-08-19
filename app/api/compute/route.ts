import { NextRequest, NextResponse } from "next/server";
import { 
  generateLoanScenarios, 
  convertScenarioToCard, 
  LoanInputs,
  formatKRW,
  parseWon
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
  if (/(월소득|소득|현금|보유현금)/.test(t)) return true;
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
  const keywords = [
    "대출", "시나리오", "최대한도", "안전상환", "정책활용",
    "월상환", "총이자", "ltv", "dsr", "보금자리", "디딤돌"
  ];
  
  const hasKeyword = keywords.some(keyword => t.includes(keyword));
  const hasProfile = !!(profile.incomeMonthly && profile.propertyPrice);
  
  return hasKeyword || hasProfile;
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
            "신청링크: https://www.hf.go.kr/hf/sub01/sub01_04_01.do"
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