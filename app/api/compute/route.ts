import { NextRequest, NextResponse } from "next/server";
import { 
  generateLoanScenarios, 
  convertScenarioToCard, 
  LoanInputs,
  formatKRW,
  parseWon,
  analyzeSpecificLoanPolicy,
  REPAYMENT_TYPES,
  formatPercent
} from "../../../lib/loan-calculator";

// 분리된 모듈들 import
import { 
  Fields, 
  toComma, 
  extractFieldsFrom, 
  mergeFields, 
  isNumbersOnlyAsk, 
  isDomain,
  replyJeonseToMonthly,
  replyNumbersOnly
} from "../../../lib/utils";

import { 
  isLoanScenarioRequest, 
  isSpecificLoanPolicyRequest,
  analyzeQuestionContext,
  isRepaymentTypeQuestion
} from "../../../lib/question-analyzer";

import { 
  CURRENT_LOAN_POLICY, 
  checkPolicyDataFreshness, 
  getCurrentPolicyDisclaimer 
} from "../../../lib/policy-data";

import { 
  generateLoanScenariosResponse, 
  generateContextualResponse, 
  generateSpecificLoanPolicyResponse,
  generateLoanConsultationResponse
} from "../../../lib/response-generators";

/**
 * 이 파일은 다음을 해결합니다.
 * - Supabase 저장 전/후 레이스를 없애기 위해, 클라이언트가 보낸 fields와 DB에서 읽은 값을 병합
 * - "숫자만 콤마 포함해서 말해줘"를 결정론으로 처리
 * - 전세→월세(0.3%/월) 간단 환산 제공
 * - 3종 대출 시나리오 생성 및 계산 기능 제공
 * - LLM 파싱 실패 시에도 친절한 폴백 제공("분석에 실패했어요" 제거)
 */

type Role = "user" | "assistant";
type MessageRow = { role: Role; content: string; fields: Fields | null };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ---------- Supabase ----------
async function fetchConversationProfile(conversationId: string): Promise<Fields> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return {};
  const url =
    `${SUPABASE_URL}/rest/v1/messages` +
    `?select=fields,role,content,created_at` +
    `&conversation_id=eq.${conversationId}` +
    `&order=created_at.asc`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return {};
    const rows: MessageRow[] = await res.json();
    let acc: Fields = {};
    for (const r of rows) {
      if (r?.fields) acc = mergeFields(acc, r.fields);
      if (r.role === "user") acc = mergeFields(acc, extractFieldsFrom(r.content));
    }
    return acc;
  } catch {
    return {};
  }
}

// 정책 데이터 신선도 확인 (개발자용)
checkPolicyDataFreshness();

// ---------- 메인 API 핸들러 ----------
export async function POST(request: NextRequest) {
  try {
    const { message, conversationId } = await request.json();
    
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    // 대화 프로필 가져오기
    const profile = conversationId ? await fetchConversationProfile(conversationId) : {};
    
    // 새 메시지에서 필드 추출 및 병합
    const newFields = extractFieldsFrom(message);
    const mergedProfile = mergeFields(profile, newFields);

    // 숫자만 요청 처리
    if (isNumbersOnlyAsk(message)) {
      const numbers = replyNumbersOnly(mergedProfile);
      return NextResponse.json({
        content: numbers,
        fields: mergedProfile
      });
    }

    // 대출 상담 및 감정평가 관련 응답 처리 (상담원 스타일)
    const consultationResponse = generateLoanConsultationResponse(message, mergedProfile);
    if (consultationResponse) {
      return NextResponse.json({
        ...consultationResponse,
        fields: mergedProfile
      });
    }

    // 전세→월세 환산 처리 (맥락 기반 - 매매 관련 질문은 제외됨)
    const jeonseResponse = replyJeonseToMonthly(message);
    if (jeonseResponse) {
      return NextResponse.json({
        ...jeonseResponse,
        fields: mergedProfile
      });
    }

    // 대출 시나리오 요청 처리
    if (isLoanScenarioRequest(message, mergedProfile)) {
      const response = generateLoanScenariosResponse(mergedProfile);
      return NextResponse.json({
        ...response,
        fields: mergedProfile
      });
    }

    // 전문 정책 상담 요청 처리
    if (isSpecificLoanPolicyRequest(message)) {
      const response = generateSpecificLoanPolicyResponse(message);
      if (response) {
        return NextResponse.json({
          ...response,
          fields: mergedProfile
        });
      }
    }

    // 전세→월세 비교 질문 처리
    if (/전세.*월세.*비교|월세.*전세.*비교|전세.*vs.*월세|월세.*vs.*전세/.test(message)) {
      const t = message.toLowerCase();
      
      // 전세금 추출
      const jeonseMatch = t.match(/(\d+)억.*전세|전세.*(\d+)억/);
      const jeonseAmount = jeonseMatch ? (parseInt(jeonseMatch[1] || jeonseMatch[2]) * 100_000_000) : 200_000_000;
      
      // 월세 정보 추출
      const wolseMatch = t.match(/(\d+)만원.*월세|월세.*(\d+)만원/);
      const wolseMonthly = wolseMatch ? (parseInt(wolseMatch[1] || wolseMatch[2]) * 10_000) : 500_000;
      
      // 보증금 추출
      const depositMatch = t.match(/(\d+)억.*보증금|보증금.*(\d+)억/);
      const depositAmount = depositMatch ? (parseInt(depositMatch[1] || depositMatch[2]) * 100_000_000) : 50_000_000;
      
      // 전세→월세 환산
      const convertedMonthly = Math.round(jeonseAmount * 0.003);
      
      // 월세 총 비용 계산 (1년 기준)
      const wolseTotal = wolseMonthly * 12 + (jeonseAmount - depositAmount) * 0.003 * 12;
      const jeonseTotal = jeonseAmount * 0.003 * 12;
      
      return NextResponse.json({
        content: `**전세 vs 월세 상세 비교** 🏠\n\n` +
                 `📊 **비용 비교 (연간)**\n\n` +
                 `🏠 **전세 ${formatKRW(jeonseAmount)}원**:\n` +
                 `• 월 관리비: 약 ${formatKRW(convertedMonthly)}원 (0.3% 환산)\n` +
                 `• 연간 총 비용: ${formatKRW(jeonseTotal)}원\n` +
                 `• 장점: 안정적, 월세 변동 없음\n` +
                 `• 단점: 초기 자금 부담, 투자 수익률 제한\n\n` +
                 `🏢 **월세 (보증금 ${formatKRW(depositAmount)}원 + 월세 ${formatKRW(wolseMonthly)}원)**:\n` +
                 `• 월세: ${formatKRW(wolseMonthly)}원\n` +
                 `• 보증금 이자 손실: ${formatKRW(Math.round((jeonseAmount - depositAmount) * 0.003))}원/월\n` +
                 `• 연간 총 비용: ${formatKRW(wolseTotal)}원\n` +
                 `• 장점: 초기 자금 부담 적음, 유연한 이사\n` +
                 `• 단점: 월세 상승 위험, 보증금 반환 불안\n\n` +
                 `💡 **추천**:\n` +
                 `• 자금 여유 있음 → 전세 (안정성)\n` +
                 `• 자금 제약 있음 → 월세 (유연성)\n` +
                 `• 투자 목적 → 전세 (자산 축적)\n` +
                 `• 단기 거주 → 월세 (이사 용이)`,
        cards: [{
          title: "전세 vs 월세 비교",
          subtitle: "연간 총 비용 기준",
          monthly: `전세: ${formatKRW(convertedMonthly)}원`,
          totalInterest: `월세: ${formatKRW(wolseMonthly)}원`,
          notes: [
            `전세 ${formatKRW(jeonseAmount)}원 (0.3% 환산)`,
            `월세 ${formatKRW(wolseMonthly)}원 + 보증금 ${formatKRW(depositAmount)}원`,
            `연간 차이: ${formatKRW(Math.abs(jeonseTotal - wolseTotal))}원`,
            "전세: 안정성 vs 월세: 유연성",
            "개인 상황에 맞는 선택 권장"
          ]
        }],
        checklist: [
          "개인 자금 상황 점검",
          "거주 기간 계획 수립",
          "투자 목적 여부 확인",
          "월세 상승 위험 고려",
          "보증금 반환 보험 가입 검토"
        ],
        fields: mergedProfile
      });
    }

    // 월소득/소득 정보 처리 (맥락 기반)
    if (/(월\s*소득|소득|현금|보유\s*현금)/.test(message)) {
      const t = message.toLowerCase();
      
      // 분석 요청이 암시되는 경우
      const impliesAnalysis = /분석|계산|비교|추천|시나리오|한도|ltv|dsr/.test(t);
      const hasSufficientData = !!(mergedProfile.incomeMonthly && (mergedProfile.propertyPrice || mergedProfile.cashOnHand));
      
      if (impliesAnalysis && hasSufficientData) {
        // 시나리오 분석으로 라우팅
        const response = generateLoanScenariosResponse(mergedProfile);
        return NextResponse.json({
          ...response,
          fields: mergedProfile
        });
      } else if (impliesAnalysis && !hasSufficientData) {
        // 추가 정보 요청
        return NextResponse.json({
          content: `대출 시나리오 분석을 위해 추가 정보가 필요해요:\n\n` +
                   `📋 **필수 정보**:\n` +
                   `• 월소득: "${mergedProfile.incomeMonthly ? '확인됨' : '필요'}"\n` +
                   `• 매매가: "${mergedProfile.propertyPrice ? '확인됨' : '필요'}"\n` +
                   `• 자기자본: "${mergedProfile.cashOnHand || mergedProfile.downPayment ? '확인됨' : '필요'}"\n\n` +
                   `💡 **예시**: "월소득 500만원, 5억원 집 구입, 자기자본 1억원으로 분석해줘"`,
          cards: null,
          checklist: ["월소득 확인", "매매가 확인", "자기자본 확인"],
          fields: mergedProfile
        });
      } else {
        // 단순 정보 확인
        const extracted = extractFieldsFrom(message);
        const info = [];
        if (extracted.incomeMonthly) info.push(`월소득: ${toComma(extracted.incomeMonthly)}원`);
        if (extracted.cashOnHand) info.push(`보유현금: ${toComma(extracted.cashOnHand)}원`);
        if (extracted.propertyPrice) info.push(`매매가: ${toComma(extracted.propertyPrice)}원`);
        if (extracted.downPayment) info.push(`자기자본: ${toComma(extracted.downPayment)}원`);
        
        return NextResponse.json({
          content: info.length > 0 ? 
            `📊 **확인된 정보**:\n${info.join('\n')}` :
            "정보를 찾을 수 없어요. 다시 입력해 주세요.",
          fields: mergedProfile
        });
      }
    }

    // 일반적인 대출 질문 처리 (기간, 조건, 절차 등) - 위의 구체적 질문들 이후에 처리
    if (/대출.*기간|신청.*기간|얼마.*걸|언제.*신청/.test(message) ||
        /절차|방법|과정|준비|서류/.test(message) ||
        (/조건|자격|요건/.test(message) && !/한도|ltv|dsr/.test(message)) ||
        (/금리/.test(message) && !/계산|추정/.test(message))) {
      
      // 디딤돌 대출 관련 맞춤 답변 (맥락 기반)
      if (message.toLowerCase().includes("디딤돌") && !(/한도|ltv|dsr/.test(message))) {
        const context = analyzeQuestionContext(message);
        const contextualStart = generateContextualResponse(context, "디딤돌 대출", {});
        
        let focusArea = "";
        let detailInfo = "";
        
        // 질문 유형별 맞춤 정보
        if (context.questionType === 'timeline') {
          focusArea = `⏰ **처리 시간**:\n` +
                     `• 표준: 2-3주 (서류 완비 기준)\n` +
                     `• 빠른 처리: 기금e든든 사전심사 시 1-2주\n` +
                     `• 복잡한 경우: 최대 4주\n\n`;
        } else if (context.questionType === 'requirements') {
          focusArea = `✅ **자격 조건** (${context.experienceLevel === 'first_time' ? '처음 신청자 중심' : '상세'}):\n` +
                     (context.experienceLevel === 'first_time' ? 
                       `• **핵심 3요소**: 무주택 + 연소득 7천만원 이하 + 주택가격 6억원 이하\n` +
                       `• **무주택 확인**: 본인과 배우자 모두 전국 기준 무주택\n` +
                       `• **소득 계산**: 부부합산 연소득 (전년도 기준)\n` +
                       `• **주택가격**: 실거래가 또는 감정가 기준\n\n`
                       :
                       `• 무주택 세대주 (부부합산 전국 기준)\n` +
                       `• 연소득 7천만원 이하 (부부합산)\n` +
                       `• 주택가격 6억원 이하\n` +
                       `• 생애최초/신혼부부 등 우대조건 추가 확인\n\n`
                     );
        } else if (context.questionType === 'calculation') {
          focusArea = `💰 **대출 한도 및 금리** (${CURRENT_LOAN_POLICY.year}년 기준):\n` +
                     `• 최대한도: ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.bogeumjari)}원\n` +
                     `• LTV 최대: ${Math.max(...Object.values(CURRENT_LOAN_POLICY.ltv.bogeumjari.metro))}% (비규제지역 기준)\n` +
                     `• 현재금리: 연 3.20~4.05% (변동금리)\n` +
                     `• 우대금리: 최대 0.5%p 차감 가능\n\n`;
        }
        
        // 경험 수준별 상세 정보
        if (context.experienceLevel === 'first_time') {
          detailInfo = `📋 **첫 신청자 필수 준비사항**:\n` +
                       `1. 기금e든든에서 모의심사 (자격확인)\n` +
                       `2. 필수서류 준비: 소득증명서, 재직증명서\n` +
                       `3. 추가서류: 주민등록등본, 건보자격확인서\n` +
                       `4. 매물서류: 매매계약서, 등기부등본\n` +
                       `5. 우대조건 확인: 신혼부부, 생애최초 등\n\n`;
        } else if (context.experienceLevel === 'experienced') {
          detailInfo = `🔄 **기존 경험자 체크포인트**:\n` +
                       `• 이전 대출과 DSR 중복 확인\n` +
                       `• 신용등급 변동사항 점검\n` +
                       `• 우대금리 조건 재확인\n` +
                       `• 상환방식 선택 (원리금균등/체증식/원금균등)\n\n`;
        }
        
        const urgencyNote = context.urgency === 'immediate' ? 
          `⚡ **긴급 처리 시**: 모든 서류를 미리 완비하고 기금e든든 모의심사를 완료한 상태에서 은행 방문하세요.\n` :
          ``;
        
        return NextResponse.json({
          content: contextualStart +
                   focusArea +
                   detailInfo +
                   urgencyNote +
                   getCurrentPolicyDisclaimer(),
          cards: context.questionType === 'calculation' ? [{
            title: "디딤돌 대출 한도 계산",
            subtitle: `최대 ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.bogeumjari)}원`,
            monthly: "연 3.20~4.05%",
            totalInterest: "우대 시 최대 0.5%p 할인",
            notes: [
              `LTV 최대 ${Math.max(...Object.values(CURRENT_LOAN_POLICY.ltv.bogeumjari.metro))}% (지역별 차등)`,
              "무주택 세대주 대상",
              "연소득 7천만원 이하",
              "신혼부부/생애최초 우대",
              "상환방식: 원리금균등/체증식/원금균등"
            ]
          }] : null,
          checklist: context.experienceLevel === 'first_time' ? [
            "무주택 여부 정확히 확인 (전국 기준)",
            "부부합산 연소득 7천만원 이하 확인",
            "기금e든든 모의심사로 사전 자격확인",
            "우대금리 적용 조건 미리 파악"
          ] : [
            "기존 대출 현황 및 DSR 재계산",
            "신용등급 최신 상태 확인",
            "우대금리 조건 변경사항 체크",
            "상환방식별 월 상환액 비교"
          ],
          fields: mergedProfile
        });
      }
      
      // 일반적인 대출 상담 질문 (맥락 기반)
      const context = analyzeQuestionContext(message);
      const contextualStart = generateContextualResponse(context, "주택금융 대출", {});
      
      let focusArea = "";
      let detailInfo = "";
      
      // 질문 유형별 맞춤 정보
      if (context.questionType === 'timeline') {
        focusArea = `⏰ **처리 기간** (일반적):\n` +
                   `• 일반적으로 2-4주 소요\n` +
                   `• 서류 완비 시 단축 가능\n` +
                   `• 연말/연초에는 더 오래 걸림\n\n`;
      } else if (context.questionType === 'requirements') {
        focusArea = `✅ **자격 조건** (${context.experienceLevel === 'first_time' ? '처음 신청자용' : '상세'}):\n` +
                   (context.experienceLevel === 'first_time' ? 
                     `• **핵심 조건**: 무주택 세대주 + 소득기준 + 주택가격 기준\n` +
                     `• **무주택**: 본인과 배우자 모두 전국 기준 무주택\n` +
                     `• **소득**: 연소득 기준 (상품별 차이)\n` +
                     `• **주택가격**: 실거래가 또는 감정가 기준\n\n`
                     :
                     `• 무주택 세대주 (부부합산 전국 기준)\n` +
                     `• 소득 기준 (상품별 차이)\n` +
                     `• 주택가격 기준 (상품별 차이)\n` +
                     `• 우대조건 확인 (신혼부부, 생애최초 등)\n\n`
                   );
      } else if (context.questionType === 'application_process') {
        focusArea = `📋 **신청 절차** (${context.experienceLevel === 'first_time' ? '처음 신청자용' : '상세'}):\n` +
                   (context.experienceLevel === 'first_time' ? 
                     `1️⃣ **상품 선택**: 목적에 맞는 대출 상품 결정\n` +
                     `2️⃣ **자격 확인**: 각 상품별 자격 요건 체크\n` +
                     `3️⃣ **서류 준비**: 소득증명서 등 필수서류\n` +
                     `4️⃣ **사전 심사**: 기금e든든 모의심사\n` +
                     `5️⃣ **은행 방문**: 취급은행 신청\n` +
                     `6️⃣ **심사 대기**: 2-4주 소요\n` +
                     `7️⃣ **승인 후 실행**: 계약 및 실행\n\n`
                     :
                     `• 상품 선택 → 자격 확인 → 서류 준비 → 사전 심사 → 은행 신청 → 심사 → 승인\n` +
                     `• 각 단계별 3-7일 소요\n` +
                     `• 병행 가능: 모의심사와 서류준비\n\n`
                   );
      }
      
      // 경험 수준별 상세 정보
      if (context.experienceLevel === 'first_time') {
        detailInfo = `💡 **첫 신청자 가이드**:\n` +
                     `• **상품 추천**: 목적에 따라 보금자리론(구입), 디딤돌(구입), 버팀목(전세) 등\n` +
                     `• **자격 확인**: 기금e든든에서 사전 모의심사 필수\n` +
                     `• **서류 준비**: 소득증명서, 재직증명서, 주민등록등본 등\n` +
                     `• **은행 선택**: 우대금리 조건 비교 후 선택\n` +
                     `• **우대조건**: 신혼부부, 생애최초, 청약저축 등 확인\n\n`;
      } else if (context.experienceLevel === 'experienced') {
        detailInfo = `🔄 **경험자 체크포인트**:\n` +
                     `• 기존 대출과 DSR 중복 확인\n` +
                     `• 신용등급 변동사항 점검\n` +
                     `• 우대금리 조건 재확인\n` +
                     `• 상환방식 선택 (원리금균등/체증식/원금균등)\n\n`;
      }
      
      const urgencyNote = context.urgency === 'immediate' ? 
        `⚡ **긴급 처리 시**: 모든 서류를 미리 완비하고 기금e든든 모의심사를 완료한 상태에서 은행 방문하세요.\n` :
        ``;
      
      return NextResponse.json({
        content: contextualStart +
                 focusArea +
                 detailInfo +
                 urgencyNote +
                 getCurrentPolicyDisclaimer(),
        cards: [{
          title: "주택금융 대출 상담",
          subtitle: "전문가 수준 맞춤 상담",
          monthly: "상품별 차등 적용",
          totalInterest: "우대조건별 차등",
          notes: [
            "보금자리론: 구입자금 (LTV 50-80%)",
            "디딤돌: 구입자금 (LTV 50-70%)",
            "버팀목: 전세자금 (최대 2억원)",
            "청년전용: 전세자금 (만 19-34세)",
            "신혼부부/생애최초 우대"
          ]
        }],
        checklist: context.experienceLevel === 'first_time' ? [
          "무주택 세대주 자격 확인",
          "소득 기준 확인",
          "주택가격 기준 확인",
          "기금e든든 모의심사 완료"
        ] : [
          "기존 대출 현황 및 DSR 재계산",
          "신용등급 최신 상태 확인",
          "우대금리 조건 변경사항 체크",
          "상환방식별 월 상환액 비교"
        ],
        fields: mergedProfile
      });
    }



    // 일반적인 대출 상담 질문 처리 (분리된 함수에서 처리되지 않은 경우)
    if (/대출.*처음|처음.*대출|대출.*어떻게|어떻게.*대출|대출.*진행|진행.*대출|대출.*받고.*싶|받고.*싶.*대출|어디서.*시작|시작.*해야|주택.*대출.*받고.*싶|받고.*싶.*주택.*대출/.test(message.toLowerCase())) {
      const context = analyzeQuestionContext(message);
      const contextualStart = generateContextualResponse(context, "주택금융 대출", {});
      
      let focusArea = "";
      let detailInfo = "";
      
      if (context.questionType === 'application_process') {
        focusArea = `📋 **신청 절차** (${context.experienceLevel === 'first_time' ? '처음 신청자용' : '상세'}):\n` +
                   (context.experienceLevel === 'first_time' ? 
                     `1️⃣ **상품 선택**: 목적에 맞는 대출 상품 결정\n` +
                     `2️⃣ **자격 확인**: 각 상품별 자격 요건 체크\n` +
                     `3️⃣ **서류 준비**: 소득증명서 등 필수서류\n` +
                     `4️⃣ **사전 심사**: 기금e든든 모의심사\n` +
                     `5️⃣ **은행 방문**: 취급은행 신청\n` +
                     `6️⃣ **심사 대기**: 2-4주 소요\n` +
                     `7️⃣ **승인 후 실행**: 계약 및 실행\n\n`
                     :
                     `• 상품 선택 → 자격 확인 → 서류 준비 → 사전 심사 → 은행 신청 → 심사 → 승인\n` +
                     `• 각 단계별 3-7일 소요\n` +
                     `• 병행 가능: 모의심사와 서류준비\n\n`
                   );
      }
      
      if (context.experienceLevel === 'first_time') {
        detailInfo = `💡 **첫 신청자 가이드**:\n` +
                     `• **상품 추천**: 목적에 따라 보금자리론(구입), 디딤돌(구입), 버팀목(전세) 등\n` +
                     `• **자격 확인**: 기금e든든에서 사전 모의심사 필수\n` +
                     `• **서류 준비**: 소득증명서, 재직증명서, 주민등록등본 등\n` +
                     `• **은행 선택**: 우대금리 조건 비교 후 선택\n` +
                     `• **우대조건**: 신혼부부, 생애최초, 청약저축 등 확인\n\n`;
      }
      
      return NextResponse.json({
        content: contextualStart +
                 focusArea +
                 detailInfo +
                 getCurrentPolicyDisclaimer(),
        cards: [{
          title: "주택금융 대출 상담",
          subtitle: "전문가 수준 맞춤 상담",
          monthly: "상품별 차등 적용",
          totalInterest: "우대조건별 차등",
          notes: [
            "보금자리론: 구입자금 (LTV 50-80%)",
            "디딤돌: 구입자금 (LTV 50-70%)",
            "버팀목: 전세자금 (최대 2억원)",
            "청년전용: 전세자금 (만 19-34세)",
            "신혼부부/생애최초 우대"
          ]
        }],
        checklist: context.experienceLevel === 'first_time' ? [
          "무주택 세대주 자격 확인",
          "소득 기준 확인",
          "주택가격 기준 확인",
          "기금e든든 모의심사 완료"
        ] : [
          "기존 대출 현황 및 DSR 재계산",
          "신용등급 최신 상태 확인",
          "우대금리 조건 변경사항 체크",
          "상환방식별 월 상환액 비교"
        ],
        fields: mergedProfile
      });
    }

    // 대화형 질문 처리 (이전 답변에 대한 질문)
    const conversationalPatterns = [
      /뭐가|무엇이|왜|어떻게|어떤|설명해|알려줘|궁금해|이해가|의미가|뜻이/,
      /그게|그것이|그건|저게|저것이|저건/,
      /맞아|틀려|정말|진짜|그래|아니야|아닌데|맞네|어떻게|어떤거/,
      /^(뭐|무엇|왜|어떻게|어떤)/
    ];
    
    const isConversationalQuestion = conversationalPatterns.some(pattern => pattern.test(message.toLowerCase()));
    
    if (isConversationalQuestion) {
      const t = message.toLowerCase();
      
      // 금액에 대한 질문 (예: "뭐가 84만원이야?")
      if (/만원|억원|원/.test(t) && /뭐가|무엇이|어떤/.test(t)) {
        return NextResponse.json({
          content: `앞서 말씀드린 **전세→월세 환산 결과**입니다! 💡\n\n` +
                   `🏠 **전세보증금**을 월세로 환산할 때:\n` +
                   `• 일반적으로 **월 0.3%** 기준으로 계산해요\n` +
                   `• 예: 2억8천만원 × 0.3% = 월 84만원\n\n` +
                   `💰 **이 금액의 의미**:\n` +
                   `• 전세보증금을 월세로 바꿨을 때의 월 임대료\n` +
                   `• 실제 시장 월세와 비교해서 전세가 유리한지 판단 가능\n` +
                   `• 지역과 물건에 따라 0.25%~0.4% 범위에서 달라질 수 있어요\n\n` +
                   `🤔 **추가 궁금한 점**이 있으시면 언제든 말씀해 주세요!`,
          cards: [{
            title: "전세→월세 환산 설명",
            subtitle: "월 0.3% 기준 계산",
            monthly: "시장 기준 환산율",
            totalInterest: "지역별 차등 적용",
            notes: [
              "일반적 기준: 월 0.3%",
              "지역별 범위: 0.25%~0.4%",
              "시장 월세와 비교 참고용",
              "실제 협상에서 활용 가능"
            ]
          }],
          checklist: [
            "해당 지역 실제 월세 시세 확인",
            "전세 vs 월세 총 비용 비교",
            "임대차 계약 조건 검토"
          ],
          fields: mergedProfile
        });
      }
      
      // 일반적인 설명 요청
      if (/설명해|알려줘|궁금해|의미가|뜻이/.test(t)) {
        return NextResponse.json({
          content: `구체적으로 어떤 부분이 궁금하신지 알려주시면 더 정확하게 설명드릴게요! 😊\n\n` +
                   `💡 **자주 묻는 질문들**:\n` +
                   `• 전세→월세 환산이 뭔가요?\n` +
                   `• LTV, DSR이 뭐예요?\n` +
                   `• 보금자리론과 디딤돌 대출 차이는?\n` +
                   `• 대출 한도는 어떻게 계산하나요?\n` +
                   `• 우대금리 조건은 어떻게 되나요?\n\n` +
                   `📞 **구체적인 질문 예시**:\n` +
                   `• "월소득 400만원으로 얼마까지 대출 가능해?"\n` +
                   `• "3억 전세와 보증금 5천+월세 80만원 중 뭐가 나아?"\n` +
                   `• "신혼부부 우대금리 얼마나 받을 수 있어?"`,
          fields: mergedProfile
        });
      }
      
      // 확인/동의 질문
      if (/맞아|틀려|정말|진짜|그래/.test(t)) {
        return NextResponse.json({
          content: `네, 맞습니다! 👍\n\n` +
                   `더 궁금한 점이나 다른 상황에 대해 알고 싶으시면 언제든 말씀해 주세요.\n\n` +
                   `💡 **추가로 도움드릴 수 있는 것들**:\n` +
                   `• 구체적인 대출 시나리오 분석\n` +
                   `• 여러 지역/조건별 비교\n` +
                   `• 최적의 대출 상품 추천\n` +
                   `• 월 상환액 계산 및 시뮬레이션`,
          fields: mergedProfile
        });
      }
    }

    // 일반적인 폴백 응답
    return NextResponse.json({
      content: `요청을 이해했어요. 구체적으로 알려주시면 바로 계산/비교해 드릴게요.\n\n` +
               `💡 **대출 시나리오 분석**이 필요하시면:\n` +
               `"월소득 500만원, 5억원 집 구입, 자기자본 1억원" 처럼 말씀해 주세요.\n\n` +
               `다른 예시:\n` +
               `• "전세 2억5천 vs 보증금 3억·월세 90만 비교"\n` +
               `• "LTV/DSR 한도 추정"\n` +
               `• "보금자리론 생애최초 LTV 한도"\n` +
               `• "디딤돌 대출 자격 조건"\n` +
               `• "중기청 대출 대위변제 방법"`,
      fields: mergedProfile
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}