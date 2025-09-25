// lib/intent-slots.ts
// Lightweight intent and slot extractor for variable queries

export type UserIntent =
  | 'loan_purchase'
  | 'loan_jeonse'
  | 'loan_refi'
  | 'policy_question'
  | 'costs_tax'
  | 'glossary'
  | 'general';

export type Slots = {
  propertyPrice?: number;     // 원
  downPayment?: number;       // 원
  incomeMonthly?: number;     // 원
  incomeAnnual?: number;      // 원
  region?: 'regulated' | 'nonregulated' | 'unknown';
  purpose?: 'purchase' | 'jeonse' | 'refi' | 'unknown';
  hasExistingDebt?: boolean;
  monthlyDebtPayment?: number; // 원
  policyMention?: string | null; // 디딤돌/보금자리/버팀목 등
};

// basic number parser for 억/천/만원/원 patterns
function parseWonLoose(text: string): number | null {
  const t = text.replace(/\s+/g, '').replace(/,/g, '');
  let m = t.match(/(\d+)억(\d+)천?/);
  if (m) return parseInt(m[1]) * 100_000_000 + parseInt(m[2]) * 10_000_000;
  m = t.match(/(\d+)억(\d+)만?/);
  if (m) return parseInt(m[1]) * 100_000_000 + parseInt(m[2]) * 10_000;
  m = t.match(/(\d+)억/);
  if (m) return parseInt(m[1]) * 100_000_000;
  m = t.match(/(\d+)천만/);
  if (m) return parseInt(m[1]) * 10_000_000;
  m = t.match(/(\d+)만원?/);
  if (m) return parseInt(m[1]) * 10_000;
  m = t.match(/(\d{4,})원?/);
  if (m) return parseInt(m[1], 10);
  return null;
}

export function extractIntentAndSlots(message: string): { intent: UserIntent; slots: Slots; missing: string[] } {
  const t = message.toLowerCase();
  const slots: Slots = {};
  const missing: string[] = [];

  // region
  if (t.includes('비규제')) slots.region = 'nonregulated';
  else if (t.includes('규제')) slots.region = 'regulated';
  else slots.region = 'unknown';

  // purpose
  if (/(매수|매매|구입|구매|집을사)/.test(t)) slots.purpose = 'purchase';
  else if (/(전세|보증금|월세)/.test(t)) slots.purpose = 'jeonse';
  else if (/(대환|갈아타|재대출|전환)/.test(t)) slots.purpose = 'refi';
  else slots.purpose = 'unknown';

  // policy mention
  if (t.includes('디딤돌')) slots.policyMention = '디딤돌';
  else if (t.includes('보금자리')) slots.policyMention = '보금자리';
  else if (t.includes('버팀목')) slots.policyMention = '버팀목';
  else slots.policyMention = null;

  // prices / amounts
  // property price heuristics
  if (/(집|주택|아파트|매매|매물).*(\d+)/.test(t) || /(\d+).*(집|주택|아파트|매매|매물)/.test(t)) {
    const val = parseWonLoose(message);
    if (val) slots.propertyPrice = val;
  }
  // down payment
  const dpMatch = message.match(/(자기자본|계약금|보유현금)\s*([^\s]+)/);
  if (dpMatch) {
    const val = parseWonLoose(dpMatch[2]);
    if (val) slots.downPayment = val;
  }
  // income
  const mMonthly = message.match(/(월소득|월수입|월)\s*(\d+)(만원)?/);
  if (mMonthly) slots.incomeMonthly = parseInt(mMonthly[2], 10) * 10_000;
  const mAnnualTh = message.match(/연봉\s*(\d+)천/);
  if (mAnnualTh) slots.incomeAnnual = parseInt(mAnnualTh[1], 10) * 10_000_000;
  const mAnnual = message.match(/연봉\s*(\d+)(만원)?/);
  if (!slots.incomeAnnual && mAnnual) slots.incomeAnnual = parseInt(mAnnual[1], 10) * 10_000;
  if (!slots.incomeMonthly && slots.incomeAnnual) slots.incomeMonthly = Math.round((slots.incomeAnnual as number) / 12);

  // debts
  const debtMonthly = message.match(/빚.*?(\d+)\s*만원/);
  const debtHundredMil = message.match(/빚.*?(\d+)\s*억/);
  if (debtMonthly || debtHundredMil) {
    slots.hasExistingDebt = true;
    if (debtMonthly) slots.monthlyDebtPayment = parseInt(debtMonthly[1], 10) * 10_000;
    // 억 단위 표기는 월상환 불명확: 추후 보충요청 용도로만 플래그
  }

  // intent
  let intent: UserIntent = 'general';
  if (slots.purpose === 'purchase') intent = 'loan_purchase';
  else if (slots.purpose === 'jeonse') intent = 'loan_jeonse';
  else if (slots.purpose === 'refi') intent = 'loan_refi';
  else if (slots.policyMention) intent = 'policy_question';
  else if (/(취득세|중개수수료|법무사|세금)/.test(t)) intent = 'costs_tax';
  else if (/(dsr|dti|ltv|근저당)/.test(t)) intent = 'glossary';

  // minimal missing fields for purchase loan scenario
  if (intent === 'loan_purchase') {
    if (!slots.propertyPrice) missing.push('매매가');
    if (!slots.downPayment) missing.push('자기자본');
    if (!slots.incomeMonthly) missing.push('월소득');
  }

  return { intent, slots, missing };
}

export function oneLineMissingPrompt(missing: string[]): string {
  if (!missing.length) return '';
  return `부족한 정보: ${missing.join(', ')}. 한 줄로 적어 주시면 바로 계산해 드릴게요.`;
}


