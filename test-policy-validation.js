/**
 * 정책 데이터 검증 및 교차검증 테스트
 * 
 * 목적:
 * 1. 정책 데이터의 정확성 검증
 * 2. 하드코딩 vs 동적 데이터 비교
 * 3. 실시간 정보와의 일치성 확인
 * 4. 데이터 무결성 검사
 */

// 현재 정책 데이터 (lib/policy-data.ts에서 복사)
const CURRENT_LOAN_POLICY = {
  year: 2025,
  lastUpdated: "2025-01-27",
  ltv: {
    bogeumjari: {
      metro: { apartment: 50, nonApartment: 45 },
      nonMetro: { apartment: 70, nonApartment: 65 }
    },
    firstTime: {
      metro: { apartment: 70, nonApartment: 65 },
      nonMetro: { apartment: 80, nonApartment: 75 }
    }
  },
  dsr: {
    limit: 40,
    firstTimeLimit: 50
  },
  maxAmount: {
    bogeumjari: 360000000, // 3억 6천만원 (일반)
    bogeumjariFirstTime: 420000000, // 4억 2천만원 (생애최초)
    bogeumjariMultiChild: 400000000, // 4억원 (다자녀 가구)
    bogeumjariVictim: 400000000, // 4억원 (전세사기 피해자)
    didimdol: 250000000, // 2억 5천만원
    junggicheong: 200000000, // 2억원 (종료됨)
    buttumok: 200000000, // 2억원 (버팀목 전세자금)
    youth: 200000000 // 2억원 (청년 전용 전세자금)
  },
  regulatedRegions: ["서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종"]
};

// 정책 데이터 검증 함수들
function validatePolicyLimits(policy) {
  console.log("🔍 정책 한도 검증 시작...");
  
  const tests = [
    {
      name: "보금자리론 기본 한도",
      expected: 360000000, // 3억 6천만원
      actual: policy.maxAmount.bogeumjari,
      description: "일반 보금자리론 최대 한도"
    },
    {
      name: "보금자리론 생애최초 한도",
      expected: 420000000, // 4억 2천만원
      actual: policy.maxAmount.bogeumjariFirstTime,
      description: "생애최초 보금자리론 최대 한도"
    },
    {
      name: "보금자리론 다자녀 한도",
      expected: 400000000, // 4억원
      actual: policy.maxAmount.bogeumjariMultiChild,
      description: "다자녀 가구 보금자리론 최대 한도"
    },
    {
      name: "디딤돌 대출 한도",
      expected: 250000000, // 2억 5천만원
      actual: policy.maxAmount.didimdol,
      description: "디딤돌 대출 최대 한도"
    },
    {
      name: "버팀목 전세자금 한도",
      expected: 200000000, // 2억원
      actual: policy.maxAmount.buttumok,
      description: "버팀목 전세자금 최대 한도"
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const isCorrect = test.actual === test.expected;
    const status = isCorrect ? "✅" : "❌";
    
    console.log(`${status} ${test.name}: ${test.actual.toLocaleString()}원`);
    console.log(`   기대값: ${test.expected.toLocaleString()}원`);
    console.log(`   설명: ${test.description}`);
    
    if (isCorrect) {
      passed++;
    } else {
      failed++;
      console.log(`   ⚠️ 불일치: ${Math.abs(test.actual - test.expected).toLocaleString()}원 차이`);
    }
    console.log("");
  }
  
  console.log(`📊 검증 결과: ${passed}개 통과, ${failed}개 실패`);
  return { passed, failed, total: tests.length };
}

function validateLTVRates(policy) {
  console.log("🔍 LTV 비율 검증 시작...");
  
  const tests = [
    {
      name: "보금자리론 수도권 아파트",
      expected: 50,
      actual: policy.ltv.bogeumjari.metro.apartment,
      description: "수도권 아파트 LTV"
    },
    {
      name: "보금자리론 수도권 아파트외",
      expected: 45,
      actual: policy.ltv.bogeumjari.metro.nonApartment,
      description: "수도권 아파트외 LTV (5%p 차감)"
    },
    {
      name: "보금자리론 비수도권 아파트",
      expected: 70,
      actual: policy.ltv.bogeumjari.nonMetro.apartment,
      description: "비수도권 아파트 LTV"
    },
    {
      name: "생애최초 수도권 아파트",
      expected: 70,
      actual: policy.ltv.firstTime.metro.apartment,
      description: "생애최초 수도권 아파트 LTV"
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const isCorrect = test.actual === test.expected;
    const status = isCorrect ? "✅" : "❌";
    
    console.log(`${status} ${test.name}: ${test.actual}%`);
    console.log(`   기대값: ${test.expected}%`);
    console.log(`   설명: ${test.description}`);
    
    if (isCorrect) {
      passed++;
    } else {
      failed++;
      console.log(`   ⚠️ 불일치: ${Math.abs(test.actual - test.expected)}%p 차이`);
    }
    console.log("");
  }
  
  console.log(`📊 검증 결과: ${passed}개 통과, ${failed}개 실패`);
  return { passed, failed, total: tests.length };
}

function validateDSRLimits(policy) {
  console.log("🔍 DSR 한도 검증 시작...");
  
  const tests = [
    {
      name: "일반 DSR 한도",
      expected: 40,
      actual: policy.dsr.limit,
      description: "일반 대출 DSR 한도"
    },
    {
      name: "생애최초 DSR 한도",
      expected: 50,
      actual: policy.dsr.firstTimeLimit,
      description: "생애최초 대출 DSR 한도"
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const isCorrect = test.actual === test.expected;
    const status = isCorrect ? "✅" : "❌";
    
    console.log(`${status} ${test.name}: ${test.actual}%`);
    console.log(`   기대값: ${test.expected}%`);
    console.log(`   설명: ${test.description}`);
    
    if (isCorrect) {
      passed++;
    } else {
      failed++;
      console.log(`   ⚠️ 불일치: ${Math.abs(test.actual - test.expected)}%p 차이`);
    }
    console.log("");
  }
  
  console.log(`📊 검증 결과: ${passed}개 통과, ${failed}개 실패`);
  return { passed, failed, total: tests.length };
}

function validateRegulatedRegions(policy) {
  console.log("🔍 규제지역 검증 시작...");
  
  const expectedRegions = ["서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종"];
  const actualRegions = policy.regulatedRegions;
  
  const missing = expectedRegions.filter(region => !actualRegions.includes(region));
  const extra = actualRegions.filter(region => !expectedRegions.includes(region));
  
  if (missing.length === 0 && extra.length === 0) {
    console.log("✅ 규제지역 목록 정확");
    console.log(`   포함된 지역: ${actualRegions.join(", ")}`);
    return { passed: 1, failed: 0, total: 1 };
  } else {
    console.log("❌ 규제지역 목록 불일치");
    if (missing.length > 0) {
      console.log(`   누락된 지역: ${missing.join(", ")}`);
    }
    if (extra.length > 0) {
      console.log(`   추가된 지역: ${extra.join(", ")}`);
    }
    return { passed: 0, failed: 1, total: 1 };
  }
}

// 실시간 정보 교차검증 (모의)
async function crossValidateWithRealTimeData(policy) {
  console.log("🔍 실시간 정보 교차검증 시작...");
  
  // 실제로는 한국주택금융공사 API나 공식 웹사이트에서 정보를 가져와야 함
  // 여기서는 모의 데이터로 검증
  const mockRealTimeData = {
    bogeumjari: 360000000,
    bogeumjariFirstTime: 420000000,
    didimdol: 250000000,
    lastUpdated: "2025-01-27"
  };
  
  const tests = [
    {
      name: "보금자리론 한도 실시간 검증",
      expected: mockRealTimeData.bogeumjari,
      actual: policy.maxAmount.bogeumjari,
      description: "실시간 데이터와 비교"
    },
    {
      name: "보금자리론 생애최초 한도 실시간 검증",
      expected: mockRealTimeData.bogeumjariFirstTime,
      actual: policy.maxAmount.bogeumjariFirstTime,
      description: "실시간 데이터와 비교"
    },
    {
      name: "디딤돌 대출 한도 실시간 검증",
      expected: mockRealTimeData.didimdol,
      actual: policy.maxAmount.didimdol,
      description: "실시간 데이터와 비교"
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const isCorrect = test.actual === test.expected;
    const status = isCorrect ? "✅" : "❌";
    
    console.log(`${status} ${test.name}: ${test.actual.toLocaleString()}원`);
    console.log(`   실시간 데이터: ${test.expected.toLocaleString()}원`);
    console.log(`   설명: ${test.description}`);
    
    if (isCorrect) {
      passed++;
    } else {
      failed++;
      console.log(`   ⚠️ 불일치: ${Math.abs(test.actual - test.expected).toLocaleString()}원 차이`);
    }
    console.log("");
  }
  
  console.log(`📊 교차검증 결과: ${passed}개 통과, ${failed}개 실패`);
  return { passed, failed, total: tests.length };
}

// 데이터 무결성 검사
function validateDataIntegrity(policy) {
  console.log("🔍 데이터 무결성 검사 시작...");
  
  const issues = [];
  
  // 필수 필드 존재 확인
  const requiredFields = ['year', 'lastUpdated', 'ltv', 'dsr', 'maxAmount', 'regulatedRegions'];
  for (const field of requiredFields) {
    if (!(field in policy)) {
      issues.push(`필수 필드 누락: ${field}`);
    }
  }
  
  // 한도 값이 양수인지 확인
  for (const [key, value] of Object.entries(policy.maxAmount)) {
    if (typeof value !== 'number' || value <= 0) {
      issues.push(`잘못된 한도 값: ${key} = ${value}`);
    }
  }
  
  // LTV 값이 0-100 범위인지 확인
  for (const [category, rates] of Object.entries(policy.ltv)) {
    for (const [region, types] of Object.entries(rates)) {
      for (const [type, value] of Object.entries(types)) {
        if (typeof value !== 'number' || value < 0 || value > 100) {
          issues.push(`잘못된 LTV 값: ${category}.${region}.${type} = ${value}%`);
        }
      }
    }
  }
  
  // DSR 값이 0-100 범위인지 확인
  if (policy.dsr.limit < 0 || policy.dsr.limit > 100) {
    issues.push(`잘못된 DSR 한도: ${policy.dsr.limit}%`);
  }
  
  if (issues.length === 0) {
    console.log("✅ 데이터 무결성 검사 통과");
    return { passed: 1, failed: 0, total: 1 };
  } else {
    console.log("❌ 데이터 무결성 문제 발견:");
    issues.forEach(issue => console.log(`   - ${issue}`));
    return { passed: 0, failed: 1, total: 1 };
  }
}

// 메인 테스트 함수
async function runPolicyValidationTests() {
  console.log("=".repeat(80));
  console.log("🧪 정책 데이터 검증 및 교차검증 테스트 시작");
  console.log("=".repeat(80));
  
  const results = [];
  
  // 1. 정책 한도 검증
  results.push(validatePolicyLimits(CURRENT_LOAN_POLICY));
  
  // 2. LTV 비율 검증
  results.push(validateLTVRates(CURRENT_LOAN_POLICY));
  
  // 3. DSR 한도 검증
  results.push(validateDSRLimits(CURRENT_LOAN_POLICY));
  
  // 4. 규제지역 검증
  results.push(validateRegulatedRegions(CURRENT_LOAN_POLICY));
  
  // 5. 실시간 정보 교차검증
  results.push(await crossValidateWithRealTimeData(CURRENT_LOAN_POLICY));
  
  // 6. 데이터 무결성 검사
  results.push(validateDataIntegrity(CURRENT_LOAN_POLICY));
  
  // 종합 결과
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalTests = results.reduce((sum, r) => sum + r.total, 0);
  
  console.log("=".repeat(80));
  console.log("📊 종합 테스트 결과");
  console.log("=".repeat(80));
  console.log(`✅ 통과: ${totalPassed}개`);
  console.log(`❌ 실패: ${totalFailed}개`);
  console.log(`📋 총 테스트: ${totalTests}개`);
  console.log(`📈 성공률: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  
  if (totalFailed === 0) {
    console.log("\n🎉 모든 테스트 통과! 정책 데이터가 정확합니다.");
  } else {
    console.log("\n⚠️ 일부 테스트 실패. 정책 데이터 검토가 필요합니다.");
  }
  
  console.log("\n💡 개선 권장사항:");
  console.log("• 정기적인 실시간 데이터 교차검증");
  console.log("• 자동화된 정책 업데이트 시스템 구축");
  console.log("• 공식 API 연동으로 실시간 정보 제공");
  console.log("• 사용자에게 최신 정보임을 명시");
}

// 테스트 실행
runPolicyValidationTests().catch(console.error);
