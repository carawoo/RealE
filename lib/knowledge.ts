import { CURRENT_LOAN_POLICY } from './policy-data';
import { Fields, toComma } from './utils';

type KnowledgeResult = {
  content: string;
  cards?: Array<{
    title: string;
    subtitle?: string | null;
    monthly?: string | null;
    totalInterest?: string | null;
    notes?: string[];
  }> | null;
  checklist?: string[] | null;
};

// --- Intent detectors ---
function isAboutBogeumjari(text: string) {
  const t = text.toLowerCase();
  return /보금자리론.*(란|이란|설명|알려|무엇|뭐)/.test(t) || /^보금자리론(\?|이란\?|이란)/.test(t);
}

function isAboutChungyakDifference(text: string) {
  const t = text.toLowerCase();
  return /(개인|일반).*청약.*(신혼|신혼부부).*차이|청약.*차이.*(개인|일반).*신혼/.test(t);
}

function isAboutJeonseFraud(text: string) {
  const t = text.toLowerCase();
  return /전세.*사기.*(예방|예방법|방지|주의|피해.*예방)/.test(t);
}

function isAboutWhereToGetLoan(text: string) {
  const t = text.toLowerCase();
  return /(부동산|주택|집).*대출.*어디.*(받|하)|어디서.*(대출|받을 수)/.test(t);
}

function isAboutJeonseVsWolseWithCapital(text: string) {
  const t = text.toLowerCase();
  return /(자본금|자기자본|현금).*\d+.*(전세|월세).*추천/.test(t);
}

function isAboutHighestPrice15Pyeong(text: string) {
  const t = text.toLowerCase();
  return /(한국|대한민국).*(제일|가장).*비싼.*(아파트).*(가격).*15\s*평/.test(t);
}

// --- Responders ---
function respondAboutBogeumjari(): KnowledgeResult {
  const p = CURRENT_LOAN_POLICY;
  const content = [
    '🏠 보금자리론은 무엇인가요?',
    '',
    '고정금리·분할상환 방식의 주택 구입자금 대출로, 한국주택금융공사(HF)가 보증/취급합니다.',
    '',
    `핵심 포인트:`,
    `- 대상: 무주택 또는 1주택 처분 조건 등 상품별 요건 적용`,
    `- 한도: 일반 최대 ${toComma(p.maxAmount.bogeumjari)}원, 생애최초 ${toComma(p.maxAmount.bogeumjariFirstTime)}원, 다자녀/피해자 ${toComma(p.maxAmount.bogeumjariMultiChild)}~${toComma(p.maxAmount.bogeumjariVictim)}원`,
    `- LTV: 지역·유형별 차등 (정책 기준 반영)`,
    `- 금리: 정책 공시 기준 (우대금리 적용 가능)`,
    '',
    '진행 순서:',
    '- 기금e든든에서 자격·한도 모의심사',
    '- 필요서류 준비 및 은행 신청',
    '- 심사 후 실행',
    '',
    '정책과 금리는 수시로 변동되므로, 최신 공시를 반드시 확인하세요.'
  ].join('\n');
  return {
    content,
    cards: [{
      title: '보금자리론 요약',
      subtitle: `${p.year}년 기준 (정책 수시 변동)`,
      monthly: null,
      totalInterest: null,
      notes: [
        `일반 최대 ${toComma(p.maxAmount.bogeumjari)}원`,
        `생애최초 ${toComma(p.maxAmount.bogeumjariFirstTime)}원`,
        `다자녀/피해자 ${toComma(p.maxAmount.bogeumjariMultiChild)}~${toComma(p.maxAmount.bogeumjariVictim)}원`,
        '기금e든든 모의심사 권장'
      ]
    }],
    checklist: ['기금e든든 모의심사', '무주택/소득 요건 확인', '취급은행 비교']
  };
}

function respondChungyakDifference(): KnowledgeResult {
  const content = [
    '🏢 개인(일반) 청약 vs 신혼부부 청약 차이',
    '',
    '개인(일반) 청약:',
    '- 전 국민 대상 기본 트랙',
    '- 가점제(무주택 기간, 부양가족, 청약통장 납입횟수 등) 중심',
    '',
    '신혼부부 청약:',
    '- 혼인기간 제한(예: 7년 이내 등) 및 소득 요건',
    '- 신혼부부 특별공급, 생애최초 특별공급 등 별도 물량',
    '- 추첨제/우선공급 기준 상이 (공고마다 확인 필요)',
    '',
    '핵심 차이:',
    '- 물량 배정(특공)과 소득·혼인 요건 유무',
    '- 일반은 가점 경쟁, 신혼부부는 우선공급 트랙 활용',
    '',
    '항상 해당 단지의 모집공고(청약홈)에서 최신 요건·배점표를 확인하세요.'
  ].join('\n');
  return {
    content,
    cards: [{
      title: '청약 차이 한눈에',
      subtitle: '모집공고 필수 확인',
      notes: [
        '일반: 가점제 중심',
        '신혼부부: 특별공급/우선공급',
        '소득·혼인기간 요건 확인'
      ]
    }],
    checklist: ['청약통장 납입횟수 확인', '무주택·부양가족 가점 확인', '특별공급 요건 확인']
  };
}

function respondJeonseFraudPrevention(): KnowledgeResult {
  const content = [
    '🔒 전세사기 예방법',
    '',
    '핵심 체크리스트:',
    '- 등기부등본(갑구/을구) 최신 확인: 근저당·가압류 여부',
    '- 임대인 본인 확인 및 대리권 증빙',
    '- 선순위 보증금·대출 존재 여부 확인',
    '- 전입세대열람, 확정일자·전입신고 즉시',
    '- HUG 전세보증금 반환보증 가입',
    '- 잔금·전입·확정일자 동시 진행(동시이행)',
    '- 수상한 급매/시세 대비 과도한 할인 주의',
    '',
    '거래 전 반드시 공인중개사와 서류 교차확인하고, 필요 시 변호사/법무사 자문을 받으세요.'
  ].join('\n');
  return {
    content,
    cards: [{
      title: '전세사기 예방법 요약',
      notes: [
        '등기부등본/선순위 확인',
        '확정일자·전입신고',
        'HUG 반환보증 가입'
      ]
    }],
    checklist: ['등기부등본 발급', '전입·확정일자 준비', 'HUG 보증 가입']
  };
}

function respondWhereToGetLoan(): KnowledgeResult {
  const content = [
    '🏦 부동산(주택) 대출은 어디서 받나요?',
    '',
    '주요 경로:',
    '- 정책자금: 한국주택금융공사(HF) 보금자리론·디딤돌 등',
    '- 시중은행: 국민·신한·하나·우리·농협 등 주담대·전세자금대출',
    '- 인터넷전문은행/핀테크: 카카오뱅크·토스뱅크 등(취급 상품 상이)',
    '',
    '진행 방법:',
    '1) 목적에 맞는 상품 선택(구입/전세/생활자금)',
    '2) 기금e든든/은행 앱에서 사전 자격·한도 조회',
    '3) 필요서류 준비 후 은행 신청',
    '4) 심사 후 실행',
    '',
    '은행별 우대금리와 취급조건이 달라 비교가 중요합니다.'
  ].join('\n');
  return { content, cards: null, checklist: ['자격·한도 조회', '우대금리 비교', '서류 준비'] };
}

function parseCapitalWon(text: string): number | null {
  const m = text.match(/(자본금|자기자본|현금)\s*([0-9억천만,\s]+)원?/i);
  if (!m) return null;
  const raw = m[2].replace(/\s+/g, '');
  // very simple KRW parser: supports 억/천만/만
  let total = 0;
  const eokMatch = raw.match(/(\d+)억/);
  if (eokMatch) total += parseInt(eokMatch[1], 10) * 100_000_000;
  const cheonmanMatch = raw.match(/(\d+)천만/);
  if (cheonmanMatch) total += parseInt(cheonmanMatch[1], 10) * 10_000_000;
  const manMatch = raw.match(/(\d+)만(?!원)/);
  if (manMatch) total += parseInt(manMatch[1], 10) * 10_000;
  const numOnly = raw.replace(/[^0-9]/g, '');
  if (total === 0 && numOnly) total = parseInt(numOnly, 10) * 10_000; // assume 만원 단위
  return total || null;
}

function respondJeonseVsWolseWithCapital(text: string): KnowledgeResult {
  const capital = parseCapitalWon(text) ?? 100_000_000; // default 1억
  // Heuristic: show both paths and when to choose
  const monthlyCostFromJeonse = Math.round(capital * 0.003); // 0.3% guideline
  const wolseExampleMonthly = 800_000; // example baseline to compare
  const content = [
    '🏘 자본금 기준 전세 vs 월세 추천',
    '',
    `보유자금: ${toComma(capital)}원 기준`,
    '',
    '전세 선택이 유리한 경우:',
    `- 장기 거주 예정, 월 부담을 낮추고 싶음 (전세 환산 월 ${toComma(monthlyCostFromJeonse)}원 수준)`,
    '- 보증금 반환보증 가입 가능, 매물 리스크 낮음',
    '',
    '월세 선택이 유리한 경우:',
    `- 단기 거주·이동성 중시, 초기자금 여력을 남기고 싶음`,
    `- 전세자금 대출이 어려운 상황`,
    '',
    '간단 비교 방법:',
    `- 전세: 보증금 × 0.3% ≈ 월 비용 (예: ${toComma(capital)}원 → 약 ${toComma(monthlyCostFromJeonse)}원)`,
    `- 월세: 보증금·월세·이자손실을 합산해 1년 총비용 비교`,
    '',
    '지역·매물별 환산율(0.25~0.4%)이 달라 실제 시세로 재확인하세요.'
  ].join('\n');
  return {
    content,
    cards: [{
      title: '전세 vs 월세 의사결정',
      subtitle: '보유자금 기준 비교',
      monthly: `전세 환산: 약 ${toComma(monthlyCostFromJeonse)}원/월`,
      totalInterest: '환산율 0.25~0.4% 참고',
      notes: ['보증보험·환산율·거주기간 고려', '1년 총비용 비교']
    }],
    checklist: ['거주기간 결정', '환산율 확인', '보증보험 가입']
  };
}

function respondHighestPrice15Pyeong(): KnowledgeResult {
  const content = [
    '💰 한국 최고가 아파트(참고) — 15평 환산 방법',
    '',
    '실거래 최고가는 시점·세대·전용면적에 따라 매 분기 변동됩니다.',
    '따라서 “정확한 금액”은 국토교통부 실거래가/KB시세 등 실시간 조회가 필요합니다.',
    '',
    '계산 방법(예시):',
    '- 15평(≈ 49.6㎡) 기준: 최고가 단지의 3.3㎡당 시세 × 15',
    '- 예: 3.3㎡당 X억원이라면 → 15평 ≈ 15 × X억원',
    '',
    '실시간 확인 경로:',
    '- 국토부 실거래가: rt.molit.go.kr',
    '- KB시세/부동산 앱(네이버/호갱노노 등)',
    '',
    '정확한 단지·평형을 알려주시면, 방법에 따라 추정치 산출을 도와드릴게요.'
  ].join('\n');
  return { content, cards: null, checklist: ['단지명/전용면적 입력', '최근 거래사례 확인', '시세 그래프 확인'] };
}

export function generateKnowledgeResponse(text: string, _profile: Fields): KnowledgeResult | null {
  if (isAboutBogeumjari(text)) return respondAboutBogeumjari();
  if (isAboutChungyakDifference(text)) return respondChungyakDifference();
  if (isAboutJeonseFraud(text)) return respondJeonseFraudPrevention();
  if (isAboutWhereToGetLoan(text)) return respondWhereToGetLoan();
  if (isAboutJeonseVsWolseWithCapital(text)) return respondJeonseVsWolseWithCapital(text);
  if (isAboutHighestPrice15Pyeong(text)) return respondHighestPrice15Pyeong();
  return null;
}


