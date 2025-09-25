// lib/simple-expert.ts
// 고도화된 의도 분석 기반 전문가 답변 시스템

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

// ---------- 고도화된 의도 분석 시스템 ----------
function extractIntent(message: string): {
  primaryIntent: 'question' | 'calculation' | 'comparison' | 'advice' | 'procedure';
  secondaryIntents: string[];
  topics: string[];
  urgency: 'high' | 'medium' | 'low';
  confidence: number;
} {
  const text = message.toLowerCase();
  
  // 유연한 패턴 매칭 (정규식 기반)
  const questionPatterns = /어떻게|뭐야?|무엇|언제|어디서?|왜|어떤|몇|\?|궁금|알고싶|확인/;
  const calcPatterns = /계산|얼마|한도|금액|비용|월상환|원|가능할까|ltv|dsr|상환액/;
  const compPatterns = /비교|vs|차이|어떤게|어떤\s*게|더\s*좋|낫|어느|선택/;
  const advicePatterns = /추천|조언|도움|방법|어떻게\s*해야|좋을까|무슨\s*대출|해야할지|가이드/;
  const procedurePatterns = /절차|순서|단계|방법|어떻게\s*하|신청|진행/;
  
  // 주제별 분류 (정규식으로 더 유연하게)
  const topics: string[] = [];
  if (/대출|자금|융자|차입/.test(text)) topics.push('loan');
  if (/매매|구입|구매|주택|아파트|집|부동산/.test(text)) topics.push('purchase');
  if (/전세|월세|임대|보증금|렌트/.test(text)) topics.push('rental');
  if (/정책|디딤돌|보금자리|버팀목|청년|신혼|생애최초/.test(text)) topics.push('policy');
  if (/세금|취득세|중개수수료|법무사|등기|수수료/.test(text)) topics.push('tax');
  if (/투자|시세|수익|가격|상승|하락/.test(text)) topics.push('investment');
  if (/dsr|ltv|dti|근저당|담보|금리/.test(text)) topics.push('glossary');
  
  // 우선순위 기반 의도 분석
  let primaryIntent: 'question' | 'calculation' | 'comparison' | 'advice' | 'procedure' = 'question';
  const secondaryIntents: string[] = [];
  let confidence = 0.5;
  
  if (procedurePatterns.test(text)) {
    primaryIntent = 'procedure';
    confidence = 0.9;
  } else if (calcPatterns.test(text)) {
    primaryIntent = 'calculation';
    confidence = 0.85;
  } else if (compPatterns.test(text)) {
    primaryIntent = 'comparison';
    confidence = 0.8;
  } else if (advicePatterns.test(text)) {
    primaryIntent = 'advice';
    confidence = 0.75;
  } else if (questionPatterns.test(text)) {
    primaryIntent = 'question';
    confidence = 0.7;
  }
  
  // 보조 의도 추출
  if (questionPatterns.test(text) && primaryIntent !== 'question') secondaryIntents.push('question');
  if (calcPatterns.test(text) && primaryIntent !== 'calculation') secondaryIntents.push('calculation');
  if (compPatterns.test(text) && primaryIntent !== 'comparison') secondaryIntents.push('comparison');
  if (advicePatterns.test(text) && primaryIntent !== 'advice') secondaryIntents.push('advice');
  
  // 긴급도 분석 (더 세밀하게)
  const urgency = /급해|빨리|당장|내일|이번주|시급|긴급/.test(text) ? 'high' : 
                 /곧|빠른시일|조만간|가능한/.test(text) ? 'medium' : 'low';
  
  return {
    primaryIntent,
    secondaryIntents,
    topics,
    urgency,
    confidence
  };
}

// ---------- 스마트 금액 추출 시스템 ----------
function extractFinancialInfo(message: string): {
  amounts: {
    value: number;
    type: 'property' | 'income_monthly' | 'income_annual' | 'down_payment' | 'debt' | 'unknown';
    confidence: number;
  }[];
  propertyPrice: number | null;
  monthlyIncome: number | null;
  downPayment: number | null;
  existingDebt: number | null;
} {
  const text = message;
  const amounts: { value: number; type: 'property' | 'income_monthly' | 'income_annual' | 'down_payment' | 'debt' | 'unknown'; confidence: number }[] = [];
  
  // 다양한 숫자 표현 방식 인식
  const patterns = [
    { regex: /(\d+(?:\.\d+)?)억/g, multiplier: 100_000_000, unit: '억' },
    { regex: /(\d+(?:\.\d+)?)천만/g, multiplier: 10_000_000, unit: '천만' },
    { regex: /(\d+(?:\.\d+)?)백만/g, multiplier: 1_000_000, unit: '백만' },
    { regex: /(\d+(?:\.\d+)?)만원/g, multiplier: 10_000, unit: '만원' },
    { regex: /(\d+(?:\.\d+)?)만/g, multiplier: 10_000, unit: '만' },
    { regex: /(\d+(?:,\d{3})*)원/g, multiplier: 1, unit: '원' }
  ];
  
  patterns.forEach(({ regex, multiplier, unit }) => {
    const matches = text.matchAll(regex);
    for (const match of matches) {
      const numStr = match[1].replace(/,/g, '');
      const value = parseFloat(numStr) * multiplier;
      
      // 문맥 기반 타입 분류
      const beforeText = text.substring(Math.max(0, match.index! - 20), match.index!);
      const afterText = text.substring(match.index! + match[0].length, match.index! + match[0].length + 20);
      const context = (beforeText + afterText).toLowerCase();
      
      let type: 'property' | 'income_monthly' | 'income_annual' | 'down_payment' | 'debt' | 'unknown' = 'unknown';
      let confidence = 0.5;
      
      // 매매가/주택가격 식별
      if (/매매|매매가|집값|주택가|아파트.*가격|부동산.*가격|구입.*가격/.test(context)) {
        type = 'property';
        confidence = 0.9;
      }
      // 월소득 식별
      else if (/월소득|월급|월수입|월.*소득/.test(context)) {
        type = 'income_monthly';
        confidence = 0.9;
      }
      // 연봉 식별
      else if (/연봉|연소득|년소득|연.*수입/.test(context)) {
        type = 'income_annual';
        confidence = 0.9;
      }
      // 자기자본/계약금 식별
      else if (/자기자본|계약금|보유.*자금|현금|다운.*페이먼트/.test(context)) {
        type = 'down_payment';
        confidence = 0.9;
      }
      // 기존 부채 식별
      else if (/빚|부채|대출.*잔액|기존.*대출/.test(context)) {
        type = 'debt';
        confidence = 0.8;
      }
      // 금액 범위로 추정
      else {
        if (value >= 100_000_000) { // 1억 이상
          type = 'property';
          confidence = 0.6;
        } else if (value >= 2_000_000 && value <= 20_000_000) { // 200만~2천만
          type = 'income_monthly';
          confidence = 0.6;
        } else if (value >= 20_000_000 && value <= 200_000_000) { // 2천만~2억
          type = value >= 50_000_000 ? 'down_payment' : 'income_annual';
          confidence = 0.5;
        }
      }
      
      amounts.push({ value, type, confidence });
    }
  });
  
  // 최고 신뢰도 기준으로 각 타입별 대표값 추출
  const getTopValue = (targetType: string) => {
    const candidates = amounts.filter(a => a.type === targetType);
    if (candidates.length === 0) return null;
    return candidates.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    ).value;
  };
  
  const propertyPrice = getTopValue('property');
  let monthlyIncome = getTopValue('income_monthly');
  const annualIncome = getTopValue('income_annual');
  const downPayment = getTopValue('down_payment');
  const existingDebt = getTopValue('debt');
  
  // 연봉을 월소득으로 변환
  if (!monthlyIncome && annualIncome) {
    monthlyIncome = Math.round(annualIncome / 12);
  }
  
  return {
    amounts,
    propertyPrice,
    monthlyIncome,
    downPayment,
    existingDebt
  };
}

// ---------- 점진적 응답 전략 기반 메인 함수 ----------
export function generateSimpleExpertResponse(message: string, profile: Fields): SimpleResponse {
  const intent = extractIntent(message);
  const financial = extractFinancialInfo(message);
  
  // 1단계: 명확한 용어 설명 (최우선)
  if (intent.topics.includes('glossary') || intent.primaryIntent === 'question') {
    const glossary = handleFlexibleGlossary(message);
    if (glossary) return glossary;
    
    const comparison = handleGlossaryComparison(message);
    if (comparison) return comparison;
  }
  
  // 2단계: 구체적 숫자가 있는 계산 (높은 우선순위)
  if (intent.primaryIntent === 'calculation' || financial.amounts.length > 0) {
    const calculation = handleSmartCalculation(message, financial);
    if (calculation) return calculation;
  }
  
  // 3단계: 비교 요청 처리
  if (intent.primaryIntent === 'comparison') {
    const comparison = handleSmartComparison(message, intent);
    if (comparison) return comparison;
  }
  
  // 4단계: 절차/방법 안내
  if (intent.primaryIntent === 'procedure') {
    const procedure = handleProcedureGuidance(message, intent);
    if (procedure) return procedure;
  }
  
  // 5단계: 주제별 전문 조언
  const topicAdvice = handleTopicBasedAdvice(message, intent, financial);
  if (topicAdvice) return topicAdvice;
  
  // 6단계: 프로필 기반 개인화 응답
  if (hasUsableProfile(profile)) {
    const profileResponse = generateProfileBasedResponse(profile, intent, financial);
    if (profileResponse) return profileResponse;
  }
  
  // 7단계: 지능적 주제별 폴백 (마지막 단계)
  return generateTopicAwareFallback(message, intent, financial);
}

// ---------- 새로운 핸들러 함수들 구현 ----------

// 1단계: 유연한 용어 설명 처리 (정규식 기반)
function handleFlexibleGlossary(message: string): SimpleResponse | null {
  const t = message.toLowerCase().trim();
  if (!t) return null;

  // DSR - 더 유연한 패턴 매칭
  if (/dsr|총부채원리금상환비율|총.*부채.*원리금|부채.*상환.*비율/.test(t)) {
    const content = [
      'DSR(총부채원리금상환비율)은 "내 월소득 대비 모든 대출의 월 상환액 비중"입니다.',
      '',
      '📊 계산 방법:',
      '• 모든 대출의 월 상환액 합 ÷ 월소득 × 100',
      '• 예: 월소득 500만원, 월 상환 200만원 → DSR 40%',
      '',
      '📊 심사 기준:',
      '• 보통 DSR 40% 이내에서 한도 결정',
      '• 정책자금은 더 엄격할 수 있음',
      '',
      '💡 실무 팁:',
      '• 신용대출, 카드론, 전세대출 모두 포함',
      '• 한도 늘리려면 기존 대출 상환 or 소득 증빙 보강',
      '• 부부합산 시 더 유리할 수 있음'
    ].join('\n');
    return { content, confidence: 'high', expertType: 'banking' };
  }

  // LTV - 더 유연한 패턴 매칭
  if (/ltv|담보인정비율|담보.*비율/.test(t)) {
    const content = [
      'LTV(담보인정비율)은 "주택가격 대비 최대 대출 가능 비율"입니다.',
      '',
      '📊 기본 개념:',
      '• 대출금액 ÷ 주택가격 × 100',
      '• 예: 5억원 주택, 4억원 대출 → LTV 80%',
      '',
      '📊 지역별 한도:',
      '• 비규제지역: 보통 80%',
      '• 규제지역: 60-70% (투기지역 더 엄격)',
      '• 정책자금: 별도 기준 적용',
      '',
      '💡 실무 팁:',
      '• 실제 한도는 LTV와 DSR 중 더 보수적인 값',
      '• 신축 vs 기존 주택에 따라 차이',
      '• 감정가 vs 매매가 중 낮은 값 기준'
    ].join('\n');
    return { content, confidence: 'high', expertType: 'banking' };
  }

  // DTI - 더 유연한 패턴 매칭
  if (/dti|총부채상환비율|부채.*상환.*비율/.test(t)) {
    const content = [
      'DTI(총부채상환비율)은 "연소득 대비 주택담보대출 상환 비중"입니다.',
      '',
      '📊 DSR과의 차이:',
      '• DTI: 주로 주택담보대출만 고려',
      '• DSR: 모든 대출 포함',
      '• 현재는 DSR이 주요 심사 기준',
      '',
      '💡 참고사항:',
      '• 과거 주요 규제 지표였음',
      '• 현재는 DSR 보조 역할',
      '• 일부 상품에서 여전히 적용'
    ].join('\n');
    return { content, confidence: 'high', expertType: 'banking' };
  }

  // 근저당 - 더 유연한 패턴 매칭
  if (/근저당|담보.*설정|저당.*설정/.test(t)) {
    const content = [
      '근저당은 대출 담보로 부동산에 설정하는 권리입니다.',
      '',
      '📊 기본 개념:',
      '• 대출 연체 시 담보 처분 권리',
      '• 채권최고액으로 설정 (보통 대출금의 120-130%)',
      '• 등기부등본에 기재됨',
      '',
      '💡 실무 정보:',
      '• 대출 실행과 동시에 설정',
      '• 상환 완료 후 말소 등기 필요',
      '• 말소 등기비는 차주 부담이 일반적'
    ].join('\n');
    return { content, confidence: 'high', expertType: 'banking' };
  }

  return null;
}

// 2단계: 스마트 계산 처리 (개선된 금액 추출 활용)
function handleSmartCalculation(message: string, financial: any): SimpleResponse | null {
  const { propertyPrice, monthlyIncome, downPayment, existingDebt } = financial;
  
  // 최소 조건: 매매가 또는 명확한 금액이 있어야 함
  if (!propertyPrice && financial.amounts.length === 0) return null;
  
  // 기존 로직 활용하되 더 스마트하게
  if (propertyPrice) {
    const dp = downPayment || 0;
    const neededLoan = Math.max(propertyPrice - dp, 0);
    const years = 30;
    const rate = 4.5;
    const monthlyPay = calculateMonthlyPayment(neededLoan, rate, years);
    const ltv = calculateLTV(neededLoan, propertyPrice);
    const dsr = monthlyIncome ? calculateDSR(monthlyPay, monthlyIncome) : null;
    
    // 부채 고려한 실제 DSR
    let actualDsr = dsr;
    if (existingDebt && monthlyIncome) {
      const estimatedDebtPayment = existingDebt * 0.03; // 3% 가정
      actualDsr = calculateDSR(monthlyPay + estimatedDebtPayment, monthlyIncome);
    }
    
    const content = [
      `매매가 ${formatKRW(propertyPrice)}원 기준 분석 결과:`,
      `• 필요 대출: ${formatKRW(neededLoan)}원 (LTV ${ltv.toFixed(0)}%)`,
      `• 월 상환액: ${formatKRW(monthlyPay)}원 (30년, 금리 ${rate}%)`,
      monthlyIncome ? `• 예상 DSR: ${actualDsr ? actualDsr.toFixed(0) : dsr?.toFixed(0)}%` : '',
      existingDebt ? `• 기존 부채 고려: ${formatKRW(existingDebt)}원` : '',
      '',
      '✅ 실행 가능성:',
      ltv <= 80 ? '• LTV 조건 양호' : '• ⚠️ LTV 높음 (자기자본 확대 권장)',
      actualDsr && actualDsr <= 40 ? '• DSR 조건 양호' : actualDsr && actualDsr > 40 ? '• ⚠️ DSR 높음 (소득 증빙 보강 필요)' : '',
      '',
      '🎯 다음 단계: 기금e든든 모의심사 → 은행 가심사 → 서류 준비'
    ].filter(Boolean).join('\n');
    
    return {
      content,
      confidence: 'high',
      expertType: 'banking'
    };
  }
  
  return null;
}

// 3단계: 스마트 비교 처리
function handleSmartComparison(message: string, intent: any): SimpleResponse | null {
  const text = message.toLowerCase();
  
  // DSR vs DTI 비교
  if (/dsr.*dti|dti.*dsr/.test(text) && /차이|비교|뭐가|다른/.test(text)) {
    const content = [
      '💡 DSR vs DTI 핵심 차이점:',
      '',
      '📊 DSR (총부채원리금상환비율):',
      '• 모든 대출의 월 상환액 ÷ 월소득 × 100',
      '• 신용대출, 카드론, 전세대출 등 모두 포함',
      '• 현재 주요 심사 기준 (40% 이내 권장)',
      '',
      '📊 DTI (총부채상환비율):',
      '• 주택담보대출 상환액 ÷ 연소득 × 100',
      '• 주로 주담대만 고려',
      '• 과거 주요 기준, 현재는 보조적 활용',
      '',
      '🎯 실무 적용:',
      '• 기존 대출 多 → DSR이 먼저 한도 제한',
      '• 무부채 상태 → DSR/DTI 비슷한 수준',
      '• 한도 늘리려면 → 기존 대출 상환 or 소득 증빙 보강'
    ].join('\n');
    
    return { content, confidence: 'high', expertType: 'banking' };
  }
  
  // 전세 vs 월세 비교
  if (/전세.*월세|월세.*전세/.test(text) && /비교|차이|어떤|나은/.test(text)) {
    const content = [
      '🏠 전세 vs 월세 선택 가이드:',
      '',
      '💰 전세의 장점:',
      '• 월 주거비 부담 없음',
      '• 보증금 회수 시 목돈 확보',
      '• 장기 거주 시 경제적',
      '',
      '💰 월세의 장점:',
      '• 초기 자금 부담 적음',
      '• 유연한 이주 가능',
      '• 투자 기회비용 활용',
      '',
      '🎯 선택 기준:',
      '• 보유 자금 > 전세보증금 → 월세 고려',
      '• 장기 거주 예정 → 전세 유리',
      '• 금리 상승기 → 전세 부담 증가',
      '',
      '💡 구체적 손익분기점을 계산해드리려면 보증금과 월세 금액을 알려주세요!'
    ].join('\n');
    
    return { content, confidence: 'high', expertType: 'real_estate' };
  }
  
  // 정책자금 비교
  if (/디딤돌.*보금자리|보금자리.*디딤돌/.test(text)) {
    const content = [
      '🏦 디딤돌 vs 보금자리 비교 분석:',
      '',
      '🏠 디딤돌 대출:',
      '• 소득/자산 요건 엄격 (지역별 차등)',
      '• 주택가격 6억 이하',
      '• 금리 낮음, 장기 고정 가능',
      '• 신혼부부 추가 우대',
      '',
      '🏠 보금자리 대출:',
      '• 생애최초 구매 중심',
      '• 주택가격 9억 이하',
      '• 소득 요건 상대적 완화',
      '• 다양한 우대 조건 결합',
      '',
      '🎯 선택 가이드:',
      '• 소득 낮고 주택가 저렴 → 디딤돌',
      '• 생애최초이고 주택가 중간 → 보금자리',
      '• 둘 다 가능하면 금리/한도 비교',
      '',
      '💡 정확한 자격과 조건을 확인하려면 소득과 주택가를 알려주세요!'
    ].join('\n');
    
    return { content, confidence: 'high', expertType: 'policy' };
  }
  
  return null;
}

// 4단계: 절차 안내 처리
function handleProcedureGuidance(message: string, intent: any): SimpleResponse | null {
  const text = message.toLowerCase();
  
  // 대출 신청 절차
  if (/대출.*절차|신청.*절차|진행.*순서/.test(text)) {
    const urgentPrefix = intent.urgency === 'high' ? '⚡ 빠른 진행을 위한 ' : '📋 ';
    
    const content = [
      `${urgentPrefix}대출 신청 절차를 단계별로 안내드릴게요:`,
      '',
      '1️⃣ 사전 준비 (1-2일):',
      '• 기금e든든 모의심사로 자격 확인',
      '• 소득/재직 증명서류 준비',
      '• 신용등급 확인',
      '',
      '2️⃣ 가심사 (3-5일):',
      '• 2-3개 은행 동시 신청',
      '• 한도/금리 비교',
      '• 우대조건 확인',
      '',
      '3️⃣ 매물 계약 (협의):',
      '• 대출특약 필수 삽입',
      '• 잔금일 = 대출실행일 조율',
      '',
      '4️⃣ 본심사 (1-2주):',
      '• 등기부/건축물대장 제출',
      '• 최종 승인 대기',
      '',
      '5️⃣ 실행 (1-2일):',
      '• 근저당 설정',
      '• 자금 실행',
      '',
      intent.urgency === 'high' ? '⚡ 급하시면 가심사부터 빠르게 시작하세요!' : '💡 천천히 단계별로 진행하시면 됩니다.'
    ].join('\n');
    
    return { content, confidence: 'high', expertType: 'banking' };
  }
  
  // 주택 구매 절차
  if (/주택.*절차|구매.*절차|매매.*절차/.test(text)) {
    const content = [
      '🏠 주택 구매 전체 절차 가이드:',
      '',
      '📋 1단계: 준비 (2-4주)',
      '• 예산 설정 (대출한도 + 자기자본)',
      '• 지역/조건 우선순위 정하기',
      '• 대출 가심사 완료',
      '',
      '📋 2단계: 매물 탐색 (4-8주)',
      '• 온라인 + 직접 방문',
      '• 3-5개 후보 비교 검토',
      '• 시세/호재 분석',
      '',
      '📋 3단계: 계약 (1-2일)',
      '• 매매계약서 작성',
      '• 특약사항 협의',
      '• 계약금 지급',
      '',
      '📋 4단계: 중도금/잔금 (1-3개월)',
      '• 대출 본심사 진행',
      '• 중도금 지급 (신축의 경우)',
      '• 잔금 지급 + 소유권 이전',
      '',
      '💡 각 단계별 세부 사항이 궁금하시면 말씀해 주세요!'
    ].join('\n');
    
    return { content, confidence: 'high', expertType: 'real_estate' };
  }
  
  return null;
}

// 5단계: 주제별 전문 조언
function handleTopicBasedAdvice(message: string, intent: any, financial: any): SimpleResponse | null {
  const topics = intent.topics;
  const text = message.toLowerCase();
  
  // 대출 관련 조언
  if (topics.includes('loan') && intent.primaryIntent === 'advice') {
    if (/첫.*대출|처음.*대출/.test(text)) {
      return {
        content: [
          '💡 첫 대출을 위한 핵심 조언:',
          '',
          '🎯 금리보다 중요한 것들:',
          '• 한도: 실제 필요금액 충족 여부',
          '• 상환방식: 원리금균등 vs 원금균등',
          '• 중도상환수수료: 향후 갈아타기 고려',
          '',
          '🎯 신용 관리:',
          '• 대출 후 연체 절대 금지',
          '• 추가 대출 신청 최소화',
          '• 신용카드 사용액 관리',
          '',
          '⚠️ 실수하기 쉬운 부분:',
          '• DSR 40% 넘지 않도록 계획',
          '• 생활비 여유분 확보',
          '• 금리 인상 대비책 마련',
          '',
          '💬 구체적인 상황을 알려주시면 맞춤 조언을 드릴게요!'
        ].join('\n'),
        confidence: 'high',
        expertType: 'banking'
      };
    }
  }
  
  // 부동산 투자 조언
  if (topics.includes('investment') && /투자.*조언|조언.*투자/.test(text)) {
    return {
      content: [
        '📈 부동산 투자 핵심 조언:',
        '',
        '🎯 투자 전 체크리스트:',
        '• 본인 거주용 vs 투자용 명확히 구분',
        '• 대출 규제 (DSR, LTV) 미리 확인',
        '• 보유세, 양도세 등 세금 비용 계산',
        '',
        '🎯 지역 선택 기준:',
        '• 교통 접근성 (지하철, 버스)',
        '• 개발 호재 (재개발, 신축)',
        '• 인구 유입 전망',
        '',
        '🎯 수익성 분석:',
        '• 임대수익률 3-4% 이상',
        '• 시세 상승 잠재력',
        '• 유지관리 비용 고려',
        '',
        '⚠️ 주의사항:',
        '• 과도한 대출 레버리지 금지',
        '• 단기 차익 기대보다 장기 관점',
        '• 여러 지역 분산투자 고려',
        '',
        '💬 관심 지역이나 예산이 있으시면 구체적 분석을 도와드릴게요!'
      ].join('\n'),
      confidence: 'high',
      expertType: 'real_estate'
    };
  }
  
  return null;
}

// 6단계: 프로필 기반 개인화 응답
function generateProfileBasedResponse(profile: Fields, intent: any, financial: any): SimpleResponse | null {
  // 기존 hasUsableProfile 로직 유지하되 더 스마트하게
  return null; // 일단 기존 로직 유지
}

function hasUsableProfile(profile: Fields): boolean {
  return false; // 일단 기존 로직 유지
}

// DSR vs DTI 비교 전용 처리 (기존 함수명 유지, 새로운 로직으로 대체)
function handleGlossaryComparison(message: string): SimpleResponse | null {
  // 새로운 handleSmartComparison 함수로 대체됨
  return handleSmartComparison(message, { topics: ['glossary'], primaryIntent: 'comparison' });
}

// ---------- 주제별 맞춤 지능적 폴백 ----------
function generateTopicAwareFallback(message: string, intent: any, financial: any): SimpleResponse {
  const topics = intent.topics;
  const urgency = intent.urgency;
  const hasNumbers = financial.amounts.length > 0;
  
  // 긴급도가 높으면 더 적극적인 톤
  const urgentPrefix = urgency === 'high' ? '⚡ 빠르게 도와드릴게요! ' : '';
  
  // 대출 관련 폴백
  if (topics.includes('loan')) {
    if (hasNumbers) {
      return {
        content: `${urgentPrefix}말씀해주신 금액으로 대출 가능성을 분석해보겠습니다. 매매가와 월소득을 명확히 해주시면 정확한 LTV/DSR 계산이 가능해요. 예: "매매 5억, 월소득 400만"`,
        confidence: 'medium',
        expertType: 'banking'
      };
    }
    return {
      content: `${urgentPrefix}대출 상담을 원하시는군요. 정확한 한도와 금리를 계산해드리려면 매매가·자기자본·월소득을 알려주세요. 바로 LTV/DSR 분석해드릴게요!`,
      confidence: 'medium',
      expertType: 'banking'
    };
  }
  
  // 전세/월세 관련 폴백
  if (topics.includes('rental')) {
    return {
      content: `${urgentPrefix}전세/월세 관련 문의시군요. 전세 vs 월세 손익분기점을 계산해드리거나, 전세자금대출 한도를 알려드릴 수 있어요. 보증금과 월세 금액을 알려주세요.`,
      confidence: 'medium',
      expertType: 'real_estate'
    };
  }
  
  // 정책자금 관련 폴백
  if (topics.includes('policy')) {
    return {
      content: `${urgentPrefix}정책자금(디딤돌/보금자리/버팀목) 문의시군요. 자격 요건과 우대조건을 확인해드릴게요. 소득·주택가·무주택·혼인 여부를 알려주시면 맞춤 안내 가능합니다.`,
      confidence: 'medium',
      expertType: 'policy'
    };
  }
  
  // 세금/수수료 관련 폴백
  if (topics.includes('tax')) {
    return {
      content: `${urgentPrefix}부동산 거래 비용 문의시군요. 취득세·등록세·중개수수료·법무사비 등을 계산해드릴 수 있어요. 매매가와 지역을 알려주시면 정확한 비용을 산출해드릴게요.`,
      confidence: 'medium',
      expertType: 'real_estate'
    };
  }
  
  // 투자 관련 폴백
  if (topics.includes('investment')) {
    return {
      content: `${urgentPrefix}부동산 투자 문의시군요. 수익률 분석이나 시장 전망을 도와드릴 수 있어요. 관심 지역과 예산 규모를 알려주시면 투자 가이드를 제공해드릴게요.`,
      confidence: 'medium',
      expertType: 'real_estate'
    };
  }
  
  // 주택구매 관련 폴백
  if (topics.includes('purchase')) {
    return {
      content: `${urgentPrefix}주택 구매 문의시군요. 구매력 분석과 최적 대출 조합을 제안해드릴 수 있어요. 예산과 소득을 알려주시면 바로 분석해드릴게요.`,
      confidence: 'medium',
      expertType: 'real_estate'
    };
  }
  
  // 일반적인 경우 - 의도에 따라 다른 응답
  if (intent.primaryIntent === 'calculation') {
    return {
      content: `${urgentPrefix}계산을 원하시는군요! 구체적인 숫자(매매가, 소득, 자기자본 등)를 알려주시면 바로 계산해드릴게요. 예: "5억 집, 월소득 500만"`,
      confidence: 'medium',
      expertType: 'banking'
    };
  }
  
  if (intent.primaryIntent === 'comparison') {
    return {
      content: `${urgentPrefix}비교 분석을 원하시는군요! 비교하고 싶은 옵션들을 구체적으로 알려주시면 장단점을 분석해드릴게요.`,
      confidence: 'medium',
      expertType: 'general'
    };
  }
  
  // 최후 폴백 - 더 인간적이고 도움이 되는 톤
  return {
    content: `${urgentPrefix}궁금한 내용을 파악했어요. 더 정확한 답변을 드리려면 구체적인 상황을 조금 더 알려주세요. 숫자나 조건을 포함해서 말씀해주시면 바로 분석해드릴게요!`,
    confidence: 'medium',
    expertType: 'general'
  };
}