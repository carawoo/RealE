import { Fields, toComma, replyJeonseToMonthly, isNumbersOnlyAsk, replyNumbersOnly } from './utils';
import { generateKnowledgeResponse } from './knowledge';
import { analyzeQuestionContext, isRepaymentTypeQuestion, isLoanScenarioRequest, isSpecificLoanPolicyRequest } from './question-analyzer';
import { generateLoanScenariosResponse, generateContextualResponse, generateSpecificLoanPolicyResponse, generateLoanConsultationResponse } from './response-generators';
import { CURRENT_LOAN_POLICY, getCurrentPolicyDisclaimer } from './policy-data';
import { formatKRW } from './loan-calculator';

export type RoutedResponse = {
  content: string;
  cards?: any[] | null;
  checklist?: string[] | null;
  fields?: Fields;
};

export function routePrimary(message: string, profile: Fields): RoutedResponse | null {
  // 0) 숫자만 요청
  if (isNumbersOnlyAsk(message)) {
    return { content: replyNumbersOnly(profile), fields: profile };
  }

  // 1) 지식형
  const knowledge = generateKnowledgeResponse(message, profile);
  if (knowledge) {
    return { ...knowledge, fields: profile } as RoutedResponse;
  }

  // 2) 상담원 스타일 (감정평가 등)
  const consult = generateLoanConsultationResponse(message, profile);
  if (consult) {
    return { ...consult, fields: profile } as RoutedResponse;
  }

  // 3) 구매 상담 (의도+지역)
  const lower = message.toLowerCase();
  const hasPurchaseIntent = /사고싶|구매|구입|매수|집.*사|아파트.*사|주택.*사|살.*수|살.*있/.test(lower);
  const hasLocationIntent = /서울|부산|대구|인천|광주|대전|울산|경기|강남|강북|송파|마포|서초|분당|성남|하남|용인|수원|고양|의정부/.test(message);
  const isSimpleInfoRequest = /이에요|입니다|입니다\.|이야|이야\./.test(message);
  if ((hasPurchaseIntent && hasLocationIntent) && !isSimpleInfoRequest) {
    const annualIncome = profile.incomeMonthly ? profile.incomeMonthly * 12 : 0;
    const maxLoanAmount = annualIncome * 0.4 * 30; // DSR 40%, 30년
    let content = `📊 **현재 상황 분석**:\n`;
    if (profile.incomeMonthly) content += `• 월소득: ${toComma(profile.incomeMonthly)}원 (연 ${toComma(annualIncome)}원)\n`;
    if (profile.cashOnHand) content += `• 보유현금: ${toComma(profile.cashOnHand)}원\n`;
    content += `\n`;
    if (/강남|서초/.test(message)) {
      content += `🏠 **강남/서초 아파트 구매 전략**:\n`;
      content += `• **현실적 한도**: 약 ${formatKRW(maxLoanAmount)}원 (DSR 40% 기준)\n`;
      content += `• **추천 가격대**: ${formatKRW(maxLoanAmount * 0.6)}원 ~ ${formatKRW(maxLoanAmount)}원\n`;
      content += `• **대안**: 강남 인근 지역 (서초, 송파, 성남 분당) 검토\n\n`;
    } else if (/서울/.test(message)) {
      content += `🏠 **서울 아파트 구매 전략**:\n`;
      content += `• **현실적 한도**: 약 ${formatKRW(maxLoanAmount)}원 (DSR 40% 기준)\n`;
      content += `• **추천 가격대**: ${formatKRW(maxLoanAmount * 0.8)}원 ~ ${formatKRW(maxLoanAmount)}원\n`;
      content += `• **필요 자금**: 계약금 ${formatKRW(maxLoanAmount * 0.1)}원 + 중개수수료\n\n`;
    } else {
      content += `🏠 **주택 구매 전략**:\n`;
      content += `• **현실적 한도**: 약 ${formatKRW(maxLoanAmount)}원 (DSR 40% 기준)\n`;
      content += `• **추천 가격대**: ${formatKRW(maxLoanAmount * 0.8)}원 ~ ${formatKRW(maxLoanAmount)}원\n`;
      content += `• **필요 자금**: 계약금 ${formatKRW(maxLoanAmount * 0.1)}원 + 중개수수료\n\n`;
    }
    content += `💡 **구체적 해결 방안**:\n`;
    content += `1️⃣ **정책자금 활용**:\n`;
    content += `   • 보금자리론/디딤돌/우대 적용\n\n`;
    content += `🎯 **즉시 액션**: 기금e든든 모의심사 → 은행 비교 → 서류 준비`; 
    return {
      content,
      cards: [{
        title: /서울|강남|서초/.test(message) ? '서울 아파트 구매 전략' : '주택 구매 전략',
        subtitle: `월소득 ${toComma(profile.incomeMonthly || 0)}원 기준`,
        monthly: `최대 대출: ${formatKRW(maxLoanAmount)}원`,
        totalInterest: 'DSR 40% 기준',
        notes: []
      }],
      checklist: ['기금e든든 모의심사', '실거래가 조사', '여러 은행 비교'],
      fields: profile
    };
  }

  // 4) 전세→월세 환산
  const jeonse = replyJeonseToMonthly(message);
  if (jeonse) {
    return { ...jeonse, fields: profile } as RoutedResponse;
  }

  // 5) 시나리오 계산
  if (isLoanScenarioRequest(message, profile)) {
    const resp = generateLoanScenariosResponse(profile);
    return { ...resp, fields: profile } as RoutedResponse;
  }

  // 6) 정책 상담
  if (isSpecificLoanPolicyRequest(message)) {
    const resp = generateSpecificLoanPolicyResponse(message);
    if (resp) return { ...resp, fields: profile } as RoutedResponse;
  }

  // 7) 일반 대출 질문(기간/절차/자격 등)
  if (/대출.*기간|신청.*기간|얼마.*걸|언제.*신청/.test(message) ||
      /절차|방법|과정|준비|서류/.test(message) ||
      ((/조건|자격|요건/.test(message)) && !/한도|ltv|dsr/.test(message))) {
    const context = analyzeQuestionContext(message);
    const start = generateContextualResponse(context, '주택금융 대출', {});
    let body = '';
    if (context.questionType === 'timeline') {
      body += `⏰ **처리 기간** (일반): 2-4주\n\n`;
    } else if (context.questionType === 'application_process') {
      body += `📋 **신청 절차**: 상품 선택 → 자격 확인 → 서류 준비 → 모의심사 → 신청 → 심사 → 승인\n\n`;
    } else if (context.questionType === 'requirements') {
      body += `✅ **자격 조건**: 무주택/소득 기준/주택가격 기준 (상품별 상이)\n\n`;
    }
    return {
      content: start + body + getCurrentPolicyDisclaimer(),
      cards: [{
        title: '주택금융 대출 상담',
        subtitle: '전문가 수준 맞춤 상담',
        monthly: '상품별 차등 적용',
        totalInterest: '우대조건별 차등'
      }],
      checklist: context.experienceLevel === 'first_time' ? [
        '무주택 세대주 자격 확인', '소득 기준 확인', '주택가격 기준 확인', '기금e든든 모의심사'
      ] : [
        '기존 대출 현황 및 DSR 재계산', '신용등급 최신 상태 확인', '우대금리 조건 체크'
      ],
      fields: profile
    };
  }

  return null;
}




