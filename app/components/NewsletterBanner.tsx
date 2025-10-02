"use client";

import { useState, useEffect, useRef } from 'react';
import { useNews } from "../providers/NewsProvider";

interface NewsletterItem {
  category: string;
  title: string;
  link?: string;
  date?: string;
}

interface NewsletterData {
  items: NewsletterItem[];
  lastUpdated: string;
}

interface NewsletterBannerProps {
  variant?: 'full' | 'compact';
}

export default function NewsletterBanner({ variant = 'full' }: NewsletterBannerProps) {
  const { news: newsData, loading, error } = useNews();
  const [currentSlide, setCurrentSlide] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 자동 캐러셀 기능
  useEffect(() => {
    if (newsData.length <= 1) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % newsData.length);
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [newsData.length]);


  if (error) {
    return (
      <div className={`newsletter-banner ${variant === 'compact' ? 'newsletter-banner-small' : ''}`}>
        <div className={`newsletter-content ${variant === 'compact' ? 'newsletter-content-small' : ''}`}>
          <div className={`newsletter-icon ${variant === 'compact' ? 'newsletter-icon-small' : ''}`}>📰</div>
          <div className={`newsletter-text ${variant === 'compact' ? 'newsletter-text-small' : ''}`}>
            <h3>매일 아침 7:30, 부동산 뉴스레터</h3>
            <p>초보자와 신혼부부, 투자자를 위한 최신 부동산 뉴스를 정리해서 보내드려요</p>
            <div className="newsletter-empty">
              <div className="newsletter-empty-message">
                <p>뉴스 데이터를 불러오는 데 실패했습니다.</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
          <a href="https://ziply-nine.vercel.app/" target="_blank" rel="noopener noreferrer" className="newsletter-btn">0원으로 구독하기</a>
        </div>
      </div>
    );
  }

  return (
    <div className={`newsletter-banner ${variant === 'compact' ? 'newsletter-banner-small' : ''}`}>
      <div className={`newsletter-content ${variant === 'compact' ? 'newsletter-content-small' : ''}`}>
        <div className={`newsletter-icon ${variant === 'compact' ? 'newsletter-icon-small' : ''}`}>
          📰
        </div>
        <div className={`newsletter-text ${variant === 'compact' ? 'newsletter-text-small' : ''}`}>
          <h3>매일 아침 7:30, 부동산 뉴스레터</h3>
          <p>초보자와 신혼부부, 투자자를 위한 최신 부동산 뉴스를 정리해서 보내드려요</p>
          
          <div className="newsletter-carousel">
            
            {loading ? (
              <div style={{
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ fontSize: '16px', color: '#6c757d' }}>뉴스 로딩 중...</div>
              </div>
            ) : newsData.length > 0 ? (
              <div 
                style={{
                  height: '240px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e4e7eb',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => window.open("https://ziply-nine.vercel.app/", "_blank")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  e.currentTarget.style.transform = 'translateY(0px)';
                }}
              >
                {/* 뉴스 아이템 */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#1a73e8',
                    backgroundColor: '#f0f7ff',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    display: 'inline-block',
                    fontWeight: '600',
                    marginBottom: '12px',
                    border: '1px solid #e3f2fd'
                  }}>
                    {newsData[currentSlide]?.category || '뉴스'}
                  </div>
                  <div style={{
                    fontSize: '18px',
                    color: '#1f2933',
                    lineHeight: '1.4',
                    fontWeight: '600',
                    marginBottom: '12px'
                  }}>
                    {newsData[currentSlide]?.title || '뉴스 제목'}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#64748b',
                    lineHeight: '1.5',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {newsData[currentSlide]?.summary || '뉴스 요약 내용이 여기에 표시됩니다. 부동산 관련 최신 소식과 정책 변화를 빠르게 확인할 수 있습니다.'}
                  </div>
                </div>
                
                {/* 네비게이션 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // 뉴스 카드 클릭 방지
                      setCurrentSlide(Math.max(0, currentSlide - 1));
                    }}
                    disabled={currentSlide === 0}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '1px solid #e9ecef',
                      backgroundColor: currentSlide === 0 ? '#f8f9fa' : '#ffffff',
                      color: currentSlide === 0 ? '#adb5bd' : '#495057',
                      cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px'
                    }}
                  >
                    ←
                  </button>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {newsData.slice(0, Math.min(5, newsData.length)).map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation(); // 뉴스 카드 클릭 방지
                          setCurrentSlide(index);
                        }}
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          border: 'none',
                          backgroundColor: index === currentSlide ? '#1a73e8' : '#e9ecef',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // 뉴스 카드 클릭 방지
                      setCurrentSlide(Math.min(newsData.length - 1, currentSlide + 1));
                    }}
                    disabled={currentSlide === newsData.length - 1}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '1px solid #e9ecef',
                      backgroundColor: currentSlide === newsData.length - 1 ? '#f8f9fa' : '#ffffff',
                      color: currentSlide === newsData.length - 1 ? '#adb5bd' : '#495057',
                      cursor: currentSlide === newsData.length - 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px'
                    }}
                  >
                    →
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ fontSize: '16px', color: '#6c757d' }}>뉴스가 없습니다</div>
              </div>
            )}
          </div>
        </div>
        <a href="https://ziply-nine.vercel.app/" target="_blank" rel="noopener noreferrer" className="newsletter-btn">0원으로 구독하기</a>
      </div>
      
    </div>
  );
}