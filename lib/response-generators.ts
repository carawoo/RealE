import { Fields } from './utils';
import { analyzeQuestionContext, isRepaymentTypeQuestion } from './question-analyzer';
import { CURRENT_LOAN_POLICY, getCurrentPolicyDisclaimer } from './policy-data';
import { 
  generateLoanScenarios, 
  convertScenarioToCard, 
  LoanInputs,
  formatKRW,
  analyzeSpecificLoanPolicy,
  formatPercent,
  parseWon
} from './loan-calculator';

// 대출 시나리오 생성 및 응답 처리
export function generateLoanScenariosResponse(profile: Fields) {
  const { incomeMonthly, cashOnHand, propertyPrice, downPayment, loanPeriodYears } = profile;
  
  // 필수 정보 확인
  if (!incomeMonthly || !propertyPrice) {
    return {
      content: "대출 시나리오 계산을 위해 다음 정보가 필요해요:\n" +
               "• 월소득\n• 매매가\n• 자기자본(계약금)\n\n" +
               "예: \"월소득 500만원, 5억원 집 구입, 자기자본 1억원\"",
      cards: null,
      checklist: ["월소득 확인", "매매가 확인", "자기자본 확인", "대출기간 결정(기본 30년)"]
    };
  }
  
  // 기본값 설정
  const inputs: LoanInputs = {
    propertyPrice,
    downPayment: downPayment || cashOnHand || propertyPrice * 0.2, // 기본값: 20%
    incomeMonthly,
    cashOnHand: cashOnHand || 0,
    loanPeriodYears: loanPeriodYears || 30 // 기본값: 30년
  };
  
  try {
    const scenarios = generateLoanScenarios(inputs);
    const cards = scenarios.map(convertScenarioToCard);
    
    // 연소득 계산
    const annualIncome = incomeMonthly * 12;
    
    // 정책자금 자격 확인 및 추천
    let policyRecommendations = "";
    let recommendedLoans = [];
    
    // 보금자리론 자격 확인 (연소득 1억원 이하)
    if (annualIncome <= 100_000_000) {
      recommendedLoans.push("보금자리론");
      policyRecommendations += `🏠 **보금자리론**: ✅ 추천 (연소득 ${formatKRW(annualIncome)}원)\n` +
                               `• 최대한도: ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.bogeumjari)}원\n` +
                               `• 금리: 연 2.5~3.5% (우대조건 시 최저 1.0%)\n` +
                               `• LTV: 50-80% (지역/유형별 차등)\n\n`;
    }
    
    // 디딤돌 대출 자격 확인 (연소득 7천만원 이하)
    if (annualIncome <= 70_000_000) {
      recommendedLoans.push("디딤돌");
      policyRecommendations += `🏘️ **디딤돌 대출**: ✅ 추천 (연소득 ${formatKRW(annualIncome)}원)\n` +
                               `• 최대한도: ${formatKRW(CURRENT_LOAN_POLICY.maxAmount.didimdol)}원\n` +
                               `• 금리: 연 3.2~4.05% (우대조건 시 최저 2.7%)\n` +
                               `• LTV: 50-70% (지역/유형별 차등)\n\n`;
    }
    
    // 일반 주택담보대출 (모든 소득대상)
    recommendedLoans.push("일반 주택담보대출");
    policyRecommendations += `🏦 **일반 주택담보대출**: 기본 상품\n` +
                             `• 금리: 연 3.5~5.0% (은행별 차등)\n` +
                             `• LTV: 40-70% (지역/규제별 차등)\n` +
                             `• DSR: 40% 이하 (소득 대비 상환능력)\n\n`;
    
    return {
      content: `**${formatKRW(propertyPrice)}원 매물 매매 대출 상담** 🏠\n\n` +
               `📊 **기본 정보**:\n` +
               `• 월소득: ${formatKRW(incomeMonthly)}원 (연 ${formatKRW(annualIncome)}원)\n` +
               `• 매물가격: ${formatKRW(propertyPrice)}원\n` +
               `• 추정 계약금: ${formatKRW(inputs.downPayment)}원\n\n` +
               `💡 **추천 대출 상품**:\n\n` +
               policyRecommendations +
               `📋 **3가지 대출 시나리오** (아래 카드 참조):\n` +
               `• 보수적 시나리오: 안전한 상환 계획\n` +
               `• 균형적 시나리오: 적정 수준의 대출\n` +
               `• 적극적 시나리오: 최대한도 활용\n\n` +
               `🔍 **다음 단계**:\n` +
               `• 기금e든든에서 사전 모의심사 진행\n` +
               `• 우대조건 확인 (신혼부부, 생애최초, 청약저축 등)\n` +
               `• 여러 은행 상품 비교 검토`,
      cards,
      checklist: [
        "기금e든든 사전 모의심사 완료",
        "우대조건 확인 (신혼부부, 생애최초, 청약저축)",
        "DSR 40% 이하 유지 계획",
        "여러 은행 상품 비교 검토",
        "중도상환 계획 수립"
      ]
    };
  } catch (error) {
    return {
      content: "시나리오 계산 중 오류가 발생했어요. 입력 정보를 다시 확인해 주세요.",
      cards: null,
      checklist: null
    };
  }
}

// 맥락에 맞는 개인화된 응답을 생성하는 함수
export function generateContextualResponse(context: ReturnType<typeof analyzeQuestionContext>, loanType: string, baseInfo: any): string {
  const { questionType, urgency, experienceLevel } = context;
  
  let responseStart = "";
  
  // 경험 수준에 따른 응답 스타일 조정
  if (experienceLevel === 'first_time') {
    responseStart = `**${loanType} 첫 신청자를 위한 안내** 🔰\n\n`;
  } else if (experienceLevel === 'experienced') {
    responseStart = `**${loanType} 추가 상담** 💼\n\n`;
  } else {
    responseStart = `**${loanType} 전문 상담** 🏠\n\n`;
  }
  
  // 긴급성에 따른 우선순위 조정
  if (urgency === 'immediate') {
    responseStart += `⚡ **긴급 상담**: 빠른 처리가 필요한 상황이시군요.\n\n`;
  } else if (urgency === 'planning') {
    responseStart += `📋 **사전 준비**: 계획 단계에서 미리 준비하시는군요.\n\n`;
  }
  
  return responseStart;
}

// 전문 정책 상담 응답 생성
export function generateSpecificLoanPolicyResponse(text: string) {
  const t = text.toLowerCase();
  const questionContext = analyzeQuestionContext(text);
  
  // 디딤돌 대출 관련 질문 처리
  if (t.includes("디딤돌")) {
    // 상환방식 관련 구체적 질문인지 확인
    if (isRepaymentTypeQuestion(t)) {
      let loanType = "일반";
      let loanAmount = 250_000_000; // 기본 2.5억
      let repaymentType: "원리금균등" | "체증식" | "원금균등" = "원리금균등";
      
      // 대출 유형 식별
      if (t.includes("신혼부부")) loanType = "신혼부부";
      if (t.includes("생애최초")) loanType = "생애최초";
      
      // 대출 금액 추출
      const amountMatch = text.match(/(\d+)억/);
      if (amountMatch) loanAmount = parseInt(amountMatch[1]) * 100_000_000;
      
      // 상환방식 식별
      if (t.includes("체증식")) repaymentType = "체증식";
      if (t.includes("원금균등")) repaymentType = "원금균등";
      
      const analysis = analyzeSpecificLoanPolicy(loanType, loanAmount, repaymentType);
      if (!analysis) {
        return {
          content: "분석에 실패했어요. 다시 시도해 주세요.",
          cards: null,
          checklist: null
        };
      }
      
      const typeInfo = analysis.repaymentType;
      const isGradual = repaymentType === "체증식";
      
      return {
        content: `**디딤돌 ${loanType} 대출 상담** 🏠\n\n` +
                 `${analysis.explanation}\n\n` +
                 `💡 **상환방식별 특징**:\n` +
                 `• ${typeInfo.description}\n` +
                 `• 기본금리: ${formatPercent(analysis.baseRate)}\n` +
                 `• 적용금리: ${formatPercent(analysis.adjustedRate)}` +
                 (isGradual ? ` (체증식 +0.3%p 적용)` : ``) + `\n\n` +
                 `📋 **월 상환액**:\n` +
                 (isGradual ? 
                   `• 초기 ${Math.ceil(5)} 년: 월 ${formatKRW(analysis.payments.initialPayment)}원 (이자만)\n` +
                   `• 이후 기간: 월 ${formatKRW(analysis.payments.finalPayment || 0)}원 (원리금)`
                   :
                   `• 매월: ${formatKRW(analysis.payments.initialPayment)}원`
                 ),
        cards: [{
          title: `디딤돌대출(${loanType}) - ${repaymentType}`,
          subtitle: typeInfo.description,
          monthly: isGradual ? 
            `초기 ${formatKRW(analysis.payments.initialPayment)}원 → 후기 ${formatKRW(analysis.payments.finalPayment || 0)}원` :
            `월 ${formatKRW(analysis.payments.initialPayment)}원`,
          totalInterest: `적용금리 ${formatPercent(analysis.adjustedRate)}`,
          notes: [
            `대출금액: ${formatKRW(loanAmount)}원`,
            `기본금리: ${formatPercent(analysis.baseRate)}`,
            ...(isGradual ? [`체증식 추가금리: +${formatPercent(typeInfo.interestRateAdjustment)}`] : []),
            `최종적용금리: ${formatPercent(analysis.adjustedRate)}`,
            `신청링크: https://www.hf.go.kr`
          ]
        }],
        checklist: [
          "기금e든든에서 최신 금리 재확인",
          "개인 신용상태 및 소득증빙 준비",
          "우대금리 적용 조건 확인 (신혼부부, 생애최초, 청약저축 등)",
          isGradual ? "체증식 선택 시 후반기 상환부담 증가 고려" : "고정금리 vs 변동금리 선택 검토",
          "타 은행 대출 조건과 비교 검토"
        ]
      };
    }
    
    // 일반적인 디딤돌 질문 (자격, 한도, 기간 등) 맥락 기반 처리
    const context = questionContext;
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
    
    return {
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
      ]
    };
  }
  
  // 보금자리론 생애최초 질문 처리
  if ((t.includes("보금자리") || t.includes("보금자리론")) && t.includes("생애최초")) {
    const policy = CURRENT_LOAN_POLICY;
    const metroApt = policy.ltv.firstTime.metro.apartment;
    const metroNonApt = policy.ltv.firstTime.metro.nonApartment;
    const nonMetroApt = policy.ltv.firstTime.nonMetro.apartment;
    
    return {
      content: `**보금자리론 생애최초 대출 상담** 🏠\n\n` +
               `📋 **현재 LTV 한도 (${policy.year}년 기준)**:\n` +
               `• **수도권**: 아파트 ${metroApt}%, 아파트 외 ${metroNonApt}%\n` +
               `• **비수도권**: 아파트 ${nonMetroApt}%, 아파트 외 ${policy.ltv.firstTime.nonMetro.nonApartment}%\n\n` +
               `🏢 **주택유형별 LTV 적용**:\n` +
               `• **아파트**: ${metroApt}% (수도권 기준)\n` +
               `• **아파트 외 주택** (연립, 다세대, 단독): ${metroNonApt}%\n` +
               `  → 아파트 대비 ${metroApt - metroNonApt}%p 차감\n\n` +
               `💡 **생애최초 특례 혜택**:\n` +
               `• 일반 보금자리론 대비 우대 적용\n` +
               `• 최대 ${Math.max(...Object.values(policy.ltv.firstTime.metro), ...Object.values(policy.ltv.firstTime.nonMetro))}% 한도\n` +
               `• DSR ${policy.dsr.firstTimeLimit}% 이하 유지 필요\n\n` +
               `⚠️ **주의사항**:\n` +
               `지역 및 주택유형에 따라 LTV 차이가 있으니 정확한 한도는 개별 상담 필요${getCurrentPolicyDisclaimer()}`,
      cards: [{
        title: "보금자리론 생애최초 LTV 한도",
        subtitle: `${policy.year}년 최신 기준`,
        monthly: "수도권 기준",
        totalInterest: `최대 ${metroApt}% (아파트)`,
        notes: [
          `아파트: ${metroApt}% (수도권), ${nonMetroApt}% (비수도권)`,
          `아파트 외: ${metroNonApt}% (수도권), ${policy.ltv.firstTime.nonMetro.nonApartment}% (비수도권)`,
          "생애최초 특례 우대 적용",
          `DSR 최대 ${policy.dsr.firstTimeLimit}%`,
          "금리: 연 3.2~4.0% (변동금리)"
        ]
      }],
      checklist: [
        `아파트 vs 아파트 외 주택 LTV 차이 ${metroApt - metroNonApt}%p 확인`,
        `수도권 기준 자기자본 최소 ${100 - metroNonApt}% 준비 (아파트 외)`,
        "생애최초 자격조건 재확인 (무주택 세대주, 소득기준 등)",
        `DSR ${policy.dsr.firstTimeLimit}% 이하 유지 가능한지 소득 대비 상환능력 점검`
      ]
    };
  }
  
  // 보금자리론 신청 기간/절차 질문 처리 (맥락 기반)
  if ((t.includes("보금자리") || t.includes("보금자리론")) && 
      (t.includes("기간") || t.includes("신청") || t.includes("절차") || t.includes("얼마") || t.includes("언제")) &&
      !(/ltv|한도/.test(t))) {
    
    const context = questionContext;
    const contextualStart = generateContextualResponse(context, "보금자리론", {});
    
    let timelineInfo = "";
    let procedureInfo = "";
    let urgentTips = "";
    
    // 질문 유형에 따른 맞춤 응답
    if (context.questionType === 'timeline') {
      // 시간/기간에 집중한 질문
      if (context.urgency === 'immediate') {
        timelineInfo = `⚡ **긴급 신청 시**:\n` +
                      `• 서류 완비 시 최단 **2주** 가능\n` +
                      `• 모든 서류를 미리 준비하고 은행 방문\n` +
                      `• 기금e든든 사전심사로 1-2일 단축\n\n`;
      } else {
        timelineInfo = `📅 **표준 처리기간**:\n` +
                      `• 일반적으로 **2-3주 소요** (서류 완비 기준)\n` +
                      `• 계절별 차이: 연말/연초 더 오래 걸림\n` +
                      `• 심사 복잡도에 따라 1-4주 범위\n\n`;
      }
    } else if (context.questionType === 'application_process') {
      // 절차/과정에 집중한 질문
      procedureInfo = `🔄 **신청 절차 (단계별 안내)** (${context.experienceLevel === 'first_time' ? '처음 신청자용' : '경험자 핵심 포인트'}):\n` +
                     (context.experienceLevel === 'first_time' ? 
                       `1️⃣ **사전 준비**: 소득증명서, 재직증명서 준비\n` +
                       `2️⃣ **자격 확인**: 기금e든든에서 모의심사\n` +
                       `3️⃣ **은행 선택**: 우대금리 조건 비교\n` +
                       `4️⃣ **서류 제출**: 취급은행 방문 신청\n` +
                       `5️⃣ **심사 대기**: 3-7일 소요\n` +
                       `6️⃣ **승인 후 실행**: 계약 및 실행\n\n`
                       :
                       `• 서류 접수 → 심사 → 승인 → 실행 (단계별)\n` +
                       `• 각 단계별 3-7일 소요\n` +
                       `• 병행 가능: 모의심사와 서류준비\n\n`
                     );
    }
    
    // 긴급성에 따른 팁
    if (context.urgency === 'immediate') {
      urgentTips = `🚀 **빠른 진행 필수 팁**:\n` +
                   `• 모든 서류를 사전에 완벽 준비\n` +
                   `• 기금e든든 모의심사 먼저 완료\n` +
                   `• 은행에 미리 전화로 빠른 처리 요청\n` +
                   `• 오전 일찍 방문하여 당일 접수\n\n`;
    } else if (context.experienceLevel === 'first_time') {
      urgentTips = `💡 **첫 신청자 꿀팁**:\n` +
                   `• 기금e든든에서 사전 모의심사 필수\n` +
                   `• 여러 은행 조건 비교 후 선택\n` +
                   `• 서류 부족 시 재방문 하지 않도록 체크리스트 확인\n` +
                   `• 우대금리 조건(신혼부부, 생애최초) 미리 확인\n\n`;
    }
    
    const seasonalNote = new Date().getMonth() >= 10 || new Date().getMonth() <= 1 ? 
      `⚠️ **연말연초 주의**: 현재 신청이 몰리는 시기로 평소보다 1-2주 더 걸릴 수 있어요.\n` :
      `📊 **현재 상황**: 비교적 원활한 처리 시기입니다.\n`;
    
    return {
      content: contextualStart +
               timelineInfo +
               procedureInfo +
               urgentTips +
               seasonalNote +
               getCurrentPolicyDisclaimer(),
      
      cards: [{
        title: `보금자리론 ${context.questionType === 'timeline' ? '처리기간' : '신청절차'}`,
        subtitle: context.urgency === 'immediate' ? "긴급처리 가이드" : "표준 프로세스",
        monthly: context.urgency === 'immediate' ? "최단 2주" : "표준 2-3주",
        totalInterest: "연중 상시 접수",
        notes: context.urgency === 'immediate' ? [
          "모든 서류 사전 완비 필수",
          "기금e든든 모의심사 완료",
          "은행 사전 연락 후 방문",
          "최단 2주, 통상 2-3주 소요"
        ] : [
          "1단계: 서류준비 (1-3일)",
          "2단계: 신청접수 (1일)", 
          "3단계: 심사완료 (5-10일)",
          "4단계: 승인·실행 (3-5일)",
          "사전 모의심사 권장"
        ]
      }],
      
      checklist: context.experienceLevel === 'first_time' ? [
        "무주택 세대주 자격 확인",
        "연소득 7천만원 이하 확인",
        "소득증명서, 재직증명서 준비",
        "기금e든든 모의심사 완료"
      ] : [
        "필수서류 완비 상태 점검",
        "우대금리 적용 조건 재확인",
        "취급은행별 처리기간 문의",
        "신용등급 및 DSR 사전 점검"
      ]
    };
  }

  // 보금자리론 일반 LTV 질의 (생애최초 아님) - 지역/유형 기준으로 퍼센트 안내
  if ((t.includes("보금자리") || t.includes("보금자리론")) &&
      !t.includes("생애최초") &&
      (/ltv|한도/.test(t)) &&
      /(서울|경기|인천|수도권|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)/.test(t)) {
    const isMetro = /(서울|경기|인천|수도권)/.test(t);
    const policy = CURRENT_LOAN_POLICY;
    const regionData = isMetro ? policy.ltv.bogeumjari.metro : policy.ltv.bogeumjari.nonMetro;
    const apt = regionData.apartment;
    const nonApt = regionData.nonApartment;

    return {
      content: `**보금자리론 LTV 안내** 🏠\n\n` +
               `📍 지역: ${isMetro ? '수도권 규제지역' : '비규제지역'}\n` +
               `🏢 주택유형별 LTV:\n` +
               `• 아파트: ${apt}%\n` +
               `• 아파트 외 주택: ${nonApt}% (아파트 대비 ${apt - nonApt}%p 차감)\n\n` +
               `💡 참고: 생애최초는 별도 우대 기준이 적용됩니다.` + getCurrentPolicyDisclaimer(),
      cards: [{
        title: `보금자리론 LTV (${isMetro ? '수도권' : '비수도권'})`,
        subtitle: `일반 대상 기준`,
        monthly: `아파트 ${apt}%`,
        totalInterest: `아파트 외 ${nonApt}%`,
        notes: [
          `${isMetro ? '규제지역' : '비규제지역'} 기준`,
          `아파트 외 주택은 ${apt - nonApt}%p 차감`,
          `절대상한: ${formatKRW(policy.maxAmount.bogeumjari)}원`
        ]
      }],
      checklist: [
        '정확한 금액 산출을 위해 매매가 확인',
        '주택유형(아파트/아파트 외) 확인',
        '생애최초 해당 여부 확인'
      ]
    };
  }

  return null; // 매칭되지 않는 경우
}

// 대출 상담 및 감정평가 관련 응답 생성 (상담원 스타일)
export function generateLoanConsultationResponse(text: string, profile: Fields) {
  const t = text.toLowerCase();
  
  // 감정적 표현 감지
  const emotionalPatterns = [
    /망했|실망|어떻게|도와|조언|상담|고민|걱정|불안|스트레스/,
    /ㅠㅠ|ㅜㅜ|ㅡㅡ|헐|와|대박|최악|최고|좋아|나빠/,
    /어떡해|어쩌지|어떻게|도와줘|조언해|상담해/
  ];
  const hasEmotionalContent = emotionalPatterns.some(pattern => pattern.test(t));
  
  // 대출/감정평가 관련 맥락 확인
  const loanAppraisalPatterns = [
    /대출신청|감정평가|감정가|평가액|평가가|신청했|신청했는데/,
    /보금자리론|디딤돌|주택담보|담보대출|정책자금/,
    /승인|거절|반려|한도|한도초과|한도부족/
  ];
  const hasLoanAppraisalContext = loanAppraisalPatterns.some(pattern => pattern.test(t));

  // 정책/조건 문의(LTV/DSR 등)로 보이는 경우는 상담 모드 제외
  if (hasLoanAppraisalContext && /ltv|dsr|자격|조건|요건|정책|한도\s*안내/.test(t) && !(/감정|평가|신청|승인|거절|반려/.test(t))) {
    return null;
  }
  
  if (!hasLoanAppraisalContext && !hasEmotionalContent) {
    return null;
  }
  
  // 감정평가액과 신청액 추출
  const appraisalMatch = text.match(/(?:감정평가액|감정가|평가액|평가가)\s*([0-9억천만,\s]+)원?/i);
  const applicationMatch = text.match(/(?:신청|신청했|신청했는데)\s*([0-9억천만,\s]+)원?/i);
  
  let appraisalAmount = 0;
  let applicationAmount = 0;
  
  if (appraisalMatch?.[1]) {
    appraisalAmount = parseWon(appraisalMatch[1] + "원") || 0;
  }
  if (applicationMatch?.[1]) {
    applicationAmount = parseWon(applicationMatch[1] + "원") || 0;
  }
  
  // 숫자만 있는 경우 추출
  const numbers = text.match(/([0-9억천만,\s]+)원?/g);
  if (numbers && numbers.length >= 2) {
    if (!appraisalAmount) appraisalAmount = parseWon(numbers[0]) || 0;
    if (!applicationAmount) applicationAmount = parseWon(numbers[1]) || 0;
  }
  
  // 공감과 조언 생성
  let content = "";
  let cards = [];
  let checklist = [];
  
  if (hasEmotionalContent) {
    content += `아, 정말 속상하시겠어요 😔 감정평가액이 예상보다 낮게 나오면 정말 당황스럽죠.\n\n`;
  }
  
  let differencePercentCalc: number | null = null;
  if (appraisalAmount > 0 && applicationAmount > 0) {
    const difference = applicationAmount - appraisalAmount;
    differencePercentCalc = Math.round((difference / applicationAmount) * 100);
    
    content += `📊 **상황 분석**:\n`;
    content += `• 신청액: ${formatKRW(applicationAmount)}원\n`;
    content += `• 감정평가액: ${formatKRW(appraisalAmount)}원\n`;
    content += `• 차이: ${formatKRW(difference)}원 (${differencePercent}%)\n\n`;
    
    if (difference > 0) {
      content += `💡 **해결 방안**:\n`;
      
      if (differencePercentCalc <= 10) {
        content += `• 차이가 ${differencePercentCalc}%로 크지 않아요. 조정 가능할 가능성이 높습니다.\n`;
        content += `• 추가 서류나 보완 자료로 개선 가능할 수 있어요.\n`;
      } else if (differencePercentCalc <= 20) {
        content += `• ${differencePercentCalc}% 차이는 보통 범위입니다. 다른 은행도 시도해보세요.\n`;
        content += `• 신용등급이나 소득 증빙을 보완하면 개선될 수 있어요.\n`;
      } else {
        content += `• ${differencePercentCalc}% 차이는 다소 큰 편이에요. 대안을 찾아봐야 할 것 같습니다.\n`;
        content += `• 다른 정책자금이나 일반 주택담보대출을 고려해보세요.\n`;
      }
      
      content += `• 여러 은행의 감정평가 결과를 비교해보세요.\n`;
      content += `• 부동산 중개업소나 전문가와 상담해보세요.\n\n`;
      
      cards.push({
        title: "감정평가 차이 분석",
        subtitle: `${differencePercentCalc}% 차이`,
        monthly: `${formatKRW(difference)}원`,
        totalInterest: `${differencePercentCalc <= 10 ? "조정 가능" : differencePercentCalc <= 20 ? "다른 은행 시도" : "대안 검토 필요"}`,
        notes: [
          `신청액: ${formatKRW(applicationAmount)}원`,
          `감정평가액: ${formatKRW(appraisalAmount)}원`,
          `차이: ${formatKRW(difference)}원`,
          `${differencePercentCalc <= 10 ? "조정 가능성 높음" : differencePercentCalc <= 20 ? "다른 은행 시도 권장" : "대안 검토 필요"}`
        ]
      });
      
      checklist = [
        "다른 은행 감정평가 비교",
        "추가 서류 준비",
        "신용등급 확인",
        "소득 증빙 보완",
        "대안 대출 상품 검토"
      ];
    }
  }
  
  // 맥락 기반 마무리 제안 (고정 문구 제거)
  if (appraisalAmount > 0 && applicationAmount > 0 && differencePercentCalc !== null) {
    // 차이 규모에 따른 구체적 다음 행동 제안
    if (differencePercentCalc <= 10) {
      content += `\n다음 단계로, 같은 은행에서 재심사 요청(보완서류 첨부)과 타 은행 간단 재평가 중 무엇을 먼저 진행할지 정해보면 좋아요. 제가 필요한 보완서류 목록을 바로 정리해 드릴까요?`;
    } else if (differencePercentCalc <= 20) {
      content += `\n바로 실행할 수 있는 선택지는 ① 타 은행 재평가 접수, ② 보완서류 준비 후 동일 은행 재심사예요. 어떤 경로로 먼저 도와드릴까요?`;
    } else {
      content += `\n현 조건으로는 승인 가능성이 낮아 보입니다. ① 대출 조합/기간·상환방식 재설계, ② 다른 정책자금/은행 비교 중 하나를 먼저 택해 진행해 보시겠어요? 원하시면 두 경로 모두에 맞춰 시뮬레이션을 만들어 드릴게요.`;
    }
  } else {
    // 수치가 부족한 경우 추가 정보 요청을 자연스럽게 유도
    content += `\n상황을 더 정확히 보기 위해 '신청액', '감정가', '은행', '필요 기한'을 알려주시면 바로 대응 전략을 짜 드릴게요.`;
  }
  
  return {
    content,
    cards,
    checklist,
    fields: profile
  };
}
