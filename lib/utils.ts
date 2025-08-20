import { parseWon } from './loan-calculator';

export type Fields = { 
  incomeMonthly?: number; 
  cashOnHand?: number;
  propertyPrice?: number;
  downPayment?: number;
  loanPeriodYears?: number;
};

// ---------- utils ----------
export function toComma(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "";
  return n.toLocaleString("ko-KR");
}

export function extractFieldsFrom(text: string): Fields {
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

export function mergeFields(a?: Fields | null, b?: Fields | null): Fields {
  return {
    incomeMonthly: b?.incomeMonthly ?? a?.incomeMonthly,
    cashOnHand: b?.cashOnHand ?? a?.cashOnHand,
    propertyPrice: b?.propertyPrice ?? a?.propertyPrice,
    downPayment: b?.downPayment ?? a?.downPayment,
    loanPeriodYears: b?.loanPeriodYears ?? a?.loanPeriodYears,
  };
}

export function isNumbersOnlyAsk(t: string) {
  return /숫자만\s*콤마\s*포함해서\s*말해줘/.test(t);
}

export function isDomain(text: string, current: Fields): boolean {
  const t = text.replace(/\s+/g, "");
  const kw =
    /(전세|월세|보증금|매매|매수|매도|청약|대출|LTV|DSR|특례보금자리|주택|집|아파트|주거비|전월세|임대차|금리)/;
  if (isNumbersOnlyAsk(text)) return !!(current.incomeMonthly || current.cashOnHand);
  if (kw.test(t)) return true;
  if (/(월소득|소득|현금|보유현금|자기자본|자금)/.test(t)) return true;
  return false;
}

// 전세→월세 환산 응답 생성
export function replyJeonseToMonthly(text: string) {
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

// 숫자만 요청 응답 생성
export function replyNumbersOnly(profile: Fields) {
  const { incomeMonthly: a, cashOnHand: b } = profile;
  if (a && b) return `${a.toLocaleString("ko-KR")} / ${b.toLocaleString("ko-KR")}`;
  if (a) return a.toLocaleString("ko-KR");
  if (b) return b.toLocaleString("ko-KR");
  return "0";
}
