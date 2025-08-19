/**
 * 폴백 응답 개선 테스트
 * 
 * 1. 일반 폴백 "요청을 이해했어요" 응답 감소 확인
 * 2. 월소득 정보 제공 시 분석 연계 확인
 */

const problematicQuestions = [
  // 기존에 폴백으로 빠지던 질문들
  "디딤돌 대출 한도 얼마까지 받을 수 있어요?",
  "대출 처음 받아보는데 어떻게 진행해야 해요?",
  "주택 대출 받고 싶은데 어디서 시작해야 하나요?",
  "집 구입 대출 궁금해요",
  "전세자금 대출 받을 수 있나요?",
  
  // 월소득 관련 문제 시나리오
  "월소득 500만원",
  "월소득 500만원인데 대출 가능한가요?",
  "월소득 500만원, 5억원 집 구입 가능한지 궁금해요",
  "소득 500만원으로 얼마까지 대출 받을 수 있어요?"
];

async function testFallbackFix() {
  console.log("🔧 폴백 응답 개선 테스트 시작\n");
  
  const API_URL = "https://real-e-rosy.vercel.app";
  
  let totalTests = 0;
  let fallbackCount = 0;
  let incomeOnlyCount = 0;
  let contextualCount = 0;
  
  for (const question of problematicQuestions) {
    totalTests++;
    console.log(`${totalTests}. "${question}"`);
    
    try {
      const response = await fetch(`${API_URL}/api/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          conversationId: null,
          fields: {}
        })
      });
      
      const data = await response.json();
      const content = data.content || "";
      
      // 응답 유형 분류
      let responseType = "";
      let status = "";
      
      if (content.includes("요청을 이해했어요")) {
        responseType = "일반 폴백";
        status = "❌";
        fallbackCount++;
      } else if (/^월소득: \d+/.test(content) && content.length < 50) {
        responseType = "숫자만 반복";
        status = "❌";
        incomeOnlyCount++;
      } else if (content.includes("전문 상담") || content.includes("첫 신청자") || content.includes("자격 조건") || content.includes("한도")) {
        responseType = "맥락 기반 상담";
        status = "✅";
        contextualCount++;
      } else if (content.includes("추가로 필요한 정보") || content.includes("시나리오 분석")) {
        responseType = "지능적 안내";
        status = "✅";
        contextualCount++;
      } else {
        responseType = "기타";
        status = "⚠️";
      }
      
      console.log(`   ${status} ${responseType}`);
      console.log(`   📏 길이: ${content.length}자`);
      console.log(`   📄 미리보기: ${content.substring(0, 60)}...`);
      
    } catch (error) {
      console.log(`   ❌ 오류: ${error.message}`);
    }
    
    console.log("");
    
    // 1초 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 결과 요약
  console.log("=".repeat(60));
  console.log("📊 개선 결과 요약");
  console.log("=".repeat(60));
  console.log(`🧪 총 테스트: ${totalTests}개`);
  console.log(`❌ 일반 폴백: ${fallbackCount}개 (${((fallbackCount/totalTests)*100).toFixed(1)}%)`);
  console.log(`❌ 숫자만 반복: ${incomeOnlyCount}개 (${((incomeOnlyCount/totalTests)*100).toFixed(1)}%)`);
  console.log(`✅ 맥락 기반 응답: ${contextualCount}개 (${((contextualCount/totalTests)*100).toFixed(1)}%)`);
  
  const improvedCount = totalTests - fallbackCount - incomeOnlyCount;
  const improvementRate = (improvedCount / totalTests) * 100;
  
  console.log(`\n🎯 개선율: ${improvementRate.toFixed(1)}%`);
  
  if (improvementRate >= 80) {
    console.log("🎉 성공! 대부분의 질문이 맥락 기반 응답으로 개선되었습니다.");
  } else if (improvementRate >= 60) {
    console.log("👍 양호! 상당한 개선이 있었지만 추가 최적화가 필요합니다.");
  } else {
    console.log("⚠️ 주의! 여전히 많은 질문이 폴백으로 빠지고 있습니다.");
  }
  
  console.log("\n💡 주요 개선사항:");
  console.log("• isSpecificLoanPolicyRequest 함수 확장");
  console.log("• 월소득 정보 제공 시 지능적 분석 라우팅");
  console.log("• 부동산 용어 + 일반 패턴 매칭 추가");
  console.log("• 폴백 응답 최소화");
}

testFallbackFix().catch(console.error);
