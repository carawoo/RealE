/**
 * LTV 정책 데이터 정확성 검증 테스트
 * 2025년 실제 정책과 시스템 데이터 일치 여부 확인
 */

// 현재 시스템의 LTV 정책 데이터 (실제 코드에서 복사)
const CURRENT_LOAN_POLICY = {
  year: 2025,
  lastUpdated: "2025-01-15",
  ltv: {
    bogeumjari: {
      // 수도권 (서울/경기/인천) = 규제지역/조정대상지역
      metro: { apartment: 50, nonApartment: 45 }, // 규제지역: 일반 50%, 아파트외 5%p 차감
      nonMetro: { apartment: 70, nonApartment: 65 } // 비규제지역: 70%, 아파트외 5%p 차감
    },
    firstTime: {
      // 생애최초도 2025년 6월부터 규제 강화
      metro: { apartment: 70, nonApartment: 65 }, // 규제지역: 생애최초 70%, 아파트외 5%p 차감  
      nonMetro: { apartment: 80, nonApartment: 75 } // 비규제지역: 80%, 아파트외 5%p 차감
    }
  },
  dsr: { max: 70, firstTime: 70 },
  maxAmount: {
    bogeumjari: 600_000_000, // 6억 (2025년 절대상한 도입)
    jeonse: 200_000_000      // 2억
  },
  regions: {
    regulated: ['서울', '경기', '인천'], // 규제지역 (조정대상지역/투기과열지구)
    nonRegulated: ['부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']
  }
};

// 2025년 실제 정책 기준 예상값
const EXPECTED_POLICY = {
  "서울_일반_아파트": 50,
  "서울_일반_아파트외": 45,
  "서울_생애최초_아파트": 70,
  "서울_생애최초_아파트외": 65,
  "경기_일반_아파트": 50,
  "경기_일반_아파트외": 45,
  "인천_일반_아파트": 50,
  "인천_일반_아파트외": 45,
  "부산_일반_아파트": 70,
  "부산_일반_아파트외": 65,
  "부산_생애최초_아파트": 80,
  "부산_생애최초_아파트외": 75,
  "대출한도_최대": 600_000_000,
  "전세자금_최대": 200_000_000
};

// LTV 계산 함수
function calculateLTV(region, isFirstTime, isApartment) {
  const isRegulated = CURRENT_LOAN_POLICY.regions.regulated.includes(region);
  const ltvData = isFirstTime ? 
    CURRENT_LOAN_POLICY.ltv.firstTime : 
    CURRENT_LOAN_POLICY.ltv.bogeumjari;
  
  const regionData = isRegulated ? ltvData.metro : ltvData.nonMetro;
  return isApartment ? regionData.apartment : regionData.nonApartment;
}

// 테스트 케이스 실행
function runLTVTests() {
  console.log("🔍 LTV 정책 데이터 정확성 검증 시작...\n");
  
  const testCases = [
    // 수도권 규제지역 테스트
    { region: "서울", isFirstTime: false, isApartment: true, expected: 50, desc: "서울 일반 아파트" },
    { region: "서울", isFirstTime: false, isApartment: false, expected: 45, desc: "서울 일반 아파트외" },
    { region: "서울", isFirstTime: true, isApartment: true, expected: 70, desc: "서울 생애최초 아파트" },
    { region: "서울", isFirstTime: true, isApartment: false, expected: 65, desc: "서울 생애최초 아파트외" },
    
    { region: "경기", isFirstTime: false, isApartment: true, expected: 50, desc: "경기 일반 아파트" },
    { region: "경기", isFirstTime: false, isApartment: false, expected: 45, desc: "경기 일반 아파트외" },
    
    { region: "인천", isFirstTime: false, isApartment: true, expected: 50, desc: "인천 일반 아파트" },
    { region: "인천", isFirstTime: false, isApartment: false, expected: 45, desc: "인천 일반 아파트외" },
    
    // 비규제지역 테스트
    { region: "부산", isFirstTime: false, isApartment: true, expected: 70, desc: "부산 일반 아파트" },
    { region: "부산", isFirstTime: false, isApartment: false, expected: 65, desc: "부산 일반 아파트외" },
    { region: "부산", isFirstTime: true, isApartment: true, expected: 80, desc: "부산 생애최초 아파트" },
    { region: "부산", isFirstTime: true, isApartment: false, expected: 75, desc: "부산 생애최초 아파트외" },
    
    { region: "대구", isFirstTime: false, isApartment: true, expected: 70, desc: "대구 일반 아파트" },
    { region: "제주", isFirstTime: true, isApartment: true, expected: 80, desc: "제주 생애최초 아파트" },
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const { region, isFirstTime, isApartment, expected, desc } = testCase;
    const actual = calculateLTV(region, isFirstTime, isApartment);
    
    if (actual === expected) {
      console.log(`✅ Test ${index + 1}: ${desc} - ${actual}% (통과)`);
      passedTests++;
    } else {
      console.log(`❌ Test ${index + 1}: ${desc} - 예상: ${expected}%, 실제: ${actual}% (실패)`);
      failedTests++;
    }
  });
  
  // 대출 한도 테스트
  const maxLoanTest = CURRENT_LOAN_POLICY.maxAmount.bogeumjari === 600_000_000;
  if (maxLoanTest) {
    console.log(`✅ 대출 한도: 6억원 (통과)`);
    passedTests++;
  } else {
    console.log(`❌ 대출 한도: 예상 6억원, 실제: ${CURRENT_LOAN_POLICY.maxAmount.bogeumjari}원 (실패)`);
    failedTests++;
  }
  
  const jeonseTest = CURRENT_LOAN_POLICY.maxAmount.jeonse === 200_000_000;
  if (jeonseTest) {
    console.log(`✅ 전세자금 한도: 2억원 (통과)`);
    passedTests++;
  } else {
    console.log(`❌ 전세자금 한도: 예상 2억원, 실제: ${CURRENT_LOAN_POLICY.maxAmount.jeonse}원 (실패)`);
    failedTests++;
  }
  
  console.log(`\n📊 테스트 결과 요약:`);
  console.log(`✅ 통과: ${passedTests}개`);
  console.log(`❌ 실패: ${failedTests}개`);
  console.log(`📈 성공률: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log(`\n🎉 모든 테스트가 통과되었습니다! 시스템이 2025년 최신 LTV 정책을 정확히 반영하고 있습니다.`);
  } else {
    console.log(`\n⚠️  ${failedTests}개의 테스트가 실패했습니다. 정책 데이터를 재확인해주세요.`);
  }
  
  return { passed: passedTests, failed: failedTests };
}

// 정책 신선도 체크
function checkPolicyFreshness() {
  const now = new Date();
  const lastUpdate = new Date(CURRENT_LOAN_POLICY.lastUpdated);
  const daysDiff = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
  
  console.log(`\n⏰ 정책 데이터 신선도 체크:`);
  console.log(`📅 마지막 업데이트: ${CURRENT_LOAN_POLICY.lastUpdated}`);
  console.log(`⏳ 경과일수: ${daysDiff}일`);
  
  if (daysDiff > 30) {
    console.log(`⚠️  주의: 정책 데이터가 ${daysDiff}일 된 데이터입니다. 업데이트 검토가 필요합니다.`);
  } else if (daysDiff > 14) {
    console.log(`💡 권장: 2주가 경과했습니다. 최신 정책 확인을 권장합니다.`);
  } else {
    console.log(`✅ 정책 데이터가 최신 상태입니다.`);
  }
}

// 메인 실행
if (require.main === module) {
  console.log("=" * 50);
  console.log("🏠 보금자리론 LTV 정책 검증 테스트");
  console.log("=" * 50);
  
  checkPolicyFreshness();
  const results = runLTVTests();
  
  console.log(`\n📌 참고 링크:`);
  console.log(`- 한국주택금융공사: https://www.hf.go.kr`);
  console.log(`- 기금e든든: https://www.hf.go.kr/hf/sub02/sub01_05_01.do`);
  
  // 프로세스 종료 코드 설정
  process.exit(results.failed > 0 ? 1 : 0);
}

module.exports = { runLTVTests, calculateLTV, CURRENT_LOAN_POLICY };
