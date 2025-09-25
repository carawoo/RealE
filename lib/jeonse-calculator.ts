// lib/jeonse-calculator.ts
// 전세→월세 환산 계산기

import { Fields } from './utils';

export type JeonseResponse = {
  content: string;
  cards?: Array<{
    title: string;
    subtitle?: string;
    monthly?: string;
    totalInterest?: string;
    notes?: string[];
  }> | null;
  checklist?: string[] | null;
};

// 전세→월세 환산 처리
export function replyJeonseToMonthly(message: string): JeonseResponse | null {
  const text = message.toLowerCase();
  
  // 전세 vs 월세 비교 키워드 감지
  if (!text.includes('전세') || !text.includes('월세')) {
    return null;
  }
  
  // 금액 추출
  const jeonseAmount = extractJeonseAmount(text);
  const monthlyDeposit = extractMonthlyDeposit(text);
  const monthlyRent = extractMonthlyRent(text);
  
  if (jeonseAmount === 0 || monthlyDeposit === 0 || monthlyRent === 0) {
    return null;
  }
  
  // 계산
  const jeonseToMonthlyRate = calculateJeonseToMonthlyRate(jeonseAmount, monthlyDeposit, monthlyRent);
  const monthlyEquivalent = calculateMonthlyEquivalent(jeonseAmount, jeonseToMonthlyRate);
  
  // 응답 생성
  const content = generateJeonseComparisonContent(jeonseAmount, monthlyDeposit, monthlyRent, monthlyEquivalent);
  const cards = generateJeonseComparisonCards(jeonseAmount, monthlyDeposit, monthlyRent, monthlyEquivalent);
  const checklist = generateJeonseComparisonChecklist();
  
  return {
    content,
    cards,
    checklist
  };
}

// 전세 금액 추출
function extractJeonseAmount(text: string): number {
  const match = text.match(/(\d+)(억|천만|만)원?\s*전세/);
  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2];
    
    if (unit === '억') return amount * 100_000_000;
    if (unit === '천만') return amount * 10_000_000;
    if (unit === '만') return amount * 10_000;
  }
  return 0;
}

// 월세 보증금 추출
function extractMonthlyDeposit(text: string): number {
  const match = text.match(/(\d+)(억|천만|만)원?\s*(?:보증금|월세)/);
  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2];
    
    if (unit === '억') return amount * 100_000_000;
    if (unit === '천만') return amount * 10_000_000;
    if (unit === '만') return amount * 10_000;
  }
  return 0;
}

// 월세 추출
function extractMonthlyRent(text: string): number {
  const match = text.match(/월세\s*(\d+)만원/);
  if (match) {
    return parseInt(match[1]) * 10_000;
  }
  return 0;
}

// 전세→월세 환산율 계산
function calculateJeonseToMonthlyRate(jeonseAmount: number, monthlyDeposit: number, monthlyRent: number): number {
  // 일반적인 환산율: 전세금의 0.3-0.5%
  return 0.004; // 0.4%
}

// 월세 환산액 계산
function calculateMonthlyEquivalent(jeonseAmount: number, rate: number): number {
  return jeonseAmount * rate;
}

// 비교 내용 생성
function generateJeonseComparisonContent(jeonseAmount: number, monthlyDeposit: number, monthlyRent: number, monthlyEquivalent: number): string {
  const jeonseFormatted = formatAmount(jeonseAmount);
  const monthlyDepositFormatted = formatAmount(monthlyDeposit);
  const monthlyRentFormatted = formatAmount(monthlyRent);
  const monthlyEquivalentFormatted = formatAmount(monthlyEquivalent);
  
  let content = `전세와 월세를 비교해드리겠습니다!\n\n`;
  
  content += `📊 **비교 결과**\n`;
  content += `• 전세 ${jeonseFormatted}: 월 ${monthlyEquivalentFormatted}원 상당\n`;
  content += `• 월세 보증금 ${monthlyDepositFormatted} + 월세 ${monthlyRentFormatted}원\n\n`;
  
  if (monthlyEquivalent > monthlyRent) {
    content += `💡 **전문가 조언**\n`;
    content += `전세가 더 유리해 보여요! 월세 대비 월 ${formatAmount(monthlyEquivalent - monthlyRent)}원 정도 절약할 수 있습니다.\n\n`;
    content += `다만 보증금 차이(${formatAmount(jeonseAmount - monthlyDeposit)}원)를 고려하면, 보유 자금에 따라 선택이 달라질 수 있어요.`;
  } else {
    content += `💡 **전문가 조언**\n`;
    content += `월세가 더 유리해 보여요! 전세 대비 월 ${formatAmount(monthlyRent - monthlyEquivalent)}원 정도 절약할 수 있습니다.\n\n`;
    content += `보증금이 적어서 자금 부담이 덜하고, 투자 기회도 더 많을 수 있어요.`;
  }
  
  return content;
}

// 비교 카드 생성
function generateJeonseComparisonCards(jeonseAmount: number, monthlyDeposit: number, monthlyRent: number, monthlyEquivalent: number): Array<{
  title: string;
  subtitle?: string;
  monthly?: string;
  totalInterest?: string;
  notes?: string[];
}> {
  return [
    {
      title: "전세",
      subtitle: formatAmount(jeonseAmount),
      monthly: `월 ${formatAmount(monthlyEquivalent)}원 상당`,
      totalInterest: "보증금 높음, 월 부담 없음",
      notes: ["자금 부담 큼", "투자 기회 제한"]
    },
    {
      title: "월세",
      subtitle: `보증금 ${formatAmount(monthlyDeposit)}`,
      monthly: `월 ${formatAmount(monthlyRent)}원`,
      totalInterest: "보증금 낮음, 월 부담 있음",
      notes: ["자금 부담 적음", "투자 기회 많음"]
    }
  ];
}

// 체크리스트 생성
function generateJeonseComparisonChecklist(): string[] {
  return [
    "보유 자금 확인",
    "월 소득 대비 부담 계산",
    "투자 계획 고려",
    "거주 기간 고려",
    "시장 상황 분석"
  ];
}

// 금액 포맷팅
function formatAmount(amount: number): string {
  if (amount >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억원`;
  } else if (amount >= 10_000_000) {
    return `${(amount / 10_000_000).toFixed(0)}천만원`;
  } else if (amount >= 10_000) {
    return `${(amount / 10_000).toFixed(0)}만원`;
  } else {
    return `${amount.toLocaleString()}원`;
  }
}
