// lib/text.ts
// 공용 텍스트 유틸: 가드/의도/메타/추출

export function isLowInfo(text: string): boolean {
  const s = (text ?? "").trim();
  if (!s) return true;
  // 공백/구두점/기호/이모지 제거 후 글자 수
  const letters = s.replace(/[\s\p{P}\p{S}\p{Emoji_Presentation}]/gu, "");
  return letters.length < 2;
}

export function isRealEstateQuery(text: string): boolean {
  const t = (text ?? "").toLowerCase();
  const kw = [
    "전세","월세","매매","주담대","담보대출","보금자리","디딤돌","특례",
    "ltv","dti","dsr","등기","잔금","계약금","중도금","취득세","등기부",
    "대출","금리","상환","원리금","거치","만기","갈아타기","리파이낸싱",
    "시세","아파트","빌라","오피스텔","사전심사","pre-approval","보증금"
  ];
  return kw.some(k => t.includes(k));
}


export function isDomainIntent(text: string): boolean {
  const t = text.replace(/\s+/g, "");
  if (/(월소득|월수입|월급|현금|보유현금|전세|보증금|월세)/.test(t)) return true;
  if (/(숫자만.*콤마|콤마.*숫자만)/.test(t)) return true; // 메타도 도메인 처리
  // ... 기존 키워드/룰 이어서
  return false;
}

export function isAnalyticalTopic(text: string): boolean {
  const t = (text ?? "").toLowerCase();
  const k = [
    "체증식","체증","원리금균등","원금균등","상환 방식","상환방식",
    "거치","만기일시","혼합형","변동금리","고정금리",
    "ltv","dsr","dti","한도","금리 비교","갈아타기","리파이낸싱"
  ];
  if (k.some(x => t.includes(x))) return true;
  if (/\b(5|10|15|20|30)\s*년/.test(t) && /(상환|원리금|체증|만기)/.test(t)) return true;
  if (/\b\d+(\.\d+)?\s*%/.test(t) && /(금리|상환|dsr|ltv)/.test(t)) return true;
  return false;
}

// ✅ 후속/메타 요청 탐지 (의도요약/재계산/숫자만/콤마 등)
export function isMetaFollowUp(text: string): boolean {
  const t = String(text ?? "").toLowerCase();
  return (
    /(의도|한\s*줄|요약|정리|다시|재계산|업데이트|수정|보완|이어|계속|앞서|이전|방금|맥락|컨텍스트)/.test(t) ||
    /(summary|summarize|tl;dr|update|recompute|recalculate|fix|follow\s*up|continue)/i.test(t) ||
    /(숫자\s*만|숫자만|콤마|comma|number\s*only|just\s*numbers)/i.test(t)
  );
}

// ── 한국 통화 포맷
export const fmtKRW = (n: number) =>
  new Intl.NumberFormat("ko-KR").format(Math.round(n));

// ── 금액 파서(“420만원”, “3천만원”, “4.5억 3천” 등 일부 케이스)
export function parseKRWAmount(raw: string): number | null {
  const s = (raw ?? "").replace(/,/g, "").trim();
  if (!s) return null;

  // 1) 000원, 000만/천 만원
  let m: RegExpMatchArray | null;

  // 4.5억 3천만 / 4.5억 / 4억 5000만
  m = s.match(/(\d+(?:\.\d+)?)\s*억(?:\s*(\d+)\s*천)?\s*만?\s*원?/);
  if (m) {
    const eok = parseFloat(m[1]);
    const cheon = m[2] ? parseInt(m[2], 10) : 0;
    return Math.round(eok * 100_000_000 + cheon * 10_000_000);
  }

  // 3천만(원)
  m = s.match(/(\d+)\s*천\s*만?\s*원?/);
  if (m) return parseInt(m[1], 10) * 10_000_000;

  // 420만(원)
  m = s.match(/(\d+(?:\.\d+)?)\s*만\s*원?/);
  if (m) return Math.round(parseFloat(m[1]) * 10_000);

  // 250000000(원) 같은 생 숫자
  m = s.match(/^\d+$/);
  if (m) return parseInt(m[0], 10);

  return null;
}

// ── 프로필(월소득/현금/보증금/월세) 추출
export type ProfilePatch = {
  incomeMonthly?: number | null;
  cashOnHand?: number | null;
  deposit?: number | null;
  monthlyRent?: number | null;
};

export function extractProfileFromText(text: string): ProfilePatch {
  const t = String(text ?? "");
  const out: ProfilePatch = {};

  // 월소득/월급
  let m =
    t.match(/(월\s*소득|월급)\s*[:=]?\s*([0-9,.\s천만억]+)\s*원?/i) ||
    t.match(/([0-9,.\s천만억]+)\s*원?\s*(?:의)?\s*(월\s*소득|월급)/i);
  if (m) {
    const v = parseKRWAmount(m[2] ?? m[1]);
    if (v && v > 0) out.incomeMonthly = v;
  }

  // 보유현금/현금
  m =
    t.match(/(보유\s*현금|현금)\s*[:=]?\s*([0-9,.\s천만억]+)\s*원?/i) ||
    t.match(/([0-9,.\s천만억]+)\s*원?\s*(?:의)?\s*(보유\s*현금|현금)/i);
  if (m) {
    const v = parseKRWAmount(m[2] ?? m[1]);
    if (v && v > 0) out.cashOnHand = v;
  }

  // 보증금
  m = t.match(/(보증금)\s*[:=]?\s*([0-9,.\s천만억]+)\s*원?/i);
  if (m) {
    const v = parseKRWAmount(m[2]);
    if (v && v > 0) out.deposit = v;
  }

  // 월세
  m = t.match(/(월세)\s*[:=]?\s*([0-9,.\s천만억]+)\s*원?/i);
  if (m) {
    const v = parseKRWAmount(m[2]);
    if (v && v > 0) out.monthlyRent = v;
  }

  return out;
}