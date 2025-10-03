// app/fortune/DailyFortuneModal.tsx
// 오늘의 운세 모달 컴포넌트

"use client";

import { useState, useEffect } from "react";
import "./fortune.css";

interface DailyFortuneModalProps {
  onClose: () => void;
}

interface FortuneData {
  fortuneText: string;
  keywords: string[];
  date: string;
  type: 'daily' | 'personal';
  userName?: string;
}

export default function DailyFortuneModal({ onClose }: DailyFortuneModalProps) {
  const [step, setStep] = useState<'type' | 'personal' | 'loading' | 'result'>('type');
  const [fortuneData, setFortuneData] = useState<FortuneData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userBirth, setUserBirth] = useState('');

  // 일반 오늘의 운세 가져오기
  const fetchDailyFortune = async () => {
    try {
      setStep('loading');
      setError(null);

      const response = await fetch('/api/fortune/daily');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '오늘의 운세를 가져오는데 실패했습니다.');
      }

      if (data.success) {
        setFortuneData({
          fortuneText: data.fortuneText,
          keywords: data.keywords,
          date: data.date,
          type: 'daily'
        });
        setStep('result');
      } else {
        throw new Error(data.error || '오늘의 운세를 가져오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('오늘의 운세 가져오기 에러:', err);
      setError(err instanceof Error ? err.message : '오늘의 운세를 가져오는데 실패했습니다.');
      setStep('type');
    }
  };

  // 개인화된 오늘의 운세 가져오기
  const fetchPersonalFortune = async () => {
    try {
      setStep('loading');
      setError(null);

      const response = await fetch('/api/fortune/daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName,
          userBirth
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '개인화된 오늘의 운세를 가져오는데 실패했습니다.');
      }

      if (data.success) {
        setFortuneData({
          fortuneText: data.fortuneText,
          keywords: data.keywords,
          date: data.date,
          type: 'personal',
          userName: data.userName
        });
        setStep('result');
      } else {
        throw new Error(data.error || '개인화된 오늘의 운세를 가져오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('개인화 오늘의 운세 가져오기 에러:', err);
      setError(err instanceof Error ? err.message : '개인화된 오늘의 운세를 가져오는데 실패했습니다.');
      setStep('personal');
    }
  };

  // 생년월일 유효성 검사
  const validateBirth = (birth: string): boolean => {
    const birthRegex = /^\d{4}년\s*\d{1,2}월\s*\d{1,2}일$|^\d{4}-\d{1,2}-\d{1,2}$|^\d{8}$/;
    return birthRegex.test(birth);
  };

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleTypeSelect = (type: 'daily' | 'personal') => {
    if (type === 'daily') {
      fetchDailyFortune();
    } else {
      setStep('personal');
    }
  };

  const handlePersonalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    
    if (!userBirth.trim()) {
      setError('생년월일을 입력해주세요.');
      return;
    }

    if (!validateBirth(userBirth)) {
      setError('생년월일을 올바른 형식으로 입력해주세요. (예: 1990년 1월 1일 또는 1990-01-01)');
      return;
    }

    fetchPersonalFortune();
  };

  const handleBack = () => {
    if (step === 'personal') {
      setStep('type');
    } else if (step === 'result') {
      setStep('type');
    }
    setError(null);
    setFortuneData(null);
  };

  // 운세 공유 링크 생성
  const generateShareUrl = (fortuneData: FortuneData) => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const seed = fortuneData.type === 'personal' 
      ? generatePersonalSeed(fortuneData.userName || '', '') 
      : generateDailySeed();
    
    let slug = `${fortuneData.type}-${dateString}-${seed}`;
    
    if (fortuneData.type === 'personal' && fortuneData.userName) {
      slug += `-${encodeURIComponent(fortuneData.userName)}`;
    }
    
    return `${window.location.origin}/fortune/daily/${slug}`;
  };

  // 시드 생성 함수들 (API와 동일)
  const generateDailySeed = (): number => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      const char = dateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 2147483647;
  };

  const generatePersonalSeed = (userName: string, userBirth: string): number => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const combined = `${dateString}-${userName}-${userBirth}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 2147483647;
  };

  return (
    <div className="fortune-modal-overlay" onClick={onClose}>
      <div className="fortune-modal" onClick={(e) => e.stopPropagation()}>
        <button className="fortune-close" onClick={onClose}>
          ×
        </button>

        {step === 'type' && (
          <div className="fortune-input">
            <h2>🔮 오늘의 운세</h2>
            <p className="fortune-subtitle">
              매일 다른 부동산 운세를 확인해보세요!
            </p>

            {error && (
              <div className="fortune-error">
                {error}
              </div>
            )}

            <div className="fortune-form">
              <button
                className="fortune-btn primary"
                onClick={() => handleTypeSelect('daily')}
                type="button"
              >
                🌟 일반 오늘의 운세
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.8 }}>
                  매일 다른 일반적인 부동산 운세
                </div>
              </button>

              <button
                className="fortune-btn secondary"
                onClick={() => handleTypeSelect('personal')}
                type="button"
              >
                👤 개인화 오늘의 운세
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.8 }}>
                  이름과 생년월일로 맞춤형 운세
                </div>
              </button>
            </div>

            <div className="fortune-disclaimer">
              ⚠️ 본 콘텐츠는 오직 재미용으로 제공되며 실제 투자 및 매매 판단과는 무관합니다.
            </div>
          </div>
        )}

        {step === 'personal' && (
          <div className="fortune-input">
            <h2>👤 개인화 오늘의 운세</h2>
            <p className="fortune-subtitle">
              이름과 생년월일을 입력하면 맞춤형 운세를 제공해드립니다.
            </p>

            {error && (
              <div className="fortune-error">
                {error}
              </div>
            )}

            <form onSubmit={handlePersonalSubmit} className="fortune-form">
              <div className="fortune-field">
                <label htmlFor="userName">이름</label>
                <input
                  id="userName"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="홍길동"
                  maxLength={20}
                />
              </div>

              <div className="fortune-field">
                <label htmlFor="userBirth">생년월일</label>
                <input
                  id="userBirth"
                  type="text"
                  value={userBirth}
                  onChange={(e) => setUserBirth(e.target.value)}
                  placeholder="1990년 1월 1일 또는 1990-01-01"
                  maxLength={20}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="fortune-btn secondary"
                  onClick={handleBack}
                  style={{ flex: 1 }}
                >
                  ← 뒤로
                </button>
                <button
                  type="submit"
                  className="fortune-btn primary"
                  style={{ flex: 2 }}
                >
                  🔮 운세 보기
                </button>
              </div>
            </form>

            <div className="fortune-disclaimer">
              ⚠️ 본 콘텐츠는 오직 재미용으로 제공되며 실제 투자 및 매매 판단과는 무관합니다.
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="fortune-loading">
            <div className="fortune-spinner"></div>
            <p>🔮 운세를 분석하고 있습니다...</p>
            <p className="fortune-loading-sub">
              AI가 오늘의 특별한 운세를 생성하고 있어요
            </p>
            <div className="fortune-progress-bar">
              <div className="fortune-progress-fill" style={{ width: '70%' }}></div>
            </div>
          </div>
        )}

        {step === 'result' && fortuneData && (
          <div className="fortune-result">
            <h2>
              {fortuneData.type === 'personal' 
                ? `👤 ${fortuneData.userName}님의 오늘의 운세`
                : '🌟 오늘의 운세'
              }
            </h2>
            
            <div className="fortune-keywords">
              {fortuneData.keywords.map((keyword, index) => (
                <span key={index} className="fortune-keyword">
                  {keyword}
                </span>
              ))}
            </div>

            <div className="fortune-text">
              <div dangerouslySetInnerHTML={{ 
                __html: fortuneData.fortuneText.replace(/\n/g, '<br>') 
              }} />
            </div>

            <div className="fortune-actions">
              <h3>공유하기</h3>
              <div className="fortune-share-buttons">
                <button
                  className="fortune-share-btn"
                  onClick={() => {
                    const text = `🔮 ${fortuneData.type === 'personal' ? `${fortuneData.userName}님의 ` : ''}오늘의 부동산 운세\n\n${fortuneData.fortuneText}\n\n#부동산운세 #오늘의운세 #RealE`;
                    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                  }}
                >
                  <span>🐦</span>
                  <span>X (Twitter)</span>
                </button>
                
                <button
                  className="fortune-share-btn"
                  onClick={() => {
                    const shareUrl = generateShareUrl(fortuneData);
                    const text = `🔮 ${fortuneData.type === 'personal' ? `${fortuneData.userName}님의 ` : ''}오늘의 부동산 운세\n\n${fortuneData.fortuneText}\n\n링크: ${shareUrl}`;
                    navigator.clipboard.writeText(text);
                    alert('링크가 복사되었습니다!');
                  }}
                >
                  <span>📋</span>
                  <span>링크 복사</span>
                </button>
                
                <button
                  className="fortune-share-btn"
                  onClick={handleBack}
                >
                  <span>🔄</span>
                  <span>다시</span>
                </button>
              </div>
            </div>

            <div className="fortune-disclaimer">
              ⚠️ 본 콘텐츠는 오직 재미용으로 제공되며 실제 투자 및 매매 판단과는 무관합니다.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
