// app/fortune/search/page.tsx
// 부동산 사주 - 통합 페이지 (오늘의 운세 + 매물 검색)

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import FortuneButton from "../FortuneButton";
import DailyFortuneButton from "../DailyFortuneButton";
import "../fortune.css";
import "./search.css";

// 카카오 지도를 dynamic import로 불러오기 (SSR 비활성화)
const KakaoMap = dynamic(() => import("../../chat/KakaoMap"), { ssr: false });

interface SearchResult {
  id: string;
  name: string;
  type: string;
  price?: string;
  address: string;
  priceSource?: 'real' | 'estimated'; // 실거래가 or 예측가
}

export default function FortuneSearchPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'search'>('daily');
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError("검색어를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // 실제 카카오 로컬 API 호출
      const response = await fetch(`/api/fortune/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('검색 실패');
      }

      const data = await response.json();
      
      if (data.success && data.results) {
        setResults(data.results);
        console.log(`✅ ${data.count}개 결과 발견`);
      } else {
        throw new Error(data.error || '검색 결과가 없습니다.');
      }
    } catch (err) {
      console.error("검색 오류:", err);
      setError("검색 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 첫 번째 결과의 주소를 지도에 표시
  const mapAddress = results.length > 0 ? results[0].address : "";

  return (
    <main className="fortune-search-page">
      <div className="fortune-search-container">
        <header className="fortune-search-header">
          <h1>🔮 부동산 사주 & 운세</h1>
          <p>매일 다른 운세와 관심있는 건물의 사주를 확인해보세요!</p>
        </header>

        {/* 탭 네비게이션 */}
        <div className="fortune-tabs">
          <button
            className={`fortune-tab ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            🌟 오늘의 운세
          </button>
          <button
            className={`fortune-tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 매물 검색
          </button>
        </div>

        {/* 오늘의 운세 탭 */}
        {activeTab === 'daily' && (
          <div className="fortune-daily-tab">
            <div className="daily-fortune-card">
              <div className="daily-fortune-content">
                <h2>🌟 오늘의 운세</h2>
                <p>매일 다른 특별한 부동산 운세를 확인해보세요</p>
                <div className="daily-fortune-features">
                  <div className="feature-item">
                    <span className="feature-icon">🔮</span>
                    <span>일반 오늘의 운세</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">👤</span>
                    <span>개인화 운세</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📅</span>
                    <span>매일 자동 갱신</span>
                  </div>
                </div>
                <DailyFortuneButton
                  buttonClassName="daily-fortune-btn"
                  buttonText="오늘의 운세 보기"
                  showIcon={true}
                />
              </div>
              <div className="daily-fortune-image">
                <div className="fortune-crystal">
                  <div className="crystal-inner">🔮</div>
                </div>
              </div>
            </div>

            {/* 기능 소개 섹션 */}
            <div className="features-section">
              <h2>✨ 주요 기능</h2>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">🤖</div>
                  <h3>AI 기반 운세</h3>
                  <p>GPT를 활용한 정교한 부동산 운세 분석</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🎨</div>
                  <h3>타로 카드 이미지</h3>
                  <p>DALL-E로 생성한 신비로운 카드 이미지</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">📱</div>
                  <h3>SNS 공유</h3>
                  <p>카카오톡, 트위터 등으로 간편하게 공유</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">👤</div>
                  <h3>개인화 서비스</h3>
                  <p>이름과 생년월일 기반 맞춤형 운세</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">📅</div>
                  <h3>매일 갱신</h3>
                  <p>매일 다른 새로운 운세 콘텐츠</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🔗</div>
                  <h3>고유 URL</h3>
                  <p>공유 가능한 고유한 운세 링크 생성</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 매물 검색 탭 */}
        {activeTab === 'search' && (
          <div className="fortune-search-tab">
            <div className="fortune-search-box">
          <div className="search-input-group">
            <input
              type="text"
              className="search-input"
              placeholder="예: 강남구 역삼동, 래미안, 오피스텔, 상가"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <button
              className="search-btn"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? "검색 중..." : "검색"}
            </button>
          </div>

          {error && <p className="search-error">{error}</p>}

          <div className="search-examples">
            <p>추천 검색:</p>
            <div className="search-tags">
              <button onClick={() => setQuery("강남구 역삼동")}>강남구 역삼동</button>
              <button onClick={() => setQuery("마포구 상암동")}>마포구 상암동</button>
              <button onClick={() => setQuery("송파구 오피스텔")}>송파구 오피스텔</button>
              <button onClick={() => setQuery("서초구 빌라")}>서초구 빌라</button>
              <button onClick={() => setQuery("래미안")}>래미안</button>
            </div>
          </div>
        </div>

        {/* 카카오 지도 - 검색 결과가 있을 때만 표시 */}
        {results.length > 0 && mapAddress && (
          <div style={{ marginTop: '20px' }}>
            <KakaoMap 
              address={mapAddress}
              width="100%"
              height="400px"
              showProperties={false}
            />
          </div>
        )}

        {loading && (
          <div className="search-loading">
            <div className="search-spinner"></div>
            <p>검색 중...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="search-results">
            <h2>검색 결과 ({results.length})</h2>
            <div className="search-grid">
              {results.map((result) => (
                <div key={result.id} className="search-card">
                  <div className="search-card-header">
                    <h3>{result.name}</h3>
                    <span className="search-card-type">{result.type}</span>
                  </div>
                  <p className="search-card-address">📍 {result.address}</p>

                  <FortuneButton
                    propertyId={result.id}
                    propertyName={result.name}
                    propertyType={result.type}
                    propertyPrice={undefined}
                    propertyAddress={result.address}
                    buttonText="사주 보기 🔮"
                    buttonClassName="search-fortune-btn"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="search-empty">
            <p>🔍 검색 결과가 없습니다.</p>
            <p className="search-empty-sub">다른 지역이나 건물 이름으로 검색해보세요.</p>
          </div>
        )}

        <div className="fortune-search-info">
          <h3>💡 이렇게 검색해보세요</h3>
          <ul>
            <li><strong>지역으로 검색:</strong> "강남구 역삼동", "마포구 상암동"</li>
            <li><strong>건물 이름:</strong> "래미안", "푸르지오", "힐스테이트"</li>
            <li><strong>건물 타입:</strong> "오피스텔", "빌라", "상가"</li>
            <li><strong>동네로 검색:</strong> "잠실", "판교", "여의도"</li>
          </ul>
        </div>

            <div className="fortune-disclaimer-box">
              <p>※ 본 콘텐츠는 오직 재미용으로 제공되며 실제 투자 및 매매 판단과는 무관합니다.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
