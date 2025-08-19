/**
 * 전문가 수준 응답 품질 테스트
 * 은행상담원, 부동산 중개사, 법무사, 주택담보대출 직원 수준의 답변 검증
 */

const testCases = [
  // 1. 구체적인 계산/추정 요청
  {
    category: "구체적 계산",
    question: "LTV/DSR 한도 추정",
    expectedResponseType: "specific_calculation",
    expectedElements: ["LTV", "DSR", "계산", "추정", "소득", "매매가"],
    currentProblem: "일반 안내만 제공, 구체적 계산 없음",
    expertLevel: "주택담보대출 직원이 하는 정확한 한도 계산 제공"
  },
  {
    category: "구체적 계산", 
    question: "월소득 500만원, 5억원 집 구입, 자기자본 1억원",
    expectedResponseType: "loan_scenario_analysis",
    expectedElements: ["3가지 시나리오", "최대한도", "안전상환", "정책활용", "월상환액"],
    currentProblem: "숫자만 표시하고 분석 안 됨",
    expertLevel: "즉시 대출 시나리오 분석 제공"
  },
  {
    category: "구체적 계산",
    question: "서울에서 6억 아파트 생애최초 최대 얼마까지 대출 가능해?",
    expectedResponseType: "specific_calculation",
    expectedElements: ["4.2억", "70%", "DSR", "소득기준", "월상환액"],
    currentProblem: "미확인",
    expertLevel: "정확한 한도와 조건 즉시 계산"
  },

  // 2. 정책 상담
  {
    category: "정책 상담",
    question: "보금자리론 생애최초 대출 받으려고하는데 수도권에서 아파트 외 주택 LTV 얼마야?",
    expectedResponseType: "policy_consultation", 
    expectedElements: ["65%", "70%", "5%p 차감", "생애최초", "수도권"],
    currentProblem: "정확한 답변 제공됨",
    expertLevel: "정확한 정책 설명"
  },
  {
    category: "정책 상담",
    question: "디딤돌 대출 체증식 상환방식 어떤 거야?",
    expectedResponseType: "policy_consultation",
    expectedElements: ["체증식", "이자만", "원리금", "0.3%p", "초기부담"],
    currentProblem: "미확인",
    expertLevel: "상환방식별 특징과 금리 차이 설명"
  },

  // 3. 절차/방법 문의
  {
    category: "절차 문의",
    question: "보금자리론 신청 절차 어떻게 돼?",
    expectedResponseType: "process_guide",
    expectedElements: ["단계별", "서류", "기간", "2-3주", "기금e든든"],
    currentProblem: "미확인", 
    expertLevel: "단계별 상세 절차와 준비사항 안내"
  },

  // 4. 비교/선택 문의
  {
    category: "비교 분석",
    question: "전세 2억5천 vs 보증금 3억·월세 90만 비교",
    expectedResponseType: "comparison_analysis",
    expectedElements: ["총비용", "현금흐름", "기회비용", "전환율", "추천"],
    currentProblem: "미확인",
    expertLevel: "수치적 비교와 상황별 추천"
  },

  // 5. 애매한/일반적 질문
  {
    category: "일반 질문",
    question: "대출 받고 싶은데 어떻게 해야 해?",
    expectedResponseType: "guided_consultation", 
    expectedElements: ["목적", "조건", "상품", "단계적", "맞춤"],
    currentProblem: "일반 안내만 제공",
    expertLevel: "목적별 맞춤 상담으로 유도"
  },

  // 6. 도메인 외 질문
  {
    category: "도메인 외",
    question: "오늘 날씨 어때?",
    expectedResponseType: "domain_redirect",
    expectedElements: ["부동산", "주택금융", "상담", "전용"],
    currentProblem: "적절한 거부 응답",
    expertLevel: "정중한 거부 후 전문 분야 안내"
  }
];

// API 호출 함수
async function callAPI(question, conversationId = null, fields = null) {
  const API_BASE = process.env.API_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${API_BASE}/api/compute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: question,
        conversationId,
        fields
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

// 응답 품질 분석
function analyzeResponseQuality(testCase, response) {
  const { question, expectedElements, expectedResponseType, expertLevel, currentProblem } = testCase;
  const content = response.content || '';
  
  // 기본 체크
  const hasContent = content.length > 100;
  const hasCards = response.cards && response.cards.length > 0;
  const hasChecklist = response.checklist && response.checklist.length > 0;
  
  // 필수 요소 체크
  const foundElements = expectedElements.filter(element => 
    content.toLowerCase().includes(element.toLowerCase())
  );
  
  const missingElements = expectedElements.filter(element => 
    !content.toLowerCase().includes(element.toLowerCase())
  );
  
  // 점수 계산
  const elementScore = (foundElements.length / expectedElements.length) * 100;
  const structureScore = (hasContent ? 40 : 0) + (hasCards ? 30 : 0) + (hasChecklist ? 30 : 0);
  const overallScore = (elementScore * 0.6) + (structureScore * 0.4);
  
  return {
    score: Math.round(overallScore),
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

// 전문가 수준 평가
function evaluateExpertLevel(testCase, response, analysis) {
  const { category, expertLevel } = testCase;
  const { score, foundElements, missingElements } = analysis;
  
  let expertGrade = 'F';
  let feedback = [];
  
  if (score >= 90) {
    expertGrade = 'A+';
    feedback.push('✅ 전문가 수준의 완벽한 답변');
  } else if (score >= 80) {
    expertGrade = 'A';
    feedback.push('✅ 우수한 전문 상담 수준');
  } else if (score >= 70) {
    expertGrade = 'B';
    feedback.push('⚠️ 기본적인 상담 수준, 개선 필요');
  } else if (score >= 60) {
    expertGrade = 'C';
    feedback.push('❌ 부족한 전문성, 상당한 개선 필요');
  } else {
    expertGrade = 'F';
    feedback.push('❌ 전문가 수준과 거리가 멀음');
  }
  
  // 구체적 개선사항
  if (missingElements.length > 0) {
    feedback.push(`🔧 누락된 핵심 요소: [${missingElements.join(', ')}]`);
  }
  
  if (!analysis.hasCards && category !== '도메인 외') {
    feedback.push('📋 구조화된 정보 카드 필요');
  }
  
  if (!analysis.hasChecklist && category !== '도메인 외') {
    feedback.push('✅ 체크리스트/액션 아이템 필요');
  }
  
  return { expertGrade, feedback };
}

// 메인 테스트 실행
async function runExpertResponseTest() {
  console.log("🏆 전문가 수준 응답 품질 테스트 시작\n");
  console.log("=" * 80);
  
  const results = [];
  let totalScore = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📝 Test ${i + 1}: ${testCase.category}`);
    console.log(`❓ 질문: "${testCase.question}"`);
    console.log(`🎯 기대 수준: ${testCase.expertLevel}`);
    
    const response = await callAPI(testCase.question);
    
    if (response.error) {
      console.log(`❌ API 오류: ${response.error}`);
      results.push({ ...testCase, error: response.error, score: 0 });
      continue;
    }
    
    const analysis = analyzeResponseQuality(testCase, response);
    const evaluation = evaluateExpertLevel(testCase, response, analysis);
    
    console.log(`📊 점수: ${analysis.score}/100 (등급: ${evaluation.expertGrade})`);
    console.log(`   - 핵심 요소: ${analysis.elementScore}% (${analysis.foundElements.length}/${testCase.expectedElements.length})`);
    console.log(`   - 구조/형식: ${analysis.structureScore}%`);
    console.log(`📄 응답 길이: ${analysis.contentLength}자`);
    
    evaluation.feedback.forEach(fb => console.log(`   ${fb}`));
    
    if (analysis.missingElements.length > 0) {
      console.log(`❌ 누락 요소: [${analysis.missingElements.join(', ')}]`);
    }
    
    console.log(`📖 응답 내용 (처음 150자):`);
    console.log(`   "${(response.content || '').substring(0, 150)}..."`);
    
    results.push({
      ...testCase,
      score: analysis.score,
      grade: evaluation.expertGrade,
      analysis,
      evaluation,
      response
    });
    
    totalScore += analysis.score;
  }
  
  // 전체 결과 요약
  console.log("\n" + "=" * 80);
  console.log("📊 전문가 수준 응답 품질 종합 분석");
  console.log("=" * 80);
  
  const avgScore = Math.round(totalScore / testCases.length);
  const gradeDistribution = {};
  
  results.forEach(result => {
    if (!result.error) {
      gradeDistribution[result.grade] = (gradeDistribution[result.grade] || 0) + 1;
    }
  });
  
  console.log(`🎯 전체 평균 점수: ${avgScore}/100`);
  console.log(`📈 등급 분포:`, gradeDistribution);
  
  // 문제 있는 케이스 분석
  const problemCases = results.filter(r => !r.error && r.score < 70);
  if (problemCases.length > 0) {
    console.log(`\n⚠️ 개선 필요한 케이스 (${problemCases.length}개):`);
    problemCases.forEach((case_, idx) => {
      console.log(`${idx + 1}. ${case_.category}: "${case_.question}" (${case_.score}점)`);
      console.log(`   문제: ${case_.currentProblem || '전문성 부족'}`);
      console.log(`   해결: ${case_.expertLevel}`);
    });
  }
  
  // 추천 개선사항
  console.log(`\n🔧 추천 개선사항:`);
  if (avgScore < 80) {
    console.log(`1. 질문 의도 파악 로직 강화 필요`);
    console.log(`2. 구체적 계산/분석 기능 추가`);
    console.log(`3. 전문 용어와 수치 정확성 향상`);
  }
  
  return { results, avgScore, gradeDistribution };
}

// 특정 문제 케이스 심층 분석
async function analyzeSpecificIssue() {
  console.log("🔍 'LTV/DSR 한도 추정' 문제 심층 분석\n");
  
  const testQuestions = [
    "LTV/DSR 한도 추정",
    "LTV DSR 한도 추정해줘",
    "내 LTV DSR 한도 얼마야?",
    "LTV DSR 계산해줘",
    "대출 한도 추정"
  ];
  
  for (const question of testQuestions) {
    console.log(`❓ "${question}"`);
    const response = await callAPI(question);
    
    if (response.content) {
      const isGenericResponse = response.content.includes("주택금융 대출 일반 안내");
      const hasCalculation = response.content.includes("계산") || response.content.includes("추정");
      const hasSpecificInfo = response.content.includes("LTV") && response.content.includes("DSR");
      
      console.log(`   일반 안내: ${isGenericResponse ? '❌ Yes' : '✅ No'}`);
      console.log(`   계산 포함: ${hasCalculation ? '✅ Yes' : '❌ No'}`);
      console.log(`   구체 정보: ${hasSpecificInfo ? '✅ Yes' : '❌ No'}`);
      console.log(`   응답 길이: ${response.content.length}자`);
    }
    console.log("");
  }
}

// 메인 실행
if (require.main === module) {
  (async () => {
    console.log("🏠 RealE 전문가 응답 품질 검증 시스템");
    console.log("📅 테스트 일시:", new Date().toLocaleString('ko-KR'));
    
    // 특정 문제 분석
    await analyzeSpecificIssue();
    
    console.log("\n" + "=" * 50);
    
    // 전체 테스트
    const results = await runExpertResponseTest();
    
    console.log(`\n📌 참고: 전문가 수준 = 은행상담원/부동산중개사/법무사/주택담보대출직원 수준`);
    console.log(`📞 목표: 실제 전문가와 동등한 수준의 정확하고 실용적인 답변 제공`);
  })();
}

module.exports = { runExpertResponseTest, analyzeSpecificIssue, callAPI };
