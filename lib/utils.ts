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
  
  // 월소득 추출 (개선된 패턴)
  const incM =
    text.match(/월급\s*([0-9]+)\s*(?:만원|천만원|억원)?/i) ||
    text.match(/월\s*소득\s*([0-9억천만,\s]+)원?/i) ||
    text.match(/(?:월소득|소득)\s*([0-9억천만,\s]+)원?/i) ||
    text.match(/월급\s*([0-9억천만,\s]+)원?/i) ||
    text.match(/월\s*([0-9억천만,\s]+)원?\s*(?:만원|천만원|억원)?/i);
  if (incM?.[1]) {
    let v;
    // "월급 340" 같은 경우 340만원으로 처리
    if (incM[1].match(/^\d+$/)) {
      v = parseInt(incM[1]) * 10000; // 만원 단위로 처리
    } else {
      v = parseWon(incM[1] + "원");
    }
    if (v) fields.incomeMonthly = v;
  }
  
  // 보유현금 추출
  const cashM = text.match(/(?:보유\s*현금|현금)\s*([0-9억천만,\s]+)원?/i);
  if (cashM?.[1]) {
    const v = parseWon(cashM[1] + "원");
    if (v) fields.cashOnHand = v;
  }
  
  // 매매가/집값 추출 (개선된 패턴)
  const priceM = 
    text.match(/([0-9]+)억\s*(?:매매|구입|고민|집|아파트)?/i) ||
    text.match(/(?:매매가|집값|매물가|부동산가)\s*([0-9억천만,\s]+)원?/i) ||
    text.match(/([0-9억천만,\s]+)원?\s*(?:짜리|집|매물|구입|구매)/i) ||
    text.match(/([0-9억천만,\s]+)억\s*(?:매매|구입|고민|집|아파트)?/i) ||
    text.match(/([0-9억천만,\s]+)억원?\s*(?:매매|구입|고민|집|아파트)?/i);
  if (priceM?.[1]) {
    let v;
    // "3억" 같은 경우 3억원으로 처리
    if (priceM[1].match(/^\d+$/)) {
      v = parseInt(priceM[1]) * 100_000_000; // 억 단위로 처리
    } else {
      v = parseWon(priceM[1] + "원");
    }
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
  const t = text.toLowerCase();
  
  // 질문 의도 파악 - 이전 답변에 대한 질문이나 설명 요청은 제외
  const questionPatterns = [
    /뭐가|무엇이|왜|어떻게|어떤|설명해|알려줘|궁금해|이해가|의미가|뜻이/,
    /그게|그것이|그건|저게|저것이|저건/,
    /맞아|틀려|정말|진짜|그래|아니야|아닌데/,
    /^(뭐|무엇|왜|어떻게|어떤)/
  ];
  const isQuestionAboutPrevious = questionPatterns.some(pattern => pattern.test(t));
  
  // 매매 관련 맥락 확인 - 매매 의도가 있으면 전세→월세 환산하지 않음
  const purchaseKeywords = ["매매", "구입", "매수", "집 구입", "집 사기", "주택 구입", "아파트 구입", "매매고민", "구입고민", "구매"];
  const hasPurchaseIntent = purchaseKeywords.some(keyword => t.includes(keyword));
  
  // 전세/월세 관련 맥락 확인
  const rentalKeywords = ["전세", "월세", "임대", "전세자금", "월세자금", "임대차", "보증금"];
  const hasRentalIntent = rentalKeywords.some(keyword => t.includes(keyword));
  
  // 제외 조건들
  if (isQuestionAboutPrevious || // 이전 답변에 대한 질문
      (hasPurchaseIntent && !hasRentalIntent)) { // 매매 의도가 명확
    return null;
  }
  
  // 명시적인 전세 관련 키워드가 없고 단순 숫자만 있는 경우도 제외
  if (!hasRentalIntent && /^\d+만원?$|^\d+억$/.test(text.replace(/[,\s]/g, ''))) {
    return null;
  }
  
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