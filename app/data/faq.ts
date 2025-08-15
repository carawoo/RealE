// lib/faq.ts
import type { FAQItem } from "@/app/data/faqs";

// 텍스트 정규화: 소문자, 문장부호 제거, 공백 정리
export function normalize(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// 2-gram(바이그램) 셋 만들기
function bigrams(s: string): Set<string> {
  const t = normalize(s);
  if (!t) return new Set();
  const joined = t.replace(/\s+/g, " ");
  const grams = new Set<string>();
  for (let i = 0; i < joined.length - 1; i++) {
    grams.add(joined.slice(i, i + 2));
  }
  return grams;
}

// Jaccard 유사도
function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  return inter.size / union.size;
}

// 질문과 FAQ의 최적 매치 찾기 (기본 임계치 0.8)
export function bestFAQMatch(
  question: string,
  faqs: FAQItem[],
  threshold = 0.8
): { item: FAQItem; score: number; index: number } | null {
  const qset = bigrams(question);
  let best: { item: FAQItem; score: number; index: number } | null = null;
  faqs.forEach((item, idx) => {
    const s = jaccard(qset, bigrams(item.q));
    if (!best || s > best.score) best = { item, score: s, index: idx };
  });
  return best && best.score >= threshold ? best : null;
}