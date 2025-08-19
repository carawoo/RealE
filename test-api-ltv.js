/**
 * Production API LTV 정책 동적 반영 테스트
 * 실제 배포된 API가 최신 LTV 정책을 올바르게 반영하는지 검증
 */

const testQuestions = [
  {
    question: "보금자리론 생애최초 대출 받으려고하는데 대출규제이후 80%에서 70%으로 줄엇다고하더라고요 수도권 입니다. 근데 일반 보금자리론은 아파트 외 다른 주택은 5% 씩 차감되는걸로아는제 생애최초에경우도 똑같이 적용되는것인지ㅜ궁금해서요",
    expectedInResponse: ["70%", "65%", "5%p 차감", "수도권", "생애최초"],
    description: "보금자리론 생애최초 수도권 LTV 질문"
  },
  {
    question: "서울에서 일반 보금자리론 LTV 한도 얼마야?",
    expectedInResponse: ["50%", "45%", "규제지역", "아파트"],
    description: "서울 일반 보금자리론 LTV 질문"
  }
];

async function testProductionAPI() {
  const API_BASE = process.env.API_URL || 'http://localhost:3000';
  
  console.log("🚀 Production API LTV 정책 동적 반영 테스트 시작...\n");
  console.log(`📡 API Base URL: ${API_BASE}\n`);
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (let i = 0; i < testQuestions.length; i++) {
    const { question, expectedInResponse, description } = testQuestions[i];
    
    console.log(`📝 Test ${i + 1}: ${description}`);
    console.log(`❓ 질문: "${question}"`);
    
    try {
      const response = await fetch(`${API_BASE}/api/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const content = data.content || '';
      
      console.log(`📄 응답 길이: ${content.length}자`);
      
      // 기대하는 키워드들이 응답에 포함되어 있는지 확인
      const missingKeywords = [];
      const foundKeywords = [];
      
      expectedInResponse.forEach(keyword => {
        if (content.includes(keyword)) {
          foundKeywords.push(keyword);
        } else {
          missingKeywords.push(keyword);
        }
      });
      
      if (missingKeywords.length === 0) {
        console.log(`✅ 통과: 모든 기대 키워드 발견 [${foundKeywords.join(', ')}]`);
        passedTests++;
      } else {
        console.log(`❌ 실패: 누락된 키워드 [${missingKeywords.join(', ')}]`);
        console.log(`📋 발견된 키워드: [${foundKeywords.join(', ')}]`);
        failedTests++;
      }
      
      // 응답 내용 일부 출력 (처음 200자)
      console.log(`📖 응답 내용 (일부):`);
      console.log(`   "${content.substring(0, 200)}..."`);
      
    } catch (error) {
      console.log(`❌ API 호출 실패: ${error.message}`);
      failedTests++;
    }
    
    console.log(""); // 빈 줄
  }
  
  // 결과 요약
  console.log("📊 API 테스트 결과 요약:");
  console.log(`✅ 통과: ${passedTests}개`);
  console.log(`❌ 실패: ${failedTests}개`);
  console.log(`📈 성공률: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log(`\n🎉 모든 API 테스트가 통과되었습니다! Production 환경이 최신 LTV 정책을 올바르게 반영하고 있습니다.`);
  } else {
    console.log(`\n⚠️ ${failedTests}개의 API 테스트가 실패했습니다. 배포 상태를 확인해주세요.`);
  }
  
  return { passed: passedTests, failed: failedTests };
}

// Local development server test
async function testLocalAPI() {
  console.log("🏠 Local Development Server 테스트\n");
  
  try {
    const response = await fetch('http://localhost:3000/api/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: "서울에서 보금자리론 생애최초 LTV 한도 얼마야?" 
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Local server 연결 성공");
      console.log(`📄 응답 길이: ${data.content?.length || 0}자`);
      
      // LTV 관련 키워드 확인
      const content = data.content || '';
      const ltvKeywords = ['70%', '65%', '2025', '생애최초'];
      const foundKeywords = ltvKeywords.filter(keyword => content.includes(keyword));
      
      console.log(`🔍 LTV 키워드 발견: [${foundKeywords.join(', ')}]`);
      
      if (foundKeywords.length >= 2) {
        console.log("✅ Local server가 최신 LTV 정책을 반영하고 있습니다.");
      } else {
        console.log("⚠️ Local server의 LTV 정책 반영 상태를 확인해주세요.");
      }
    } else {
      console.log("❌ Local server 연결 실패 (정상 - 서버가 실행 중이 아닐 수 있음)");
    }
  } catch (error) {
    console.log("❌ Local server 연결 불가 (정상 - dev server가 실행 중이 아님)");
  }
}

// 메인 실행
async function main() {
  console.log("=" * 60);
  console.log("🏠 보금자리론 LTV 정책 동적 반영 API 테스트");
  console.log("=" * 60);
  
  // Local test first
  await testLocalAPI();
  
  console.log("\n" + "=" * 40);
  
  // Production test with environment detection
  if (process.env.NODE_ENV === 'production' || process.env.API_URL) {
    await testProductionAPI();
  } else {
    console.log("💡 Production API 테스트를 위해 다음 명령어를 사용하세요:");
    console.log("   API_URL=https://real-e-rosy.vercel.app node test-api-ltv.js");
    console.log("   또는");
    console.log("   NODE_ENV=production API_URL=https://your-production-url.com node test-api-ltv.js");
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testProductionAPI, testLocalAPI };
