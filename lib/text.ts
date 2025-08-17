// lib/text.ts
export function isLowInfo(text = ""): boolean {
  const s = text.trim();
  if (!s) return true;
  const letters = s.replace(/[\s\p{P}\p{S}\p{Emoji_Presentation}]/gu, "");
  return letters.length < 2;
}

export function isRealEstateQuery(text = ""): boolean {
  const t = text.toLowerCase();
  const kw = [
    "전세","월세","매매","주담대","담보대출","보금자리","디딤돌","특례",
    "ltv","dti","dsr","등기","잔금","계약금","중도금","취득세","등기부",
    "대출","금리","상환","원리금","거치","만기","갈아타기","리파이낸싱",
    "시세","아파트","빌라","오피스텔",
    // 보강
    "주거비","rir","환산","환산액","월세환산","월소득","소득","현금","보유현금"
  ];
  return kw.some(k => t.includes(k));
}

export function isAnalyticalTopic(text = ""): boolean {
  const t = text.toLowerCase();
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

/** 요약/업데이트/회상 등 메타 후속 질문 */
export function isMetaFollowUp(text = ""): boolean {
  const t = text.toLowerCase();
  return (
    /(의도|요약|정리|한\s*줄|다시|재계산|업데이트|수정|보완|이어|계속|앞서|위\s*판단|동일\s*조건|같은\s*조건|맥락|컨텍스트|얼마였지|얼마라고\s*했지|내가\s*말한|말했던|숫자만|콤마)/.test(t) ||
    /(summary|summarize|tl;dr|update|recompute|recalculate|follow\s*up|continue)/i.test(text)
  );
}

/** 사실 검증/근거/출처/공식 */
export function isVerifyIntent(text = ""): boolean {
  const t = text.toLowerCase();
  return (
    /(사실|팩트|검증|근거|출처|공식|수식|근거\s*출처|증명|rir|주거비\s*30)/.test(t) ||
    /(verify|evidence|proof|source|citation|formula)/i.test(text)
  );
}