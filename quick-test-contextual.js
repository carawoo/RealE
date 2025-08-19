/**
 * 간단한 맥락 기반 응답 테스트
 */

const testQuestions = [
  "보금자리론 처음 신청하는데 얼마나 걸려요?",
  "디딤돌 대출 처음인데 자격 조건이 뭐예요?", 
  "디딤돌 대출 한도 얼마까지 받을 수 있어요?",
  "대출 처음 받아보는데 어떻게 진행해야 해요?"
];

async function quickTest() {
  console.log("🚀 빠른 맥락 기반 응답 테스트\n");
  
  const API_URL = "https://real-e-rosy.vercel.app";
  
  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    console.log(`${i+1}. "${question}"`);
    
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
      
      // 응답 타입 확인
      let responseType = "";
      if (content.includes("첫 신청자")) responseType += "처음신청자맞춤 ";
      if (content.includes("전문 상담")) responseType += "전문상담 ";
      if (content.includes("긴급")) responseType += "긴급대응 ";
      if (content.includes("자격 조건")) responseType += "자격요건 ";
      if (content.includes("한도")) responseType += "한도계산 ";
      if (content.includes("상환방식")) responseType += "상환방식 ";
      if (content.includes("요청을 이해했어요")) responseType += "일반폴백 ";
      
      console.log(`   ✓ 응답: ${responseType || "기타"}`);
      console.log(`   📏 길이: ${content.length}자`);
      console.log(`   📄 미리보기: ${content.substring(0, 50)}...`);
      
      // 맥락성 체크
      const isContextual = !content.includes("상시 신청 가능") && 
                          !content.includes("요청을 이해했어요") &&
                          (content.includes("첫 신청자") || content.includes("전문 상담") || content.includes("자격 조건"));
      
      console.log(`   🎯 맥락기반: ${isContextual ? "✅" : "❌"}\n`);
      
    } catch (error) {
      console.log(`   ❌ 오류: ${error.message}\n`);
    }
    
    // 1초 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

quickTest().catch(console.error);
