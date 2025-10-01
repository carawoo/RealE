// app/lib/kakaoInit.ts
// Kakao SDK 초기화 유틸리티

declare global {
  interface Window {
    Kakao: any;
  }
}

let isInitialized = false;

export function initKakao() {
  if (typeof window === "undefined") return false;
  
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || "087319e261444450882a1a155abea088";
  
  if (!window.Kakao) {
    console.warn("⚠️ Kakao SDK가 로드되지 않았습니다.");
    return false;
  }

  if (!isInitialized) {
    try {
      window.Kakao.init(kakaoKey);
      isInitialized = true;
      console.log("✅ Kakao SDK 초기화 완료");
    } catch (error) {
      console.error("❌ Kakao SDK 초기화 실패:", error);
      return false;
    }
  }

  return window.Kakao.isInitialized();
}

export function isKakaoAvailable() {
  if (typeof window === "undefined") return false;
  return window.Kakao && window.Kakao.isInitialized();
}

