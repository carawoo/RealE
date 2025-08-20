// Supabase 저장 기능 테스트
const testCases = [
  {
    name: "감정평가 상담",
    message: "오늘 보금자리론 대출신청 2억7천했는데 감정평가액 2억3000 나왔어요 ㅠㅠ 망했네요",
    expected: "상담원 스타일 응답 + Supabase 저장"
  },
  {
    name: "대출 시나리오",
    message: "월급 340, 3억 매매고민중",
    expected: "대출 시나리오 + Supabase 저장"
  },
  {
    name: "전세→월세 환산",
    message: "2억8천 전세보증금",
    expected: "전세→월세 환산 + Supabase 저장"
  },
  {
    name: "숫자만 요청",
    message: "숫자만 콤마 포함해서 말해줘",
    expected: "숫자 응답 + Supabase 저장"
  },
  {
    name: "대화 연속성 테스트",
    message: "뭐가 84만원이야?",
    expected: "대화 맥락 이해 + Supabase 저장"
  }
];

console.log("🧪 Supabase 저장 기능 테스트 시작\n");

async function testSupabaseStorage() {
  for (const testCase of testCases) {
    console.log(`📝 테스트: ${testCase.name}`);
    console.log(`입력: "${testCase.message}"`);
    console.log(`기대: ${testCase.expected}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/compute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testCase.message,
          conversationId: `test_${Date.now()}` // 고유한 대화 ID
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ 성공: ${result.content ? '응답 생성됨' : '응답 없음'}`);
        console.log(`📊 필드: ${JSON.stringify(result.fields)}`);
        
        if (result.fields && Object.keys(result.fields).length > 0) {
          console.log(`💾 필드 저장: ✅`);
        } else {
          console.log(`💾 필드 저장: ⚠️ (필드 없음)`);
        }
      } else {
        console.log(`❌ 실패: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ 오류: ${error.message}`);
    }
    
    console.log("─".repeat(50));
  }
  
  console.log("\n🎯 테스트 완료!");
  console.log("\n📋 확인 사항:");
  console.log("1. 서버 콘솔에서 '✅ Supabase 저장 성공' 메시지 확인");
  console.log("2. Supabase 대시보드에서 messages 테이블 확인");
  console.log("3. conversations 테이블에 새 대화 생성 확인");
  console.log("4. fields 컬럼에 사용자 정보 저장 확인");
}

// Node.js 환경에서 실행
if (typeof window === 'undefined') {
  testSupabaseStorage().catch(console.error);
} else {
  console.log("브라우저 환경에서는 실행되지 않습니다. Node.js에서 실행하세요.");
}
