import { parseWon } from "../domain/loan/calculator";

export type Fields = { 
  incomeMonthly?: number; 
  cashOnHand?: number;
  propertyPrice?: number;
  downPayment?: number;
  loanPeriodYears?: number;
  isFirstTimeBuyer?: boolean;
  maritalStatus?: 'single' | 'married' | 'planning' | 'unknown';
  propertyType?: 'apartment' | 'nonApartment' | 'unknown';
};

export function toComma(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "";
  return n.toLocaleString("ko-KR");
}

export function extractFieldsFrom(text: string): Fields {
  const fields: Fields = {};
  const incM =
    text.match(/월급\s*([0-9]+)\s*(?:만원|천만원|억원)?/i) ||
    text.match(/월\s*소득\s*([0-9억천만,\s]+)원?/i) ||
    text.match(/(?:월소득|소득)\s*([0-9억천만,\s]+)원?/i) ||
    text.match(/월급\s*([0-9억천만,\s]+)원?/i) ||
    text.match(/월\s*([0-9억천만,\s]+)원?\s*(?:만원|천만원|억원)?/i);
  if (incM?.[1]) {
    let v;
    if (incM[1].match(/^\d+$/)) {
      v = parseInt(incM[1]) * 10000;
    } else {
      v = parseWon(incM[1] + "원");
    }
    if (v) fields.incomeMonthly = v;
  }

  const cashM = text.match(/(?:보유\s*현금|현금)\s*([0-9억천만,\s]+)원?/i);
  if (cashM?.[1]) {
    const v = parseWon(cashM[1] + "원");
    if (v) fields.cashOnHand = v;
  }

  const priceM = 
    text.match(/([0-9]+)억\s*(?:매매|구입|고민|집|아파트)?/i) ||
    text.match(/(?:매매가|집값|매물가|부동산가)\s*([0-9억천만,\s]+)원?/i) ||
    text.match(/([0-9억천만,\s]+)원?\s*(?:짜리|집|매물|구입|구매)/i) ||
    text.match(/([0-9억천만,\s]+)억\s*(?:매매|구입|고민|집|아파트)?/i) ||
    text.match(/([0-9억천만,\s]+)억원?\s*(?:매매|구입|고민|집|아파트)?/i);
  if (priceM?.[1]) {
    let v;
    if (priceM[1].match(/^\d+$/)) {
      v = parseInt(priceM[1]) * 100_000_000;
    } else {
      v = parseWon(priceM[1] + "원");
    }
    if (v) fields.propertyPrice = v;
  }

  const downM = text.match(/(?:계약금|자기자본|자본금)\s*([0-9억천만,\s]+)원?/i);
  if (downM?.[1]) {
    const v = parseWon(downM[1] + "원");
    if (v) fields.downPayment = v;
  }

  const periodM = text.match(/(?:대출기간|기간)\s*(\d+)\s*년/i);
  if (periodM?.[1]) {
    const years = parseInt(periodM[1], 10);
    if (years > 0 && years <= 50) fields.loanPeriodYears = years;
  }

  if (/무주택|생애최초/.test(text)) {
    fields.isFirstTimeBuyer = true;
  }

  if (/(소득|월소득|연봉).*(없어|없음|0|제로)|소득\s*없어/.test(text)) {
    fields.incomeMonthly = 0;
  }

  if (/결혼\s*예정|예비부부|예정된\s*결혼/.test(text)) {
    fields.maritalStatus = 'planning';
  } else if (/기혼|결혼했|혼인신고/.test(text)) {
    fields.maritalStatus = 'married';
  } else if (/미혼|솔로/.test(text)) {
    fields.maritalStatus = 'single';
  }

  if (/아파트/.test(text)) {
    fields.propertyType = 'apartment';
  } else if (/오피스텔|다가구|단독|연립|다세대/.test(text)) {
    fields.propertyType = 'nonApartment';
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
    isFirstTimeBuyer: b?.isFirstTimeBuyer ?? a?.isFirstTimeBuyer,
    maritalStatus: b?.maritalStatus ?? a?.maritalStatus,
    propertyType: b?.propertyType ?? a?.propertyType,
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

export function replyJeonseToMonthly(text: string) {
  const t = text.toLowerCase();
  const emotionalPatterns = [
    /망했|실망|어떻게|도와|조언|상담|고민|걱정|불안|스트레스/,
    /ㅠㅠ|ㅜㅜ|ㅡㅡ|헐|와|대박|최악|최고|좋아|나빠/,
    /어떡해|어쩌지|어떻게|도와줘|조언해|상담해/
  ];
  const hasEmotionalContent = emotionalPatterns.some(pattern => pattern.test(t));
  const loanAppraisalPatterns = [
    /대출신청|감정평가|감정가|평가액|평가가|신청했|신청했는데/,
    /보금자리론|디딤돌|주택담보|담보대출|정책자금/,
    /승인|거절|반려|한도|한도초과|한도부족/
  ];
  const hasLoanAppraisalContext = loanAppraisalPatterns.some(pattern => pattern.test(t));
  const questionPatterns = [
    /뭐가|무엇이|왜|어떻게|어떤|설명해|알려줘|궁금해|이해가|의미가|뜻이/,
    /그게|그것이|그건|저게|저것이|저건/,
    /맞아|틀려|정말|진짜|그래|아니야|아닌데/,
    /^(뭐|무엇|왜|어떻게|어떤)/
  ];
  const isQuestionAboutPrevious = questionPatterns.some(pattern => pattern.test(t));
  const purchaseKeywords = ["매매", "구입", "매수", "집 구입", "집 사기", "주택 구입", "아파트 구입", "매매고민", "구입고민", "구매"];
  const hasPurchaseIntent = purchaseKeywords.some(keyword => t.includes(keyword));
  const rentalKeywords = ["전세", "월세", "임대", "전세자금", "월세자금", "임대차", "보증금", "전세보증금", "월세보증금"];
  const hasRentalIntent = rentalKeywords.some(keyword => t.includes(keyword));
  if (/(보증보험|반환보증)/.test(t)) return null;
  if (isQuestionAboutPrevious || hasLoanAppraisalContext || (hasPurchaseIntent && !hasRentalIntent) || hasEmotionalContent) return null;
  if (!hasRentalIntent && /^\d+만원?$|^\d+억$/.test(text.replace(/[\,\s]/g, ''))) return null;
  if (/월소득|소득/.test(text) && !hasRentalIntent) return null;
  const deposit = parseWon(text);
  if (!deposit) return null;
  const monthly = Math.round(deposit * 0.003);
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

export function replyNumbersOnly(profile: Fields) {
  const { incomeMonthly: a, cashOnHand: b } = profile;
  if (a && b) return `${a.toLocaleString("ko-KR")} / ${b.toLocaleString("ko-KR")}`;
  if (a) return a.toLocaleString("ko-KR");
  if (b) return b.toLocaleString("ko-KR");
  return "0";
}


