// 맥락 파악 로직 테스트
function testContextualResponses() {
  // 매매 관련 키워드
  const purchaseKeywords = ["매매", "구입", "매수", "집 구입", "집 사기", "주택 구입", "아파트 구입", "매매고민", "구입고민", "구매"];
  const rentalKeywords = ["전세", "월세", "임대", "전세자금", "월세자금", "임대차", "보증금"];
  
  function analyzeContext(text) {
    const t = text.toLowerCase();
    const hasPurchaseIntent = purchaseKeywords.some(keyword => t.includes(keyword));
    const hasRentalIntent = rentalKeywords.some(keyword => t.includes(keyword));
    
    return {
      text,
      hasPurchaseIntent,
      hasRentalIntent,
      shouldProcessAsJeonse: hasRentalIntent && !hasPurchaseIntent,
      shouldProcessAsPurchase: hasPurchaseIntent && !hasRentalIntent
    };
  }
  
  // 테스트 케이스들
  const testCases = [
    "월급 340, 3억 매매고민중",
    "3억 전세",
    "월소득 500만원, 5억원 집 구입",
    "전세 2억",
    "매매가 4억원",
    "월세 50만원",
    "집 사기 고민중",
    "전세자금 대출"
  ];
  
  console.log("=== 맥락 파악 로직 테스트 ===\n");
  
  testCases.forEach(testCase => {
    const result = analyzeContext(testCase);
    console.log(`입력: "${testCase}"`);
    console.log(`  - 매매 의도: ${result.hasPurchaseIntent}`);
    console.log(`  - 전세/월세 의도: ${result.hasRentalIntent}`);
    console.log(`  - 전세→월세 처리: ${result.shouldProcessAsJeonse}`);
    console.log(`  - 매매 대출 처리: ${result.shouldProcessAsPurchase}`);
    console.log("");
  });
}

testContextualResponses();
