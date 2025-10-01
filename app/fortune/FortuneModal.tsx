"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { initKakao } from "../lib/kakaoInit";
import "./fortune.css";

interface FortuneModalProps {
  propertyId: string;
  propertyName: string;
  propertyType?: string;
  propertyPrice?: string;
  propertyAddress?: string;
  onClose: () => void;
}

interface FortuneResult {
  fortuneText: string;
  keywords: string[];
  shareSlug: string | null;
  imageUrl?: string;
}

export default function FortuneModal({
  propertyId,
  propertyName,
  propertyType,
  propertyPrice,
  propertyAddress,
  onClose,
}: FortuneModalProps) {
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [userName, setUserName] = useState("");
  const [userBirth, setUserBirth] = useState("");
  const [result, setResult] = useState<FortuneResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("운세를 읽고 있습니다...");

  // 클라이언트 사이드에서만 Portal 사용 & Kakao SDK 초기화
  useEffect(() => {
    setMounted(true);
    
    // Kakao SDK 초기화 (SDK 로드 대기)
    const initTimer = setTimeout(() => {
      initKakao();
    }, 1000);

    return () => {
      setMounted(false);
      clearTimeout(initTimer);
    };
  }, []);

  // 프로그레스바 자동 증가 애니메이션
  useEffect(() => {
    if (step !== "loading") return;

    const interval = setInterval(() => {
      setProgress(prev => {
        // 80%까지만 자동으로 채우고, 나머지는 실제 응답 대기
        if (prev < 80) {
          return Math.min(prev + 1, 80);
        }
        return prev;
      });
    }, 150); // 150ms마다 1%씩 증가 (약 12초에 80% 도달)

    return () => clearInterval(interval);
  }, [step]);

  const handleGenerate = async () => {
    // 필수 입력 검증
    if (!userName.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    
    if (!userBirth.trim()) {
      setError("생년월일을 입력해주세요.");
      return;
    }
    
    // 생년월일 형식 검증 (YYYY-MM-DD 또는 YYYYMMDD)
    const birthRegex = /^(\d{4})[-]?(\d{2})[-]?(\d{2})$/;
    if (!birthRegex.test(userBirth)) {
      setError("생년월일 형식이 올바르지 않습니다. (예: 1990-01-01 또는 19900101)");
      return;
    }

    setStep("loading");
    setError(null);
    setProgress(0);
    setLoadingMessage("🔮 사주를 분석하고 있습니다...");

    try {
      // 1. 운세 텍스트 생성 (예상 시간: 10-15초)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const fortuneResponse = await fetch("/api/fortune/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          propertyName,
          propertyType,
          propertyPrice,
          propertyAddress,
          userName: userName || undefined,
          userBirth: userBirth || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!fortuneResponse.ok) {
        const errorData = await fortuneResponse.json().catch(() => ({}));
        console.error('❌ API 에러:', errorData);
        throw new Error(errorData.error || "운세 생성 실패");
      }

      const fortuneData = await fortuneResponse.json();
      
      // 데이터 검증
      if (!fortuneData.fortuneText || !fortuneData.keywords) {
        console.error('❌ 잘못된 응답:', fortuneData);
        throw new Error("운세 데이터가 올바르지 않습니다.");
      }

      console.log('✅ 운세 생성 완료:', fortuneData);
      
      // API 완료 시 100%로 즉시 점프
      setProgress(100);
      setLoadingMessage("🎉 완료!");

      // 운세 텍스트 먼저 표시 (빠른 응답)
      setResult({
        fortuneText: fortuneData.fortuneText,
        keywords: fortuneData.keywords,
        shareSlug: fortuneData.shareSlug,
        imageUrl: undefined, // 이미지는 백그라운드에서 로드
      });
      setStep("result");

      // 2. 이미지 생성 (백그라운드, 결과 화면 표시 후)
      setTimeout(async () => {
        try {
          console.log('🎨 타로 카드 이미지 생성 시작 (백그라운드)...');
          
          const imageController = new AbortController();
          const imageTimeout = setTimeout(() => imageController.abort(), 30000);

          const imageResponse = await fetch("/api/fortune/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keywords: fortuneData.keywords,
              propertyName,
            }),
            signal: imageController.signal,
          });

          clearTimeout(imageTimeout);

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            if (imageData.success && imageData.imageUrl) {
              // 이미지가 준비되면 기존 결과에 이미지만 추가
              setResult(prev => prev ? {
                ...prev,
                imageUrl: imageData.imageUrl
              } : null);
              console.log('✅ 타로 카드 이미지 로드 완료 (백그라운드)');
            }
          }
        } catch (imgErr) {
          console.warn('⚠️ 이미지 생성 중 오류 (무시):', imgErr);
        }
      }, 100);
    } catch (err) {
      console.error("❌ 운세 생성 오류:", err);
      
      // 더 자세한 에러 메시지
      let errorMsg = "운세를 생성하는 중 오류가 발생했습니다.";
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMsg = "요청 시간이 초과되었습니다. 다시 시도해주세요.";
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMsg = "서버 연결에 실패했습니다. 네트워크를 확인해주세요.";
        } else if (err.message.includes('JSON')) {
          errorMsg = "서버 응답을 처리하는 중 오류가 발생했습니다.";
        } else if (err.message) {
          errorMsg = err.message;
        }
      }
      
      setError(errorMsg);
      setStep("input");
    } finally {
      // 항상 로딩 상태 해제
      setStep((prev) => prev === "loading" ? "input" : prev);
    }
  };

  const handleShare = async (platform: "kakao" | "twitter" | "copy") => {
    if (!result?.shareSlug) {
      alert("공유 링크가 생성되지 않았습니다.");
      return;
    }

    const shareUrl = `${window.location.origin}/fortune/${result.shareSlug}`;
    const shareText = `${propertyName}의 부동산 사주를 봤어요! 🔮\n${result.keywords.join(" · ")}\n\n`;

    switch (platform) {
      case "kakao":
        // Kakao SDK 초기화 확인
        if (!initKakao()) {
          console.error("❌ Kakao SDK 초기화 실패");
          navigator.clipboard.writeText(shareUrl);
          alert("카카오톡 공유 기능을 불러오는 중입니다.\n링크가 복사되었습니다!");
          return;
        }

        try {
          // 카카오톡 공유
          window.Kakao.Share.sendDefault({
            objectType: "feed",
            content: {
              title: `🔮 ${propertyName}의 부동산 사주`,
              description: `${result.keywords.join(" · ")}\n\n리얼이(RealE)가 AI로 분석한 이 매물의 운세를 확인해보세요!`,
              imageUrl: result.imageUrl || `${window.location.origin}/realE-logo.png`,
              link: {
                mobileWebUrl: shareUrl,
                webUrl: shareUrl,
              },
            },
            buttons: [
              {
                title: "사주 보러가기",
                link: {
                  mobileWebUrl: shareUrl,
                  webUrl: shareUrl,
                },
              },
            ],
          });
          console.log("✅ 카카오톡 공유 성공");
        } catch (kakaoError) {
          console.error("❌ 카카오톡 공유 실패:", kakaoError);
          navigator.clipboard.writeText(shareUrl);
          alert("카카오톡 공유에 실패했습니다.\n링크가 복사되었습니다!");
        }
        break;

      case "twitter":
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          shareText
        )}&url=${encodeURIComponent(shareUrl)}&hashtags=부동산사주,realespace`;
        window.open(twitterUrl, "_blank");
        break;

      case "copy":
        navigator.clipboard.writeText(shareUrl);
        alert("링크가 복사되었습니다!");
        break;
    }

    // 공유 횟수 증가 (백엔드에서 처리 가능)
    try {
      await fetch("/api/fortune/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareSlug: result.shareSlug }),
      });
    } catch (err) {
      console.error("공유 카운트 증가 실패:", err);
    }
  };

  // 모달 콘텐츠
  const modalContent = (
    <div className="fortune-modal-overlay" onClick={onClose}>
      <div className="fortune-modal" onClick={(e) => e.stopPropagation()}>
        <button className="fortune-close" onClick={onClose}>
          ✕
        </button>

        {step === "input" && (
          <div className="fortune-input">
            <h2>🔮 {propertyName} 사주 보기</h2>
            <p className="fortune-subtitle">
              이름과 생년월일을 입력하면 이 매물과의 궁합을 확인할 수 있어요!
            </p>

            <div className="fortune-form">
              <div className="fortune-field">
                <label>이름 (필수) <span style={{color: '#DC2626'}}>*</span></label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="예: 홍길동"
                  required
                />
              </div>

              <div className="fortune-field">
                <label>생년월일 (필수) <span style={{color: '#DC2626'}}>*</span></label>
                <input
                  type="text"
                  value={userBirth}
                  onChange={(e) => setUserBirth(e.target.value)}
                  placeholder="예: 1990-01-01 또는 19900101"
                  required
                />
              </div>

              {error && <p className="fortune-error">{error}</p>}

              <button className="fortune-btn primary" onClick={handleGenerate}>
                사주 보기 🔮
              </button>

              <p className="fortune-disclaimer">
                ※ 본 콘텐츠는 오직 재미용으로 제공되며 실제 투자 및 매매 판단과는 무관합니다.
              </p>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="fortune-loading">
            <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '2rem' }}>{loadingMessage}</p>
            <div className="fortune-progress-bar">
              <div 
                className="fortune-progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="fortune-loading-sub">
              {progress < 60 ? '예상 시간: 약 10-15초' : progress < 100 ? '거의 다 됐어요...' : '완료!'}
            </p>
          </div>
        )}

        {step === "result" && result && (
          <div className="fortune-result">
            <h2>🔮 {propertyName}의 사주</h2>

            <div className="fortune-keywords">
              {result.keywords.map((keyword, idx) => (
                <span key={idx} className="fortune-keyword">
                  {keyword}
                </span>
              ))}
            </div>

            {result.imageUrl && (
              <div className="fortune-image">
                <img src={result.imageUrl} alt="타로 카드" />
              </div>
            )}

            <div className="fortune-text">
              {result.fortuneText.split('\n').map((line, idx) => {
                // 섹션 제목 (예: **첫인상과 기운**) 스타일링
                if (line.includes('**') || line.includes('📍') || line.includes('💰') || line.includes('🏡') || line.includes('✨')) {
                  return (
                    <p key={idx} className="fortune-section-title">
                      {line.replace(/\*\*/g, '')}
                    </p>
                  );
                }
                // 빈 줄 제거
                if (!line.trim()) {
                  return null;
                }
                return <p key={idx}>{line}</p>;
              })}
            </div>

            <p className="fortune-disclaimer">
              ※ 본 콘텐츠는 오직 재미용으로 제공되며 실제 투자 및 매매 판단과는 무관합니다.
            </p>

            <div className="fortune-actions">
              <h3>친구에게 공유하기</h3>
              <div className="fortune-share-buttons">
                <button
                  className="fortune-share-btn kakao"
                  onClick={() => handleShare("kakao")}
                >
                  <span>💬</span>
                  <span>카카오톡</span>
                </button>
                <button
                  className="fortune-share-btn twitter"
                  onClick={() => handleShare("twitter")}
                >
                  <span>🐦</span>
                  <span>트위터</span>
                </button>
                <button
                  className="fortune-share-btn copy"
                  onClick={() => handleShare("copy")}
                >
                  <span>🔗</span>
                  <span>링크 복사</span>
                </button>
              </div>
            </div>

            <button
              className="fortune-btn secondary"
              onClick={onClose}
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Portal을 사용하여 body에 직접 렌더링
  if (!mounted) return null;
  
  return createPortal(modalContent, document.body);
}

