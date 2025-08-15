// lib/text.ts
export function isLowInfo(text: string): boolean {
  const s = (text ?? "").trim();
  if (!s) return true;
  const letters = s.replace(/[\s\p{P}\p{S}\p{Emoji_Presentation}]/gu, "");
  return letters.length < 2;
}

export function isRealEstateQuery(text: string): boolean {
  const t = (text ?? "").toLowerCase();
  const kw = [
    "전세", "월세", "매매", "주담대", "담보대출", "보금자리", "디딤돌", "특례",
    "ltv", "dti", "dsr", "등기", "잔금", "계약금", "중도금", "취득세", "등기부",
    "대출", "금리", "상환", "원리금", "거치", "만기", "갈아타기"
  ];
  return kw.some(k => t.includes(k));
}

/** ▶ 이 함수가 핵심: ‘FAQ로 퉁치지 말고 분석 필요’한 주제들 */
export function isAnalyticalTopic(text: string): boolean {
  const t = (text ?? "").toLowerCase();

  // 상환방식/금리/한도·규제 등 '계산/비교/맥락'이 필요한 키워드
  const keywords = [
    "체증식", "체증", "원리금균등", "원금균등", "상환 방식", "상환방식",
    "거치", "만기일시", "혼합형", "변동금리", "고정금리",
    "ltv", "dsr", "dti", "한도", "금리 비교", "갈아타기", "리파이낸싱"
  ];

  if (keywords.some(k => t.includes(k))) return true;

  // 숫자+상환/금리 맥락 (예: "30년 체증식", "금리 4.2% 체증식 어때요")
  if (/\b(5|10|15|20|30)\s*년/.test(t) && /(상환|원리금|체증|만기)/.test(t)) return true;
  if (/\b\d+(\.\d+)?\s*%/.test(t) && /(금리|상환|dsr|ltv)/.test(t)) return true;

  return false;
}