// app/fortune/daily/[slug]/page.tsx
// 오늘의 운세 결과 페이지

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import "../../fortune.css";

interface FortuneData {
  fortuneText: string;
  keywords: string[];
  date: string;
  type: 'daily' | 'personal';
  userName?: string;
}

export default function DailyFortunePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [fortuneData, setFortuneData] = useState<FortuneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFortuneData = async () => {
      try {
        setLoading(true);
        setError(null);

        // slug에서 운세 데이터 추출
        const [type, date, seed] = slug.split('-');
        
        if (type !== 'daily' && type !== 'personal') {
          throw new Error('잘못된 운세 타입입니다.');
        }

        // API에서 운세 데이터 가져오기
        const response = await fetch('/api/fortune/daily', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            date,
            seed,
            slug
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '운세 데이터를 가져오는데 실패했습니다.');
        }

        if (data.success) {
          setFortuneData({
            fortuneText: data.fortuneText,
            keywords: data.keywords,
            date: data.date,
            type: data.type,
            userName: data.userName
          });
        } else {
          throw new Error(data.error || '운세 데이터를 가져오는데 실패했습니다.');
        }
      } catch (err) {
        console.error('운세 데이터 가져오기 에러:', err);
        setError(err instanceof Error ? err.message : '운세 데이터를 가져오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchFortuneData();
    }
  }, [slug]);

  const handleShare = async (platform: "twitter" | "copy") => {
    if (!fortuneData) return;

    const shareUrl = `${window.location.origin}/fortune/daily/${slug}`;
    const text = `🔮 ${fortuneData.type === 'personal' ? `${fortuneData.userName}님의 ` : ''}오늘의 부동산 운세\n\n${fortuneData.fortuneText}\n\n#부동산운세 #오늘의운세 #RealE`;

    switch (platform) {
      case "twitter":
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank');
        break;
      case "copy":
        navigator.clipboard.writeText(`${text}\n\n링크: ${shareUrl}`);
        alert("링크가 복사되었습니다!");
        break;
    }
  };

  if (loading) {
    return (
      <div className="fortune-page">
        <div className="fortune-container">
          <div className="fortune-loading">
            <div className="fortune-spinner"></div>
            <p>🔮 운세를 불러오고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !fortuneData) {
    return (
      <div className="fortune-page">
        <div className="fortune-container">
          <div className="fortune-error">
            <h2>❌ 오류가 발생했습니다</h2>
            <p>{error || '운세 데이터를 찾을 수 없습니다.'}</p>
            <button 
              className="fortune-btn primary"
              onClick={() => window.location.href = '/fortune/search'}
            >
              ← 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fortune-page">
      <div className="fortune-container">
        <header className="fortune-header">
          <h1>
            {fortuneData.type === 'personal' 
              ? `👤 ${fortuneData.userName}님의 오늘의 운세`
              : '🌟 오늘의 운세'
            }
          </h1>
          <p className="fortune-date">{fortuneData.date}</p>
        </header>

        <div className="fortune-result">
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
                onClick={() => handleShare("twitter")}
              >
                <span>🐦</span>
                <span>트위터</span>
              </button>
              
              <button
                className="fortune-share-btn copy"
                onClick={() => handleShare("copy")}
              >
                <span>📋</span>
                <span>링크 복사</span>
              </button>
            </div>
          </div>

          <div className="fortune-disclaimer">
            ⚠️ 본 콘텐츠는 오직 재미용으로 제공되며 실제 투자 및 매매 판단과는 무관합니다.
          </div>
        </div>

        <div className="fortune-back">
          <button 
            className="fortune-btn secondary"
            onClick={() => window.location.href = '/fortune/search'}
          >
            ← 다른 운세 보기
          </button>
        </div>
      </div>
    </div>
  );
}
