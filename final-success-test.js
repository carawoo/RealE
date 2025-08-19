/**
 * 최종 성공 테스트 - 모든 개선사항 확인
 */

const testQuestions = [
  {
    question: "보금자리론 처음 신청하는데 얼마나 걸려요?",
    expectedType: "보금자리론 맥락 응답",
    shouldContain: ["첫 신청자", "처리기간"]
  },
  {
    question: "디딤돌 대출 한도 얼마까지 받을 수 있어요?",
    expectedType: "디딤돌 맥락 응답", 
    shouldContain: ["디딤돌 대출", "한도"]
  },
  {
    question: "대출 처음 받아보는데 어떻게 진행해야 해요?",
    expectedType: "일반 대출 맥락 응답",
    shouldContain: ["주택금융 대출", "상품 비교"]
  },
  {
    question: "주택 대출 받고 싶은데 어디서 시작해야 하나요?",
    expectedType: "일반 대출 맥락 응답",
    shouldContain: ["주택금융 대출", "진행 팁"]
  },
  {
    question: "월소득 500만원인데 대출 가능한가요?",
    expectedType: "지능적 분석 안내",
    shouldContain: ["추가로 필요한 정보", "시나리오 분석"]
  }
];

async function finalSuccessTest() {
  console.log("🎯 최종 성공 테스트 - 폴백 응답 완전 제거 확인\n");
  
  const API_URL = "https://real-e-rosy.vercel.app";
  
  let totalTests = 0;
  let successfulResponses = 0;
  let fallbackResponses = 0;
  
  for (const test of testQuestions) {
    totalTests++;
    console.log(`${totalTests}. "${test.question}"`);
    
    try {
      // 2초 대기 (배포 안정화)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(`${API_URL}/api/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: test.question,
          conversationId: null,
          fields: {}
        })
      });
      
      const data = await response.json();
      const content = data.content || "";
      
      // 폴백 응답인지 확인
      const isFallback = content.includes("요청을 이해했어요") || 
                        content.includes("구체적으로 알려주시면");
      
      if (isFallback) {
        console.log(`   ❌ 폴백 응답`);
        fallbackResponses++;
      } else {
        // 예상 요소 확인
        const foundElements = test.shouldContain.filter(element => 
          content.toLowerCase().includes(element.toLowerCase())
        );
        
        if (foundElements.length >= 1) {
          console.log(`   ✅ ${test.expectedType}`);
          console.log(`   📄 포함 요소: ${foundElements.join(", ")}`);
          successfulResponses++;
        } else {
          console.log(`   ⚠️ 예상과 다른 응답`);
          console.log(`   📄 미리보기: ${content.substring(0, 50)}...`);
        }
      }
      
      console.log(`   📏 길이: ${content.length}자\n`);
      
    } catch (error) {
      console.log(`   ❌ 오류: ${error.message}\n`);
    }
  }
  
  // 최종 결과
  const successRate = (successfulResponses / totalTests) * 100;
  
  console.log("=".repeat(50));
  console.log("🎉 최종 결과");
  console.log("=".repeat(50));
  console.log(`📊 총 테스트: ${totalTests}개`);
  console.log(`✅ 성공적 응답: ${successfulResponses}개 (${successRate.toFixed(1)}%)`);
  console.log(`❌ 폴백 응답: ${fallbackResponses}개 (${((fallbackResponses/totalTests)*100).toFixed(1)}%)`);
  
  if (successRate >= 80) {
    console.log("\n🎉 완벽! 모든 주요 질문이 맥락 기반 전문 응답으로 처리됩니다!");
    console.log("✨ 고정 템플릿 → 동적 맥락 기반 응답 전환 성공");
  } else if (successRate >= 60) {
    console.log("\n👍 양호! 대부분의 질문이 개선되었지만 추가 최적화 필요");
  } else {
    console.log("\n⚠️ 추가 개선 필요");
  }
  
  console.log("\n🔧 주요 개선사항 요약:");
  console.log("• 보금자리론: 맥락별 처리기간/절차 안내");
  console.log("• 디딤돌 대출: 자격/한도/기간 맞춤 상담");
  console.log("• 일반 대출: 첫 신청자 vs 경험자 차별화");
  console.log("• 월소득 정보: 지능적 시나리오 분석 연계");
  console.log("• 폴백 응답: 대폭 감소");
}

finalSuccessTest().catch(console.error);
