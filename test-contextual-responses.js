/**
 * 맥락 기반 동적 응답 테스트
 * 
 * 기존 고정 템플릿 응답이 맥락에 따라 다르게 제공되는지 확인
 */

const testCases = [
  // 보금자리론 - 다양한 맥락
  {
    category: "보금자리론 - 처음 신청자 (기간 질문)",
    question: "보금자리론 처음 신청하는데 얼마나 걸려요?",
    expectedContext: {
      questionType: "timeline",
      experienceLevel: "first_time",
      urgency: "research"
    },
    expectedElements: ["첫 신청자", "처음", "2-3주", "서류 완비"]
  },
  {
    category: "보금자리론 - 긴급 상황 (기간 질문)",
    question: "보금자리론 급해요 빨리 신청 가능한가요?",
    expectedContext: {
      questionType: "timeline", 
      urgency: "immediate"
    },
    expectedElements: ["긴급", "빠른", "최단", "2주"]
  },
  {
    category: "보금자리론 - 경험 있는 사용자 (절차 질문)",
    question: "보금자리론 이미 받아본 적 있는데 절차가 어떻게 되나요?",
    expectedContext: {
      questionType: "application_process",
      experienceLevel: "experienced"
    },
    expectedElements: ["추가 상담", "기존", "경험", "핵심"]
  },
  
  // 디딤돌 대출 - 다양한 맥락
  {
    category: "디딤돌 - 처음 신청자 (자격 질문)",
    question: "디딤돌 대출 처음인데 자격 조건이 뭐예요?",
    expectedContext: {
      questionType: "requirements",
      experienceLevel: "first_time"
    },
    expectedElements: ["첫 신청자", "핵심 3요소", "무주택", "7천만원"]
  },
  {
    category: "디딤돌 - 한도 계산 질문",
    question: "디딤돌 대출 한도 얼마까지 받을 수 있어요?",
    expectedContext: {
      questionType: "calculation"
    },
    expectedElements: ["한도 계산", "최대", "6억원", "LTV"]
  },
  {
    category: "디딤돌 - 긴급 처리 필요",
    question: "디딤돌 대출 급히 필요한데 빨리 처리 가능할까요?",
    expectedContext: {
      questionType: "timeline",
      urgency: "immediate"
    },
    expectedElements: ["긴급", "빠른", "모든 서류", "사전심사"]
  },
  
  // 일반 대출 - 다양한 맥락
  {
    category: "일반 대출 - 처음 신청자",
    question: "대출 처음 받아보는데 어떻게 진행해야 해요?",
    expectedContext: {
      questionType: "application_process",
      experienceLevel: "first_time"
    },
    expectedElements: ["첫 신청자", "단계별", "상품 선택", "자격 확인"]
  },
  {
    category: "일반 대출 - 기간 궁금",
    question: "주택 대출 신청하면 보통 얼마나 걸려요?",
    expectedContext: {
      questionType: "timeline"
    },
    expectedElements: ["처리 기간", "2-4주", "서류 완비"]
  }
];

async function testContextualResponses() {
  console.log("=".repeat(80));
  console.log("🧪 맥락 기반 동적 응답 테스트 시작");
  console.log("=".repeat(80));
  
  const API_URL = process.env.API_URL || "https://real-e-rosy.vercel.app";
  
  let totalTests = 0;
  let passedTests = 0;
  let contextAccuracy = 0;
  let dynamicResponseCount = 0;
  
  for (const testCase of testCases) {
    totalTests++;
    console.log(`\n📝 테스트 ${totalTests}: ${testCase.category}`);
    console.log(`❓ 질문: "${testCase.question}"`);
    
    try {
      const response = await fetch(`${API_URL}/api/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testCase.question,
          conversationId: null,
          fields: {}
        })
      });
      
      if (!response.ok) {
        console.log(`❌ API 호출 실패: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const content = data.content || "";
      
      console.log(`📄 응답 길이: ${content.length}자`);
      
      // 예상 요소들이 포함되어 있는지 확인
      const foundElements = testCase.expectedElements.filter(element => 
        content.toLowerCase().includes(element.toLowerCase())
      );
      
      const elementScore = (foundElements.length / testCase.expectedElements.length) * 100;
      console.log(`🎯 예상 요소 포함률: ${foundElements.length}/${testCase.expectedElements.length} (${elementScore.toFixed(1)}%)`);
      console.log(`   찾은 요소: ${foundElements.join(", ")}`);
      
      // 맥락 적절성 평가
      let contextualityScore = 0;
      let contextualFeatures = [];
      
      // 경험 수준 맞춤 응답 확인
      if (testCase.expectedContext.experienceLevel === "first_time") {
        if (/첫|처음|초보|시작/.test(content)) {
          contextualityScore += 25;
          contextualFeatures.push("처음 신청자 맞춤");
        }
      } else if (testCase.expectedContext.experienceLevel === "experienced") {
        if (/기존|경험|추가|재신청/.test(content)) {
          contextualityScore += 25;
          contextualFeatures.push("경험자 맞춤");
        }
      }
      
      // 긴급성 맞춤 응답 확인
      if (testCase.expectedContext.urgency === "immediate") {
        if (/긴급|빠른|급|즉시|최단/.test(content)) {
          contextualityScore += 25;
          contextualFeatures.push("긴급 상황 맞춤");
        }
      }
      
      // 질문 유형 맞춤 응답 확인
      if (testCase.expectedContext.questionType === "timeline") {
        if (/기간|시간|소요|처리|단계/.test(content)) {
          contextualityScore += 25;
          contextualFeatures.push("시간 중심 응답");
        }
      } else if (testCase.expectedContext.questionType === "requirements") {
        if (/자격|조건|요건|필요/.test(content)) {
          contextualityScore += 25;
          contextualFeatures.push("자격 중심 응답");
        }
      } else if (testCase.expectedContext.questionType === "calculation") {
        if (/한도|금액|계산|최대/.test(content)) {
          contextualityScore += 25;
          contextualFeatures.push("계산 중심 응답");
        }
      }
      
      // 동적 응답 여부 확인 (고정 템플릿이 아닌지)
      const isNotFixedTemplate = !/상시 신청 가능.*연중 수시접수/.test(content) &&
                                !/처리 단계별 소요기간.*서류 접수.*심사.*5-7일/.test(content);
      
      if (isNotFixedTemplate) {
        contextualityScore += 25;
        contextualFeatures.push("고정 템플릿 벗어남");
        dynamicResponseCount++;
      }
      
      console.log(`🎯 맥락 적절성: ${contextualityScore}% (${contextualFeatures.join(", ")})`);
      
      // 종합 점수 계산
      const totalScore = (elementScore + contextualityScore) / 2;
      console.log(`📊 종합 점수: ${totalScore.toFixed(1)}/100`);
      
      if (totalScore >= 70) {
        passedTests++;
        console.log("✅ 통과");
      } else {
        console.log("❌ 실패");
      }
      
      contextAccuracy += contextualityScore;
      
      // 응답 일부 미리보기
      const preview = content.substring(0, 150) + (content.length > 150 ? "..." : "");
      console.log(`📄 응답 미리보기: ${preview}`);
      
    } catch (error) {
      console.log(`❌ 오류 발생: ${error.message}`);
    }
    
    // 요청 간 간격
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 결과 요약
  console.log("\n" + "=".repeat(80));
  console.log("📊 테스트 결과 요약");
  console.log("=".repeat(80));
  console.log(`✅ 통과한 테스트: ${passedTests}/${totalTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`🎯 평균 맥락 적절성: ${(contextAccuracy/totalTests).toFixed(1)}%`);
  console.log(`🔄 동적 응답 비율: ${dynamicResponseCount}/${totalTests} (${((dynamicResponseCount/totalTests)*100).toFixed(1)}%)`);
  
  console.log("\n🎯 개선 효과:");
  console.log(`• 고정 템플릿에서 맥락 기반 동적 응답으로 전환`);
  console.log(`• 사용자 경험 수준에 맞는 맞춤형 정보 제공`);
  console.log(`• 긴급성에 따른 우선순위 정보 조정`);
  console.log(`• 질문 유형별 핵심 정보 집중 제공`);
  
  if (dynamicResponseCount / totalTests >= 0.8) {
    console.log("\n🎉 성공: 대부분의 응답이 맥락 기반으로 동적 생성되고 있습니다!");
  } else {
    console.log("\n⚠️ 주의: 일부 응답이 여전히 고정 템플릿을 사용하고 있을 수 있습니다.");
  }
}

// 테스트 실행
testContextualResponses().catch(console.error);
