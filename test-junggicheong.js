/**
 * 중기청 대출 맥락별 전문 상담 테스트
 * 기존 이용자 vs 신규 신청자 구분 처리 검증
 */

const testCases = [
  {
    category: "HUG 대위변제 상황",
    question: "중기청 대출금을 집주인이 낼 상황이 아니라 허그에서 받아서 반환해야할것같은 상황입니다. 이럴때 은행에서 선 연장하고 허그에서 나온금액을 반환하면 될까요?",
    expectedType: "hug_daewibyeonje",
    expectedElements: ["HUG", "대위변제", "은행 연장", "30일 전", "절차"],
    description: "실제 사용자 질문 - HUG 대위변제 + 연장 절차"
  },
  {
    category: "기존 이용자 연장",
    question: "중기청 대출을 받고 있는데 곧 만료돼요. 연장할 수 있나요?",
    expectedType: "existing_user_extension",
    expectedElements: ["연장 가능", "기존 대출자", "1-2개월 전", "은행 상담"],
    description: "기존 이용자 연장 문의"
  },
  {
    category: "기존 이용자 일반",
    question: "중기청 대출 이용 중인데 금리가 오를까요?",
    expectedType: "existing_user_general",
    expectedElements: ["기존 이용자", "연장", "기존 조건 유지"],
    description: "기존 이용자 일반 문의"
  },
  {
    category: "신규 신청",
    question: "중기청 대출 신청하고 싶어요",
    expectedType: "new_application",
    expectedElements: ["신규 신청 종료", "2024년 말", "버팀목", "대안"],
    description: "신규 신청 문의"
  },
  {
    category: "신규 신청 - 일반",
    question: "중기청 전세자금대출 어떻게 받나요?",
    expectedType: "new_application",
    expectedElements: ["종료", "버팀목", "대안 프로그램"],
    description: "신규 신청 일반 문의"
  }
];

// API 호출 함수
async function callAPI(question) {
  const API_BASE = process.env.API_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${API_BASE}/api/compute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

// 응답 분석 함수
function analyzeResponse(testCase, response) {
  const { expectedElements, expectedType } = testCase;
  const content = response.content || '';
  
  // 기본 체크
  const hasContent = content.length > 200;
  const hasCards = response.cards && response.cards.length > 0;
  const hasChecklist = response.checklist && response.checklist.length > 0;
  
  // 필수 요소 체크
  const foundElements = expectedElements.filter(element => 
    content.toLowerCase().includes(element.toLowerCase())
  );
  
  const missingElements = expectedElements.filter(element => 
    !content.toLowerCase().includes(element.toLowerCase())
  );
  
  // 맥락 판단 정확성
  let contextAccuracy = 0;
  if (expectedType === 'hug_daewibyeonje' && content.includes('HUG 대위변제')) {
    contextAccuracy = 100;
  } else if (expectedType === 'existing_user_extension' && content.includes('기존 대출자는 연장 가능')) {
    contextAccuracy = 100;
  } else if (expectedType === 'existing_user_general' && content.includes('현재 중기청 대출을 이용 중')) {
    contextAccuracy = 100;
  } else if (expectedType === 'new_application' && content.includes('신규 신청이 종료')) {
    contextAccuracy = 100;
  } else {
    contextAccuracy = 0;
  }
  
  // 전문성 점수
  const elementScore = (foundElements.length / expectedElements.length) * 100;
  const structureScore = (hasContent ? 40 : 0) + (hasCards ? 30 : 0) + (hasChecklist ? 30 : 0);
  const overallScore = (elementScore * 0.4) + (structureScore * 0.3) + (contextAccuracy * 0.3);
  
  return {
    score: Math.round(overallScore),
    contextAccuracy,
    elementScore: Math.round(elementScore),
    structureScore: Math.round(structureScore),
    foundElements,
    missingElements,
    hasContent,
    hasCards,
    hasChecklist,
    contentLength: content.length
  };
}

// 메인 테스트 실행
async function runJunggiCheongTest() {
  console.log("🏛️ 중기청 대출 맥락별 전문 상담 테스트\n");
  console.log("=" * 70);
  
  const results = [];
  let totalScore = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📝 Test ${i + 1}: ${testCase.category}`);
    console.log(`❓ 질문: "${testCase.question}"`);
    console.log(`🎯 기대 유형: ${testCase.expectedType}`);
    
    const response = await callAPI(testCase.question);
    
    if (response.error) {
      console.log(`❌ API 오류: ${response.error}`);
      results.push({ ...testCase, error: response.error, score: 0 });
      continue;
    }
    
    const analysis = analyzeResponse(testCase, response);
    
    console.log(`📊 점수: ${analysis.score}/100`);
    console.log(`   - 맥락 정확성: ${analysis.contextAccuracy}%`);
    console.log(`   - 핵심 요소: ${analysis.elementScore}% (${analysis.foundElements.length}/${testCase.expectedElements.length})`);
    console.log(`   - 구조/형식: ${analysis.structureScore}%`);
    console.log(`📄 응답 길이: ${analysis.contentLength}자`);
    
    if (analysis.foundElements.length > 0) {
      console.log(`✅ 발견 요소: [${analysis.foundElements.join(', ')}]`);
    }
    
    if (analysis.missingElements.length > 0) {
      console.log(`❌ 누락 요소: [${analysis.missingElements.join(', ')}]`);
    }
    
    // 맥락 판단 결과
    if (analysis.contextAccuracy === 100) {
      console.log(`🎯 맥락 판단: ✅ 정확함`);
    } else {
      console.log(`🎯 맥락 판단: ❌ 부정확 (일반 응답 제공)`);
    }
    
    console.log(`📖 응답 내용 (처음 150자):`);
    console.log(`   "${(response.content || '').substring(0, 150)}..."`);
    
    results.push({
      ...testCase,
      score: analysis.score,
      contextAccuracy: analysis.contextAccuracy,
      analysis,
      response
    });
    
    totalScore += analysis.score;
  }
  
  // 전체 결과 요약
  console.log("\n" + "=" * 70);
  console.log("📊 중기청 대출 맥락별 상담 테스트 결과");
  console.log("=" * 70);
  
  const avgScore = Math.round(totalScore / testCases.length);
  const contextAccuracyResults = results.filter(r => !r.error).map(r => r.contextAccuracy);
  const avgContextAccuracy = Math.round(contextAccuracyResults.reduce((a, b) => a + b, 0) / contextAccuracyResults.length);
  
  console.log(`🎯 전체 평균 점수: ${avgScore}/100`);
  console.log(`🎯 맥락 판단 정확성: ${avgContextAccuracy}%`);
  
  // 맥락별 성과 분석
  const categoryResults = {};
  results.filter(r => !r.error).forEach(result => {
    if (!categoryResults[result.category]) {
      categoryResults[result.category] = [];
    }
    categoryResults[result.category].push(result.score);
  });
  
  console.log(`\n📈 카테고리별 성과:`);
  Object.entries(categoryResults).forEach(([category, scores]) => {
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    console.log(`   ${category}: ${avgScore}/100`);
  });
  
  // 문제점 분석
  const problemCases = results.filter(r => !r.error && (r.score < 80 || r.contextAccuracy < 100));
  if (problemCases.length > 0) {
    console.log(`\n⚠️ 개선 필요한 케이스 (${problemCases.length}개):`);
    problemCases.forEach((case_, idx) => {
      console.log(`${idx + 1}. ${case_.category}: ${case_.score}점 (맥락: ${case_.contextAccuracy}%)`);
      console.log(`   문제: ${case_.contextAccuracy < 100 ? '맥락 판단 실패' : '전문성 부족'}`);
    });
  }
  
  return { results, avgScore, avgContextAccuracy };
}

// 특정 질문 심층 분석
async function analyzeSpecificQuestion() {
  console.log("🔍 원래 문제 질문 심층 분석\n");
  
  const originalQuestion = "중기청 대출금을 집주인이 낼 상황이 아니라 허그에서 받아서 반환해야할것같은 상황입니다. 이럴때 은행에서 선 연장하고 허그에서 나온금액을 반환하면 될까요?";
  
  console.log(`❓ 원래 질문: "${originalQuestion}"`);
  
  const response = await callAPI(originalQuestion);
  
  if (response.content) {
    const isGenericTermination = response.content.includes("2024년 말 종료");
    const isContextualResponse = response.content.includes("HUG 대위변제");
    const hasSpecificGuidance = response.content.includes("연장") && response.content.includes("절차");
    
    console.log(`   획일적 종료 안내: ${isGenericTermination ? '❌ Yes' : '✅ No'}`);
    console.log(`   맥락적 HUG 상담: ${isContextualResponse ? '✅ Yes' : '❌ No'}`);
    console.log(`   구체적 절차 안내: ${hasSpecificGuidance ? '✅ Yes' : '❌ No'}`);
    console.log(`   응답 길이: ${response.content.length}자`);
    
    if (isContextualResponse && hasSpecificGuidance) {
      console.log(`\n🎉 결과: 문제가 해결되었습니다! 맥락에 맞는 전문 상담 제공`);
    } else {
      console.log(`\n⚠️ 결과: 여전히 개선이 필요합니다.`);
    }
  }
}

// 메인 실행
if (require.main === module) {
  (async () => {
    console.log("🏛️ 중기청 대출 전문 상담 시스템 검증");
    console.log("📅 테스트 일시:", new Date().toLocaleString('ko-KR'));
    
    // 특정 문제 분석
    await analyzeSpecificQuestion();
    
    console.log("\n" + "=" * 50);
    
    // 전체 테스트
    const results = await runJunggiCheongTest();
    
    console.log(`\n📌 참고: 기존 이용자와 신규 신청자를 정확히 구분하여 맞춤 상담 제공`);
    console.log(`🎯 목표: 획일적 안내에서 → 맥락별 전문가 상담으로 전환`);
  })();
}

module.exports = { runJunggiCheongTest, analyzeSpecificQuestion, callAPI };
