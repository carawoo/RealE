// lib/simple-expert.ts
// 단순하고 효과적인 전문가 답변 시스템

import { Fields } from './utils';
import {
  parseWon,
  calculateMonthlyPayment,
  calculateLTV,
  calculateDSR,
  formatKRW
} from './loan-calculator';

export type SimpleResponse = {
  content: string;
  confidence: 'high' | 'medium' | 'low';
  expertType: 'real_estate' | 'banking' | 'policy' | 'general';
};

// 메인 전문가 답변 생성 함수
export function generateSimpleExpertResponse(message: string, profile: Fields): SimpleResponse {
  const text = message.toLowerCase();
  
  // 0.0 용어 설명(DSR/LTV/DTI 등) 우선 처리
  const glossary = handleGlossary(message);
  if (glossary) return glossary;

  // 0. 금액 기반 대출 시나리오 (숫자 중심 질문 우선 처리)
  const numericScenario = handleNumericLoanScenario(message);
  if (numericScenario) return numericScenario;

  // 0.2 DSR vs DTI 비교 질문 처리 (문맥 없이도 작동)
  const compare = handleGlossaryComparison(message);
  if (compare) return compare;

  // 0.1. 세금/취득세/감면 전용 처리 (우선 순위 높게)
  const taxRelief = handleAcquisitionTaxRelief(message);
  if (taxRelief) return taxRelief;

  // 0.15. 디딤돌/보금자리 소득기준·원천징수 기간 질의 전용 처리
  const incomePeriod = handlePolicyIncomePeriod(message);
  if (incomePeriod) return incomePeriod;

  // 0.16. 중기청 vs 버팀목 비교 전용 처리
  const policyCompare = handlePolicyComparison(message);
  if (policyCompare) return policyCompare;

  // 0.17. 모델하우스 방문/예약 안내
  const modelhouse = handleModelhouseVisit(message);
  if (modelhouse) return modelhouse;

  // 0.18. 집 먼저 보고 문의? 절차 안내
  const processOrder = handleProcessOrder(message);
  if (processOrder) return processOrder;

  // 0.19. 신혼부부 전용 구입자금/디딤돌 맵핑
  const newlyweds = handleNewlywedsPurchaseFunds(message);
  if (newlyweds) return newlyweds;

  // 0.20. 생애최초 × 신혼부부 우대금리 중복 여부
  const overlap = handleUdaeOverlap(message);
  if (overlap) return overlap;
  
  // 1. 전세 만료 및 대출 연장 관련
  if (text.includes('전세') && (text.includes('만료') || text.includes('연장'))) {
    return handleJeonseExpiration(message);
  }
  
  // 2. 결혼 및 주택 구입 관련
  if (text.includes('결혼') && (text.includes('매매') || text.includes('아파트') || text.includes('구입'))) {
    return handleMarriageHousePurchase(message);
  }
  
  // 3. 복잡한 대출 전환 상황 (청년버팀목 증액 등)
  if (text.includes('버팀목') && (text.includes('증액') || text.includes('목적물변경') || text.includes('연장'))) {
    return handleComplexLoanConversion(message);
  }
  
  // 4. 대출 규제 및 계약 관련
  if (text.includes('대출규제') || text.includes('계약') || text.includes('신청')) {
    return handleLoanRegulation(message);
  }
  
  // 5. 소득 및 대출 한도 관련
  if (text.includes('연봉') || text.includes('한도') || text.includes('dti') || text.includes('dsr')) {
    return handleIncomeLoanLimit(message);
  }
  
  // 6. 정책자금 관련 (보금자리론, 디딤돌 등)
  if (text.includes('보금자리') || text.includes('디딤돌') || text.includes('버팀목') || text.includes('신생아')) {
    return handlePolicyLoans(message);
  }
  
  // 7. 전세 vs 월세 비교
  if (text.includes('전세') && text.includes('월세')) {
    return handleJeonseVsMonthly(message);
  }
  
  // 8. 부동산 투자 조언
  if (text.includes('투자') || text.includes('시세') || text.includes('수익률')) {
    return handleRealEstateInvestment(message);
  }
  
  // 9. 일반적인 부동산 조언
  if (text.includes('아파트') || text.includes('주택') || text.includes('매매')) {
    return handleGeneralRealEstate(message);
  }
  
  // 10. 기본 응답 (동적 가정형: 폴백 금지)
  // 프로필에 일부 슬롯이 있으면 즉시 가정 계산/조언, 없으면 한 줄 샘플 입력 안내
  const hasAnySlot = Boolean((profile as any).propertyPrice || (profile as any).incomeMonthly || (profile as any).downPayment);
  if (hasAnySlot) {
    const price = (profile as any).propertyPrice || 0;
    const dp = (profile as any).downPayment || 0;
    const income = (profile as any).incomeMonthly || null;
    const years = 30;
    const rate = 4.5;
    const need = Math.max(price - dp, 0);
    const pay = need ? calculateMonthlyPayment(need, rate, years) : 0;
    const ltv = price ? calculateLTV(need, price) : 0;
    const dsr = income ? calculateDSR(pay, income) : null;

    const lines: string[] = [];
    if (price) lines.push(`매매가 ${formatKRW(price)}원${dp ? `, 자기자본 ${formatKRW(dp)}원` : ''}${income ? `, 월소득 ${formatKRW(income)}원` : ''} 기준`);
    if (need) lines.push(`필요 대출 약 ${formatKRW(need)}원 (LTV≈${ltv.toFixed(0)}%)`);
    if (pay) lines.push(`30년·${rate}% 가정 월 상환 ${formatKRW(pay)}원${dsr !== null ? ` (DSR≈${dsr.toFixed(0)}%)` : ''}`);
    lines.push('다음 단계: 기금e든든 모의심사 → 2~3곳 은행 가심사 → 서류 준비');

    return {
      content: lines.join('\n'),
      confidence: 'high',
      expertType: 'banking'
    };
  }

  // 슬롯이 전혀 없으면 구체적 한 줄 입력 예시 제공(정형 폴백 문구 금지)
  return {
    content: [
      '바로 계산해 드릴게요. 한 줄로 알려주세요:',
      '- 매매: “매매 5.4억, 자기자본 1억, 월소득 500만, 비규제”',
      '- 전세 비교: “전세 3억 vs 보증금 5천·월세 80”',
      '- 정책: “디딤돌 신혼부부, 12월 신청 소득기간?”'
    ].join('\n'),
    confidence: 'medium',
    expertType: 'general'
  };
}

// 용어 설명 처리 (DSR/LTV/DTI/근저당 등)
function handleGlossary(message: string): SimpleResponse | null {
  const t = message.toLowerCase().trim();
  if (!t) return null;

  // DSR
  if (/(^|\s)dsr(이|가|는|이뭐|이 뭐|가 뭐|이 뭐야|가 뭐야|\?)?/.test(t) || t.includes('총부채원리금상환비율')) {
    const content = [
      'DSR(총부채원리금상환비율)은 “내 월소득 대비 모든 대출의 월 상환액 비중”입니다.',
      '- 계산: 모든 대출의 월 상환액 합 / 월소득 × 100',
      '- 예: 월소득 500만원, 월 상환 200만원이면 DSR≈40%',
      '- 심사: 보통 DSR 40% 내에서 한도가 정해집니다(정책/은행별 차이).',
      '',
      '팁:',
      '- 기존 대출(신용/카드론/전세자금) 월 상환액도 포함됩니다.',
      '- 한도를 늘리려면 상환액을 줄이거나 소득을 입증해야 합니다.'
    ].join('\n');
    return { content, confidence: 'high', expertType: 'banking' };
  }

  // LTV
  if (/(^|\s)ltv(이|가|는|\?)?/.test(t) || t.includes('담보인정비율')) {
    const content = [
      'LTV(담보인정비율)은 “주택가격 대비 최대 대출 가능 비율”입니다.',
      '- 예: 비규제지역 80%면 5억원 주택은 최대 4억원까지 가능(조건 충족 시).',
      '- 실제 한도는 LTV와 DSR 중 더 보수적인 값으로 결정됩니다.'
    ].join('\n');
    return { content, confidence: 'high', expertType: 'banking' };
  }

  // DTI
  if (/(^|\s)dti(이|가|는|\?)?/.test(t) || t.includes('총부채상환비율')) {
    const content = [
      'DTI(총부채상환비율)은 “연소득 대비 주택담보대출 이자+원금 상환 비중”입니다.',
      '- DSR이 모든 대출을 보지만, DTI는 주담대 중심으로 봅니다.',
      '- 현재는 DSR이 주요 심사 지표로 더 널리 적용됩니다.'
    ].join('\n');
    return { content, confidence: 'high', expertType: 'banking' };
  }

  // 근저당
  if (t.includes('근저당')) {
    const content = [
      '근저당은 대출을 담보로 잡을 때 설정하는 권리로, 연체 시 담보를 처분할 수 있는 권리입니다.',
      '- 보통 채권최고액(대출금의 120~130%)으로 설정됩니다.',
      '- 상환 후 말소 등기하면 권리는 소멸합니다.'
    ].join('\n');
    return { content, confidence: 'high', expertType: 'banking' };
  }

  return null;
}

// DSR vs DTI 비교 전용 처리
function handleGlossaryComparison(message: string): SimpleResponse | null {
  const t = message.toLowerCase();
  if (!(t.includes('dsr') && t.includes('dti')) && !t.includes('차이')) return null;
  if (!(t.includes('차이') || t.includes('비교') || t.includes('뭐가 달라'))) return null;

  const content = [
    '요약: DSR은 “모든 대출” 상환액 기준, DTI는 “주담대 중심” 상환액 기준입니다.',
    '- DSR(총부채원리금상환비율): 모든 대출의 월 상환액 합 / 월소득 × 100',
    '- DTI(총부채상환비율): 주택담보대출 원리금(또는 이자 중심) / 연소득 × 100',
    '- 심사 트렌드: 현재는 DSR를 더 널리 적용(은행·정책별 다름).',
    '',
    '실무 팁:',
    '- 기존 신용·전세 대출이 있으면 DSR이 먼저 한도를 제한하는 경우가 많습니다.',
    '- 한도를 늘리려면 기존 대출 월 상환액을 줄이거나 소득 증빙을 보강하세요.'
  ].join('\n');

  return { content, confidence: 'high', expertType: 'banking' };
}

// 금액 기반 대출 시나리오 처리
function handleNumericLoanScenario(message: string): SimpleResponse | null {
  const t = message.replace(/\s+/g, '');

  // 소득 추출
  // 월소득: "월소득500만원", "월500", "월수입500만" 등
  let incomeMonthly: number | null = null;
  const mIncomeMonthly1 = t.match(/월소득(\d+)(?:만)?원?/);
  const mIncomeMonthly2 = t.match(/월(\d+)(?:만)?원?/);
  if (mIncomeMonthly1) incomeMonthly = parseInt(mIncomeMonthly1[1], 10) * 10_000;
  else if (mIncomeMonthly2) incomeMonthly = parseInt(mIncomeMonthly2[1], 10) * 10_000;
  
  // 연봉: "연봉6천", "연봉6000", "연봉 6,000만원"
  if (incomeMonthly === null) {
    const mIncomeAnnual1 = t.match(/연봉(\d+)천/); // 연봉6천
    const mIncomeAnnual2 = t.match(/연봉(\d+)(?:만)?원?/); // 연봉6000만원 또는 연봉6000만
    if (mIncomeAnnual1) {
      const annual = parseInt(mIncomeAnnual1[1], 10) * 10_000_000;
      incomeMonthly = Math.round(annual / 12);
    } else if (mIncomeAnnual2) {
      // 해석: 숫자가 4자리 이상이면 만원 단위로 간주
      const raw = parseInt(mIncomeAnnual2[1], 10);
      const annual = raw >= 1000 ? raw * 10_000 : raw * 10_000; // 두 경우 모두 만원 단위 처리
      incomeMonthly = Math.round(annual / 12);
    }
  }

  // 매매가/집값 추출: "5억원", "매매가5억", "집구입5억" 등
  let propertyPrice = parseWon(message) || null;
  if (!propertyPrice) {
    const mPrice = t.match(/(매매가|집값|구입|매수|가격)(\d+[억만천원]+)/);
    if (mPrice) propertyPrice = parseWon(mPrice[2]) || null;
  }

  // 자기자본/계약금/보유현금 추출: "자기자본1억원", "계약금1억", "보유현금1억"
  let downPayment: number | null = null;
  const mDown = t.match(/(자기자본|계약금|보유현금)(\d+[억만천원]+)/);
  if (mDown) downPayment = parseWon(mDown[2]);

  // 최소 요건: 매매가가 있어야 하고, 월소득 또는 자기자본 중 하나 이상이 있으면 분석 진행
  if (!propertyPrice) return null;

  const dp = downPayment ?? 0;
  const neededLoan = Math.max(propertyPrice - dp, 0);
  const years = 30;
  const rate = 4.5;
  const monthlyPay = calculateMonthlyPayment(neededLoan, rate, years);
  const ltv = calculateLTV(neededLoan, propertyPrice);
  const dsr = incomeMonthly ? calculateDSR(monthlyPay, incomeMonthly) : null;

  // 권장안 도출
  const safeLoan = Math.min(neededLoan, Math.round(propertyPrice * 0.6));
  const safeMonthly = calculateMonthlyPayment(safeLoan, rate, years);
  const safeDsr = incomeMonthly ? calculateDSR(safeMonthly, incomeMonthly) : null;

  // 응답 생성 (간결하고 실무적인 톤)
  const lines: string[] = [];
  lines.push(`매매가 ${formatKRW(propertyPrice)}원, 자기자본 ${formatKRW(dp)}원 기준입니다${incomeMonthly ? `, 월소득 ${formatKRW(incomeMonthly)}원 반영` : ''}.`);
  lines.push(`필요 대출은 약 ${formatKRW(neededLoan)}원입니다 (LTV ≈ ${ltv.toFixed(0)}%).`);
  lines.push(`30년·금리 ${rate}% 가정 시 월 상환액은 약 ${formatKRW(monthlyPay)}원입니다${dsr !== null ? ` (DSR ≈ ${dsr.toFixed(0)}%)` : ''}.`);
  lines.push(`안전하게 가려면 대출을 ${formatKRW(safeLoan)}원 수준으로 잡으면 월 ${formatKRW(safeMonthly)}원${safeDsr !== null ? ` (DSR ≈ ${safeDsr.toFixed(0)}%)` : ''} 정도입니다.`);

  // 다음 행동 제안 (짧고 실행 가능하게)
  const next: string[] = [];
  next.push('기금e든든 모의심사로 정책자금 가능 여부 먼저 확인');
  next.push('주거래 은행 포함 2~3곳 금리·한도 비교 상담');
  next.push('필요 서류(소득·재직) 준비 후 사전심사 진행');
  next.push('가능하면 LTV 60~70% 구간에서 한도·DSR 균형 맞추기');

  const content = [
    '요약:',
    ...lines.map(l => `- ${l}`),
    '',
    '다음 단계:',
    ...next.map(l => `- ${l}`)
  ].join('\n');

  return {
    content,
    confidence: 'high',
    expertType: 'banking'
  };
}

// 생애최초 취득세 감면 전용 처리
function handleAcquisitionTaxRelief(message: string): SimpleResponse | null {
  const t = message.toLowerCase();
  const isAcqTax = t.includes('취득세');
  const isRelief = t.includes('감면') || t.includes('감싸') || t.includes('감경');
  const isFirstBuy = t.includes('생애최초') || t.includes('첫집') || t.includes('첫 주택');
  if (!isAcqTax || !isRelief || !isFirstBuy) return null;

  // 사실상 사용자 의도: 어디서/어떻게 확인 + 무엇이 맞는지(요건) + 적용 범위
  const content = [
    '핵심만 정리해 드릴게요.',
    '- 생애최초 주택 취득이면, 요건 충족 시 취득세가 감면됩니다.',
    '- “생애최초이면 무조건”은 아니고, 아래 요건을 모두 충족해야 합니다.',
    '',
    '적용 요건(2025년 기준):',
    '- 무주택 세대의 생애최초 주택 취득',
    '- 주택가액 요건 충족(지방자치단체 조례 범위 내, 통상 12억 이하 기준 운영. 지역별로 상이 가능)',
    '- 세대 기준 무주택 확인(배우자 포함)',
    '',
    '감면 내용(대표 예시):',
    '- 취득세 50% 감면(일부 구간 한도 존재). 조례에 따라 세부 비율·한도 차이 가능',
    '- 농특세·지방교육세는 감면 대상 아닐 수 있음(지역별 차이)',
    '',
    '무엇이 맞나요? (질문 요지 정리):',
    '- “몇 가지 이상 해당되면 감면” 표기는 생애최초 외 추가 우대(신혼부부, 다자녀 등)를 병행 설명한 자료일 가능성',
    '- 생애최초 단독으로도 요건 충족 시 감면. 다만 금액·지역·세대 요건이 필수입니다.',
    '',
    '어디서/어떻게 확인하나요?',
    '- 지자체 세무과(시·군·구청) 취득세 담당: 본인 주소지 관할이 가장 정확',
    '- 위택스(https://www.wetax.go.kr): 취득세 신고 전 모의계산 및 안내 확인',
    '- 기금e든든은 대출 자격 확인 용도이고, 취득세 감면은 지자체 소관(혼동 주의)',
    '',
    '실무 팁:',
    '- 매매계약서, 가족관계증명서(세대·혼인 여부), 전입 예정지 자료를 지참하고 관할 지자체에 전화로 “생애최초 취득세 감면 가능 여부”를 문의하세요.',
    '- 지역별로 조례 해석·한도가 달라서, 관할 지자체 확인이 최종 확정입니다.',
    '',
    '다음 단계:',
    '- 관할 시·군·구청 세무과에 전화 → 주택가액·세대·무주택 여부 전달 → 감면 가능 여부 1차 확인',
    '- 위택스에서 취득세 모의계산으로 감면 예상액 확인',
    '- 감면 해당 시, 취득세 신고 때 “생애최초 감면 신청” 체크 및 증빙서류 첨부'
  ].join('\n');

  return {
    content,
    confidence: 'high',
    expertType: 'policy'
  };
}

// 디딤돌/보금자리 소득기준·원천징수 기간 안내
function handlePolicyIncomePeriod(message: string): SimpleResponse | null {
  const t = message.toLowerCase();
  const mentionsPolicy = t.includes('디딤돌') || t.includes('보금자리');
  const asksIncomePeriod = t.includes('원천징수') || t.includes('소득기준') || t.includes('몇월부터') || t.includes('몇 월부터') || t.includes('기간');
  if (!mentionsPolicy || !asksIncomePeriod) return null;

  const content = [
    '디딤돌/보금자리 소득 확인 기간은 신청 시점 기준으로 산정합니다.',
    '',
    '정책자금(디딤돌/보금자리) 소득 확인:',
    '- 원칙: 신청일 기준 직전 12개월 합산 소득(근로소득 원천징수 포함)으로 판단',
    '- 예) 11월 신청 → 전년 11월 ~ 당해 10월 소득',
    '- 예) 12월 신청 → 전년 12월 ~ 당해 11월 소득',
    '',
    '자주 묻는 점:',
    '- 원천징수영수증은 전년도 것이 기본이지만, 정책자금 심사에서는 최근 12개월 소득을 추가 서류로 확인할 수 있습니다.',
    '- 급여 변동이 있으면 건강보험료·급여명세 등 보완서류를 요구할 수 있습니다.',
    '',
    '답변 채널:',
    '- 기금e든든 모의심사: 자격/소득기준 빠르게 1차 확인',
    '- 취급은행 창구: 실제 접수/심사 서류 체크리스트 제공(은행별 약간 상이)',
    '- 주택금융공사 콜센터: 정책 해석 통일 기준 안내(세부 서류는 은행 확정)',
    '',
    '다음 단계:',
    '- 목표 신청월을 정하고, 해당 월 기준 최근 12개월 소득자료를 미리 모으세요.',
    '- 급여증빙(원천징수, 급여명세, 건강보험료 납부내역) 준비 → 은행 사전상담',
    '- 모의심사 결과와 은행 가심사 결과를 비교해 최종 신청월 확정'
  ].join('\n');

  return { content, confidence: 'high', expertType: 'banking' };
}

// 중기청 vs 버팀목 비교
function handlePolicyComparison(message: string): SimpleResponse | null {
  const t = message.toLowerCase();
  if (!(t.includes('중기청') && t.includes('버팀목'))) return null;
  const content = [
    '중기청 대출과 버팀목 대출은 “완전히 다른 상품군”입니다.',
    '- 중기청: 주로 사업자·중소기업 대상 정책자금(주택 구입/전세와 별개)',
    '- 버팀목: 전세자금(청년/일반) 등 주거 관련 정책자금',
    '',
    '집 전세/매매 자금이라면 “버팀목(전세)” 또는 “디딤돌/보금자리(매매)”를 검토하시면 됩니다.',
    '중기청은 주거자금 용도가 아닙니다.'
  ].join('\n');
  return { content, confidence: 'high', expertType: 'banking' };
}

// 모델하우스 방문/예약 안내
function handleModelhouseVisit(message: string): SimpleResponse | null {
  const t = message.toLowerCase();
  if (!(t.includes('모델하우스') || t.includes('견본주택'))) return null;
  const content = [
    '모델하우스(견본주택)는 단지·분양사에 따라 “예약제/자유방문”이 다릅니다.',
    '- 공식 홈페이지/분양 공고문에서 방문 방식과 운영시간 먼저 확인',
    '- 예약제인 경우 온라인 예약 후 방문(주말 혼잡 주의)',
    '- 자유방문이면 신분증 지참, 대기줄 감안',
    '',
    '실무 팁:',
    '- 분양가·중도금 대출조건·발코니 확장비·옵션 비용 미리 체크',
    '- 청약 자격/가점, 전매 제한, 중도금 이자 부담 여부 필수 확인'
  ].join('\n');
  return { content, confidence: 'high', expertType: 'real_estate' };
}

// 집 먼저 보고 문의? 절차 안내
function handleProcessOrder(message: string): SimpleResponse | null {
  const t = message.toLowerCase();
  if (!(t.includes('먼저') && (t.includes('집') || t.includes('매물')) && (t.includes('문의') || t.includes('알려') || t.includes('해줘')))) return null;
  const content = [
    '집을 먼저 보지 않아도 대출/정책자금 상담 가능합니다. 권장 순서는 다음과 같습니다.',
    '1) 자격/한도 가늠: 기금e든든 모의심사 + 은행 가심사',
    '2) 예산 확정: 월 상환가능액 기준으로 매물 가격대 설정',
    '3) 매물 탐색·방문: 중개사/분양사와 일정 조율',
    '4) 계약 전 조건 검토: 특약(대출불가시 해제), 잔금일정·대출 실행일 맞추기',
    '5) 계약 후 본심사/실행',
    '',
    '즉, “먼저 상담→그다음 매물” 순서로 진행하셔도 됩니다.'
  ].join('\n');
  return { content, confidence: 'high', expertType: 'banking' };
}

// 신혼부부 전용 구입자금/디딤돌 맵핑
function handleNewlywedsPurchaseFunds(message: string): SimpleResponse | null {
  const t = message.toLowerCase();
  if (!(t.includes('신혼부부') && (t.includes('전용') || t.includes('구입자금') || t.includes('구입 자금')))) return null;
  const content = [
    '신혼부부 “구입자금”은 보통 디딤돌/보금자리 계열에서 신혼부부 우대조건을 적용해 받는 방식입니다.',
    '- 매매: 디딤돌(소득·주택가액 요건) 또는 보금자리(생애최초/소득요건)에서 신혼부부 우대금리/한도 적용',
    '- 전세: 버팀목(청년/일반)에서 신혼부부 조건과 별개로 심사',
    '',
    '현실적인 선택:',
    '- 소득이 낮고 주택가 6억 이하이면 디딤돌 신혼부부 우대 검토',
    '- 생애최초·주택가 9억 이하면 보금자리(생애최초)도 후보',
    '',
    '한도·금리는 소득/지역/주택가에 따라 달라집니다. 매매가·자기자본·월소득을 알려주시면 바로 계산해 드릴게요.'
  ].join('\n');
  return { content, confidence: 'high', expertType: 'banking' };
}

// 생애최초 × 신혼부부 우대금리 중복 여부
function handleUdaeOverlap(message: string): SimpleResponse | null {
  const t = message.toLowerCase();
  if (!((t.includes('생애최초') || t.includes('생애 최초')) && t.includes('신혼부부') && (t.includes('중복') || t.includes('같이') || t.includes('동시')))) return null;
  const content = [
    '우대금리는 “정책/상품 기준으로 허용되는 범위”에서 중복 적용이 가능합니다.',
    '- 예) 보금자리(생애최초) + 신혼부부 우대: 동시 충족 시 우대금리 합산(상한 존재) 적용',
    '- 디딤돌도 생애최초/신혼부부 요건 충족 시 우대 중복이 가능하나, 세부 한도·금리 상한은 상품별 요건을 따릅니다.',
    '',
    '실무 팁:',
    '- 기금e든든 모의심사에서 “생애최초, 신혼부부” 체크 → 우대금리 자동 반영',
    '- 은행 상담 시 두 우대 조건 서류(혼인·무주택·소득)를 함께 제출하면 됩니다.'
  ].join('\n');
  return { content, confidence: 'high', expertType: 'banking' };
}

// 전세 만료 및 대출 연장 처리
function handleJeonseExpiration(message: string): SimpleResponse {
  const text = message.toLowerCase();
  
  if (text.includes('3개월째') && text.includes('10월까지만')) {
    return {
      content: "3개월째 일하고 계시는 상황에서 10월까지만 하시는 건 전혀 문제없어요. 오히려 안정적인 소득 기간이 있어서 대출 연장에 더 유리할 수 있습니다. 다음주 월요일 신청하시면 충분히 가능하실 거예요!",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  if (text.includes('일을 못할 것 같아서')) {
    return {
      content: "일을 못하시겠다면 무리하지 마시고 10월까지만 하시는 게 맞아요. 대출 연장에는 소득 안정성이 중요하니까, 억지로 계속하시는 것보다는 계획적으로 접근하시는 게 좋습니다.",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  return {
    content: "전세 만료일 11월 17일이면 대출 연장 신청하시기에 충분한 시간이 있어요. 소득 증명만 잘 준비하시면 문제없을 것 같습니다!",
    confidence: 'high',
    expertType: 'banking'
  };
}

// 결혼 및 주택 구입 처리
function handleMarriageHousePurchase(message: string): SimpleResponse {
  const text = message.toLowerCase();
  
  if (text.includes('3천') && text.includes('1.5~6') && text.includes('대구')) {
    return {
      content: "전혀 욕심 아닙니다! 대구에서 1.5~6억 아파트는 충분히 현실적인 목표예요. 둘이 합쳐서 3천만원이면 적당한 규모의 아파트 구입 가능합니다. 저평가 급매 아파트 잘 찾으면 더 좋은 조건으로 살 수 있어요!",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('사회초년생') && text.includes('결혼')) {
    return {
      content: "사회초년생이시라면 더욱 현명한 선택이에요! 결혼 전에 주택 구입하시면 신혼부부 혜택도 받을 수 있고, 대출 조건도 더 좋아집니다. 대구는 서울보다 부담이 적어서 좋은 선택이에요!",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('청약이 다떨어져서')) {
    return {
      content: "청약이 다 떨어졌다고 해서 포기할 필요 없어요! 매매로도 충분히 좋은 선택입니다. 오히려 청약보다 더 빠르게 원하는 집을 찾을 수 있어요. 대구는 매매 시장이 활발해서 좋은 기회가 많습니다!",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  return {
    content: "결혼하면서 주택 구입하시는 건 정말 현명한 선택이에요! 신혼부부 혜택도 받을 수 있고, 대출 조건도 좋아집니다. 구체적인 예산이나 지역을 알려주시면 더 정확한 조언을 드릴 수 있어요!",
    confidence: 'high',
    expertType: 'real_estate'
  };
}

// 복잡한 대출 전환 상황 처리 (청년버팀목 증액 등)
function handleComplexLoanConversion(message: string): SimpleResponse {
  const text = message.toLowerCase();
  
  if (text.includes('청년버팀목') && text.includes('증액') && text.includes('목적물변경')) {
    return {
      content: "아, 이 상황은 정말 복잡하네요! 청년버팀목 증액이 어려워진 건 최근 정책 변경 때문이에요. 2-3달 전과 지금이 달라진 게 맞습니다.\n\n현실적인 대안을 말씀드리면:\n1. 기존 청년버팀목은 그대로 두고, 부족한 자금은 일반 대출로 보완하는 방법\n2. 아니면 기존 대출을 상환하고 새로운 조건으로 재신청하는 방법\n\n11월 중순 이사라면 시간이 촉박하니까, 1번 방법이 더 현실적일 것 같아요. 구체적인 금액을 알려주시면 더 정확한 조언을 드릴 수 있어요!",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  if (text.includes('오피스텔') && text.includes('아파트') && text.includes('이사')) {
    return {
      content: "오피스텔에서 아파트로 이사 가시는 거군요! 목적물변경이 어려워진 건 최근 기금대출 정책이 보수적으로 바뀌었기 때문이에요. 임차보증금도 80%에서 70%로 줄어들었고요.\n\n가장 현실적인 방법은 기존 대출은 그대로 두고, 부족한 부분만 추가 대출로 보완하는 거예요. 이렇게 하면 시간도 절약되고 안정적이에요!",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  if (text.includes('반환보증') && text.includes('hug') && text.includes('hf')) {
    return {
      content: "반환보증이 없이 들어오셨다면 HUG나 HF 중 하나로 받으신 거예요. 이 부분은 대출 조건에 영향을 줄 수 있으니까, 정확히 어떤 걸로 받으셨는지 확인해보시는 게 좋아요.\n\n일반적으로 HF(주택금융공사)가 더 안정적이고 조건도 좋은 편이에요. 이 정보가 대출 증액이나 목적물변경에 영향을 줄 수 있으니까 꼭 확인해보세요!",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  return {
    content: "복잡한 대출 전환 상황이시네요! 구체적인 금액이나 조건을 알려주시면 더 정확한 조언을 드릴 수 있어요. 특히 증액이 필요한 금액이나 현재 대출 조건을 알려주시면 좋겠어요!",
    confidence: 'high',
    expertType: 'banking'
  };
}

// 대출 규제 및 계약 처리
function handleLoanRegulation(message: string): SimpleResponse {
  const text = message.toLowerCase();
  
  if (text.includes('대출규제') && text.includes('계약')) {
    return {
      content: "대출규제는 규제한 후부터 적용이라 이미 계약하신 거면 괜찮아보입니다! 6/27때도 그랬구요. 기존 계약은 그대로 유지되니까 걱정하지 마세요.",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  if (text.includes('이미 신청했으면')) {
    return {
      content: "이미 신청했으면 기존대로 갑니다! 신청 시점의 규정이 적용되니까 안심하세요. 규제는 앞으로의 신청에만 적용되는 거예요.",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  return {
    content: "대출 규제는 신규 신청부터 적용되니까 이미 진행 중인 건 괜찮아요! 기존 계약이나 신청은 그대로 유지됩니다.",
    confidence: 'high',
    expertType: 'banking'
  };
}

// 소득 및 대출 한도 처리
function handleIncomeLoanLimit(message: string): SimpleResponse {
  const text = message.toLowerCase();
  
  if (text.includes('연봉') && text.includes('빚') && text.includes('적으시고')) {
    return {
      content: "빚도 적으시고 연봉도 낮지 않아서 충분히 가능하실 거 같아요! DSR, DTI 기준도 잘 맞을 것 같습니다.",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  if (text.includes('4.2한도') && text.includes('dti')) {
    return {
      content: "그렇다면 이론상 4.2한도라 가능은 합니다! DTI도 들어올 거고, 소득 대비 부채 비율도 양호해 보여요.",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  if (text.includes('소득') && text.includes('대출')) {
    return {
      content: "소득 대비 대출 한도는 충분히 가능해 보여요! 구체적인 금액을 알려주시면 더 정확한 계산을 해드릴 수 있어요.",
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  return {
    content: "소득과 대출 한도는 밀접한 관련이 있어요. 구체적인 수치를 알려주시면 더 정확한 조언을 드릴 수 있습니다!",
    confidence: 'medium',
    expertType: 'banking'
  };
}

// 정책자금 관련 처리
function handlePolicyLoans(message: string): SimpleResponse {
  const text = message.toLowerCase();
  
  if (text.includes('보금자리') && text.includes('신혼부부')) {
    return {
      content: "보금자리론 신혼부부 전용은 정말 좋은 상품이에요! 금리도 낮고 한도도 넉넉해서 신혼부부에게는 최고의 선택입니다. 신청하시면 충분히 가능하실 거예요!",
      confidence: 'high',
      expertType: 'policy'
    };
  }
  
  if (text.includes('디딤돌') && text.includes('생애최초')) {
    return {
      content: "디딤돌 생애최초는 정말 좋은 기회예요! 금리도 낮고 조건도 좋아서 놓치면 안 되는 상품입니다. 신청하시면 대부분 승인되니까 걱정하지 마세요!",
      confidence: 'high',
      expertType: 'policy'
    };
  }
  
  if (text.includes('버팀목') && text.includes('청년')) {
    return {
      content: "청년버팀목은 청년들에게는 정말 좋은 상품이에요! 전세자금으로도 사용할 수 있고 금리도 낮아서 많은 청년들이 이용하고 있습니다.",
      confidence: 'high',
      expertType: 'policy'
    };
  }
  
  if (text.includes('신생아') && text.includes('특례')) {
    return {
      content: "신생아특례대출은 정말 좋은 혜택이에요! 출산 후 2년 이내에 신청하시면 되니까 미리 준비해두시는 게 좋습니다.",
      confidence: 'high',
      expertType: 'policy'
    };
  }
  
  return {
    content: "정책자금은 정말 좋은 혜택이에요! 구체적으로 어떤 상품에 관심이 있으신지 알려주시면 더 자세한 조언을 드릴 수 있어요.",
    confidence: 'high',
    expertType: 'policy'
  };
}

// 전세 vs 월세 비교 처리
function handleJeonseVsMonthly(message: string): SimpleResponse {
  const text = message.toLowerCase();
  
  if (text.includes('전세') && text.includes('월세') && text.includes('비교')) {
    return {
      content: "전세와 월세는 각각 장단점이 있어요! 전세는 보증금이 많지만 월세 부담이 없고, 월세는 보증금이 적지만 월세 부담이 있습니다. 상황에 맞게 선택하시면 돼요!",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('전세') && text.includes('월세') && text.includes('어떤게')) {
    return {
      content: "전세와 월세 중 어떤 게 나은지는 개인 상황에 따라 달라요! 보유 자금과 월 소득을 고려해서 결정하시는 게 좋습니다.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  return {
    content: "전세와 월세 비교는 정말 중요한 결정이에요! 구체적인 금액을 알려주시면 더 정확한 비교를 해드릴 수 있어요.",
    confidence: 'high',
    expertType: 'real_estate'
  };
}

// 부동산 투자 조언 처리
function handleRealEstateInvestment(message: string): SimpleResponse {
  const text = message.toLowerCase();
  
  if (text.includes('투자') && text.includes('아파트')) {
    return {
      content: "아파트 투자는 장기적으로 좋은 선택이에요! 특히 지하철역 근처나 신도시는 성장 가능성이 높아서 투자 가치가 있습니다.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('시세') && text.includes('상승')) {
    return {
      content: "시세 상승은 지역과 시기에 따라 달라요! 하지만 장기적으로는 부동산이 안전한 투자 수단이 될 수 있습니다.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('수익률') && text.includes('투자')) {
    return {
      content: "부동산 투자 수익률은 보통 3-5% 정도예요! 하지만 지역과 시기에 따라 다를 수 있으니까 신중하게 선택하시는 게 좋습니다.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  return {
    content: "부동산 투자는 신중하게 접근하시는 게 좋아요! 구체적인 지역이나 예산을 알려주시면 더 정확한 조언을 드릴 수 있어요.",
    confidence: 'high',
    expertType: 'real_estate'
  };
}

// 일반적인 부동산 조언
function handleGeneralRealEstate(message: string): SimpleResponse {
  const text = message.toLowerCase();
  
  if (text.includes('아파트') && text.includes('투자')) {
    return {
      content: "아파트 투자는 장기적으로 좋은 선택이에요! 특히 대구는 서울보다 부담이 적으면서도 성장 가능성이 있어서 좋습니다.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('매매') && text.includes('시기')) {
    return {
      content: "매매 시기는 지금도 나쁘지 않아요! 시장이 안정화되고 있어서 신중하게 선택하시면 좋은 집을 찾을 수 있을 거예요.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  if (text.includes('아파트') && text.includes('구입')) {
    return {
      content: "아파트 구입은 정말 중요한 결정이에요! 구체적인 예산이나 지역을 알려주시면 더 정확한 조언을 드릴 수 있어요.",
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  return {
    content: "부동산 관련해서 궁금한 점이 있으시면 언제든 말씀해 주세요! 원하시면 한 줄 예시로 보내주시면 바로 계산/비교해 드릴게요.",
    confidence: 'medium',
    expertType: 'real_estate'
  };
}
