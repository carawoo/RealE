// 최신 대출 정책 데이터 (동적 관리) - 2025년 실제 정책 반영
export const CURRENT_LOAN_POLICY = {
  year: 2025,
  lastUpdated: "2025-01-27",
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
  dsr: {
    limit: 40, // DSR 한도 40%
    firstTimeLimit: 50 // 생애최초 DSR 한도 50%
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

// 정책 데이터 신선도 확인 (개발자용)
export function checkPolicyDataFreshness() {
  const lastUpdated = new Date(CURRENT_LOAN_POLICY.lastUpdated);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 30) {
    console.warn(`⚠️ 정책 데이터가 ${daysDiff}일 전에 업데이트되었습니다. 최신 정보로 업데이트를 권장합니다.`);
  }
}

// 정책 정보 disclaimer 생성
export function getCurrentPolicyDisclaimer() {
  return `\n\n📌 **정보 업데이트**: ${CURRENT_LOAN_POLICY.lastUpdated} 기준\n` +
         `💡 **최신 정보**: [한국주택금융공사](https://www.hf.go.kr) | [기금e든든](https://www.hf.go.kr)\n` +
         `⚠️ 정책 변경 가능성이 있으니 신청 전 반드시 확인하세요.`;
}
