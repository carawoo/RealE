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
  generateSpecificLoanPolicyResponse 
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

    // 월소득 기반 대출 가능성 및 상품 추천 처리 (전세→월세 환산보다 우선)
    if (/(월소득|월급|월급여|월\s*\d+만원|\d+만원.*월소득)/.test(message.toLowerCase())) {
      const incomeMatch = message.match(/(\d+)만원/);
      const monthlyIncome = incomeMatch ? parseInt(incomeMatch[1]) * 10000 : null;
      
      if (monthlyIncome) {
        const annualIncome = monthlyIncome * 12;
        const context = analyzeQuestionContext(message);
        
        let loanRecommendations = "";
        let possibleLoans = [];
        
        // 보금자리론 자격 확인 (연소득 1억원 이하)
        if (annualIncome <= 100_000_000) {
          possibleLoans.push("보금자리론");
          loanRecommendations += `🏠 **보금자리론**: ✅ 가능 (연소득 ${formatKRW(annualIncome)}원)\n` +
                                 `• 최대한도: ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.bogeumjari)}원\n` +
                                 `• LTV: 50-80% (지역/유형별 차등)\n` +
                                 `• 금리: 연 2.5~3.5% (우대조건 시 최저 1.0%)\n\n`;
        }
        
        // 디딤돌 대출 자격 확인 (연소득 7천만원 이하)
        if (annualIncome <= 70_000_000) {
          possibleLoans.push("디딤돌");
          loanRecommendations += `🏘️ **디딤돌 대출**: ✅ 가능 (연소득 ${formatKRW(annualIncome)}원)\n` +
                                 `• 최대한도: ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.didimdol)}원\n` +
                                 `• LTV: 50-70% (지역/유형별 차등)\n` +
                                 `• 금리: 연 3.2~4.05% (우대조건 시 최저 2.7%)\n\n`;
        }
        
        // 버팀목 전세자금 (연소득 5천만원 이하)
        if (annualIncome <= 50_000_000) {
          possibleLoans.push("버팀목");
          loanRecommendations += `🏠 **버팀목 전세자금**: ✅ 가능 (연소득 ${formatKRW(annualIncome)}원)\n` +
                                 `• 최대한도: ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.buttumok)}원\n` +
                                 `• 전세보증금의 80%까지\n` +
                                 `• 금리: 연 2.2~3.3% (우대조건 시 최저 1.0%)\n\n`;
        }
        
        // 청년 전용 전세자금 (연소득 5천만원 이하, 만 19-34세)
        if (annualIncome <= 50_000_000) {
          possibleLoans.push("청년전용");
          loanRecommendations += `👨‍🎓 **청년 전용 전세자금**: ✅ 가능 (연소득 ${formatKRW(annualIncome)}원)\n` +
                                 `• 최대한도: ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.youth)}원\n` +
                                 `• 만 19~34세 무주택 세대주\n` +
                                 `• 금리: 연 2.2~3.3% (우대조건 시 최저 1.0%)\n\n`;
        }
        
        if (possibleLoans.length === 0) {
          return NextResponse.json({
            content: `**대출 자격 안내** 💼\n\n` +
                     `📊 **현재 소득**: 월 ${formatKRW(monthlyIncome)}원 (연 ${formatKRW(annualIncome)}원)\n\n` +
                     `❌ **가능한 대출 상품 없음**:\n` +
                     `• 주택금융 대출은 연소득 기준으로 자격이 제한됩니다\n` +
                     `• 현재 소득으로는 일반 주택담보대출을 고려해보세요\n\n` +
                     `💡 **대안**:\n` +
                     `• 일반 주택담보대출 (은행별 상품)\n` +
                     `• 전세자금 대출 (일반 은행)\n` +
                     `• 소득 증빙 서류 준비 후 재상담\n\n` +
                     getCurrentPolicyDisclaimer(),
            cards: [{
              title: "대출 자격 미달",
              subtitle: "일반 주택담보대출 고려",
              monthly: "은행별 상품 확인",
              totalInterest: "일반 금리 적용",
              notes: [
                "연소득 기준 미달",
                "일반 주택담보대출 추천",
                "은행별 상품 비교 필요",
                "소득 증빙 서류 준비"
              ]
            }],
            checklist: [
              "일반 은행 주택담보대출 문의",
              "소득 증빙 서류 준비",
              "신용등급 확인",
              "다른 은행 상품 비교"
            ],
            fields: mergedProfile
          });
        }
        
        return NextResponse.json({
          content: `**월소득 ${formatKRW(monthlyIncome)}원 대출 가능 상품 안내** 💰\n\n` +
                   `📊 **현재 소득**: 월 ${formatKRW(monthlyIncome)}원 (연 ${formatKRW(annualIncome)}원)\n\n` +
                   `✅ **가능한 대출 상품**:\n\n` +
                   loanRecommendations +
                   `💡 **다음 단계**:\n` +
                   `• 구체적인 매물 정보를 알려주시면 정확한 한도 계산\n` +
                   `• "월소득 ${formatKRW(monthlyIncome)}원, 5억원 아파트 구입" 형태로 말씀해 주세요\n` +
                   `• 기금e든든에서 사전 모의심사 진행\n\n` +
                   getCurrentPolicyDisclaimer(),
          cards: [{
            title: `월소득 ${formatKRW(monthlyIncome)}원 대출 상품`,
            subtitle: `${possibleLoans.length}개 상품 가능`,
            monthly: "상품별 차등 적용",
            totalInterest: "우대조건별 차등",
            notes: [
              `연소득: ${formatKRW(annualIncome)}원`,
              `가능 상품: ${possibleLoans.join(", ")}`,
              "구체적 매물 정보 필요",
              "기금e든든 모의심사 필수"
            ]
          }],
          checklist: [
            "구체적 매물 정보 제공",
            "기금e든든 모의심사 완료",
            "우대조건 확인 (신혼부부, 생애최초)",
            "여러 상품 비교 검토"
          ],
          fields: mergedProfile
        });
      }
    }

    // 전세→월세 환산 처리
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

    // LTV/DSR 한도 추정 및 구체적 계산 요청 (최우선 처리)
    if (/ltv.*dsr|dsr.*ltv/i.test(message) && (/한도|추정|계산|얼마/.test(message))) {
      return NextResponse.json({
        content: `**LTV/DSR 한도 정확 계산** 💰\n\n` +
                 `정확한 한도 계산을 위해 다음 정보를 알려주세요:\n\n` +
                 `🏠 **필수 정보**:\n` +
                 `• 월소득: "월소득 500만원"\n` +
                 `• 매물가격: "5억원 아파트"\n` +
                 `• 지역: "서울" 또는 "부산" 등\n` +
                 `• 대상: "생애최초" 또는 "일반"\n\n` +
                 `💡 **예시**: "월소득 500만원, 서울 5억원 아파트 생애최초 LTV DSR 한도 계산해줘"\n\n` +
                 `📊 **즉시 계산 제공**:\n` +
                 `• LTV 한도: 지역/유형별 정확한 비율\n` +
                 `• DSR 한도: 소득 대비 상환능력\n` +
                 `• 최대 대출금액: 구체적 금액\n` +
                 `• 월상환액: 상환방식별 시뮬레이션${getCurrentPolicyDisclaimer()}`,
        cards: [{
          title: "LTV/DSR 한도 계산기",
          subtitle: "전문가 수준 정확한 계산",
          monthly: "즉시 계산 제공",
          totalInterest: "맞춤형 시뮬레이션",
          notes: [
            "실시간 LTV 비율 적용",
            "DSR 70% 기준 상환능력 분석", 
            "지역별/대상별 우대조건 반영",
            "3가지 상환방식 비교",
            "월상환액 정확 계산"
          ]
        }],
        checklist: [
          "월소득 정확한 금액 확인",
          "매물 지역 및 유형(아파트/아파트외) 파악",
          "생애최초/신혼부부 등 우대조건 확인",
          "기존 대출 잔액 및 DSR 영향 요소 점검"
        ],
        fields: mergedProfile
      });
    }

    // 디딤돌 한도/ltv/DSR 질문 전용 핸들러 (간단 안내)
    if (message.toLowerCase().includes('디딤돌') && (/한도|ltv|dsr/.test(message))) {
      const policyMax = CURRENT_LOAN_POLICY.maxAmount.bogeumjari;
      return NextResponse.json({
        content: `**디딤돌 대출 한도/DSR 안내** 🏠\n\n` +
                 `• 한도: 최대 ${formatKRW(policyMax)}원 (상품/지역/소득에 따라 달라짐)\n` +
                 `• LTV/DSR: 주택가격, 소득, 기존 대출에 따라 심사\n\n` +
                 `정확한 계산을 위해 매매가/월소득/자기자본 정보를 알려주시면 즉시 계산해 드릴게요.`,
        cards: null,
        checklist: ['매매가 확인', '월소득 확인', '자기자본 확인'],
        fields: mergedProfile
      });
    }

    // 구체적 한도 질문 (지역+금액 포함)
    if (/(\d+억|\d+만원)/.test(message) && (/한도|얼마|최대|대출/.test(message)) && 
        /(서울|경기|인천|부산|대구|생애최초|아파트)/.test(message)) {
      
      const t = message.toLowerCase();
      const isFirstTime = t.includes("생애최초");
      const isMetro = /(서울|경기|인천)/.test(t);
      const isApartment = t.includes("아파트") && !t.includes("외");
      
      const policy = CURRENT_LOAN_POLICY;
      const ltvData = isFirstTime ? policy.ltv.firstTime : policy.ltv.bogeumjari;
      const regionData = isMetro ? ltvData.metro : ltvData.nonMetro;
      const ltvRate = isApartment ? regionData.apartment : regionData.nonApartment;
      
      // 매물가격 추출 시도
      const priceMatch = t.match(/(\d+)억/);
      const propertyPrice = priceMatch ? parseInt(priceMatch[1]) * 100_000_000 : null;
      const maxLoanAmount = propertyPrice ? Math.min(propertyPrice * (ltvRate / 100), policy.maxAmount.bogeumjari) : null;
      
      return NextResponse.json({
        content: `**정확한 대출 한도 계산** 🎯\n\n` +
                 `📍 **지역**: ${isMetro ? '수도권 규제지역' : '비규제지역'}\n` +
                 `🏠 **유형**: ${isApartment ? '아파트' : '아파트 외 주택'}\n` +
                 `👤 **대상**: ${isFirstTime ? '생애최초 특례' : '일반'}\n\n` +
                 `📊 **LTV 한도**: ${ltvRate}%\n` +
                 (propertyPrice ? 
                   `💰 **최대 대출금액**: ${formatKRW(maxLoanAmount)}원\n` +
                   `   (매물가 ${formatKRW(propertyPrice)}원 × ${ltvRate}%)\n\n`
                   : 
                   `💰 **한도 계산**: 매물가 × ${ltvRate}%\n\n`
                 ) +
                 `⚠️ **추가 고려사항**:\n` +
                 `• DSR ${policy.dsr.limit}% 이하 (소득 대비 상환능력)\n` +
                 `• 절대상한: ${formatKRW(policy.maxAmount.bogeumjari)}원\n` +
                 `• 소득증빙 및 신용도 심사 필요\n\n` +
                 `📞 **정확한 월상환액 계산**을 원하시면:\n` +
                 `"월소득 000만원" 정보를 추가로 알려주세요.${getCurrentPolicyDisclaimer()}`,
        cards: [{
          title: `${isFirstTime ? '생애최초' : '일반'} 대출 한도`,
          subtitle: `${isMetro ? '수도권' : '지방'} ${isApartment ? '아파트' : '아파트외'}`,
          monthly: maxLoanAmount ? formatKRW(maxLoanAmount) + "원" : `${ltvRate}% 적용`,
          totalInterest: `LTV ${ltvRate}%`,
          notes: [
            `지역: ${isMetro ? '서울/경기/인천 (규제지역)' : '기타 지역'}`,
            `주택유형: ${isApartment ? '아파트' : '아파트 외 (5%p 차감)'}`,
            `LTV 한도: ${ltvRate}%`,
            `절대상한: ${formatKRW(policy.maxAmount.bogeumjari)}원`,
            `DSR 상한: ${policy.dsr.limit}%`
          ]
        }],
        checklist: [
          "매물가격 및 정확한 주소 확인", 
          "월소득 및 기존 대출 현황 파악",
          "생애최초/신혼부부 자격 요건 확인",
          "신용등급 및 소득증빙 서류 준비"
        ],
        fields: mergedProfile
      });
    }

    // 중기청 관련 질문 처리 (맥락 기반)
    if (/중기청.*100|중소기업.*청년.*전월세|중기청.*대출/.test(message)) {
      const t = message.toLowerCase();
      
      // 기존 사용자 관련 질문 (대위변제, 연장 등)
      if (/대위변제|허그|반환|연장|기존.*사용|현재.*받/.test(t)) {
        return NextResponse.json({
          content: `**중기청 대출 기존 사용자 상담** 🔄\n\n` +
                   `📋 **현재 상황**: 기존 중기청 대출을 이용 중이시군요.\n\n` +
                   `💡 **대위변제 (HUG) 안내**:\n` +
                   `• 집주인이 보증금 반환을 거부하는 경우\n` +
                   `• HUG에서 대위변제로 보증금 지급\n` +
                   `• 이후 HUG에서 집주인에게 법적 추심\n\n` +
                   `🔄 **대출 연장 방법**:\n` +
                   `• 기존 대출 만료 전 3개월 이내 신청\n` +
                   `• 연장 조건: 소득 기준 유지, 신용상태 양호\n` +
                   `• 서류: 소득증명서, 재직증명서, 신용정보조회동의서\n\n` +
                   `⚠️ **주의사항**:\n` +
                   `• 2024년 말 신규 신청 종료\n` +
                   `• 기존 대출은 계속 이용 가능\n` +
                   `• 연장 시 최신 기준 적용\n\n` +
                   `📞 **상담 문의**: HUG 고객센터 또는 취급은행`,
          cards: [{
            title: "중기청 대출 기존 사용자",
            subtitle: "대위변제 및 연장 안내",
            monthly: "기존 조건 유지",
            totalInterest: "연장 시 최신 기준",
            notes: [
              "대위변제: HUG에서 보증금 지급",
              "연장: 만료 전 3개월 이내 신청",
              "2024년 말 신규 신청 종료",
              "기존 대출 계속 이용 가능",
              "연장 시 최신 기준 적용"
            ]
          }],
          checklist: [
            "기존 대출 만료일 확인",
            "연장 신청 기간 체크 (만료 전 3개월)",
            "소득 기준 유지 여부 확인",
            "신용상태 점검",
            "필수 서류 준비"
          ],
          fields: mergedProfile
        });
      }
      
      // 신규 신청 관련 질문 (종료 안내)
      return NextResponse.json({
        content: `⚠️ **중기청 100억 대출 종료 안내**\n\n` +
                 `중소기업 취업 청년 전월세 보증금 대출(일명 '중기청 100')은 **2024년 말 종료**되어 더 이상 신청할 수 없습니다.\n\n` +
                 `💡 **대안 프로그램**: '청년 버팀목 전세자금대출'로 통합 운영\n` +
                 `• 대상: 만 19~34세 무주택 세대주\n` +
                 `• 한도: 최대 200,000,000원 (전세보증금의 80%)\n` +
                 `• 금리: 연 2.2~3.3% (우대조건 시 최저 1.0%)\n` +
                 `• 소득: 연 5천만원 이하\n\n` +
                 `📞 **신청 문의**: HUG 고객센터 또는 취급은행`,
        cards: [{
          title: "청년 버팀목 전세자금대출",
          subtitle: "중기청 대출 대안",
          monthly: "연 2.2~3.3%",
          totalInterest: "최대 2억원",
          notes: [
            "만 19~34세 무주택 세대주",
            "전세보증금의 80%",
            "연소득 5천만원 이하",
            "우대조건 시 최저 1.0%",
            "HUG 또는 취급은행 신청"
          ]
        }],
        checklist: [
          "연령 확인 (만 19~34세)",
          "무주택 세대주 자격 확인",
          "연소득 5천만원 이하 확인",
          "전세보증금 계약 확인",
          "HUG 또는 취급은행 문의"
        ],
        fields: mergedProfile
      });
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