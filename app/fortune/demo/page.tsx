// app/fortune/demo/page.tsx
// 부동산 사주 기능 데모 페이지

"use client";

import FortuneButton from "../FortuneButton";
import "../fortune.css";
import "./demo.css";

const SAMPLE_PROPERTIES = [
  {
    id: "prop-001",
    name: "강남역 트리플 스트리트 오피스텔",
    type: "오피스텔",
    price: "2억 5천만원",
    address: "서울시 강남구 역삼동",
    image: "https://placehold.co/400x300/6366F1/FFFFFF/png?text=강남역+오피스텔",
  },
  {
    id: "prop-002",
    name: "여의도 한강변 아파트",
    type: "아파트",
    price: "12억원",
    address: "서울시 영등포구 여의도동",
    image: "https://placehold.co/400x300/8B5CF6/FFFFFF/png?text=여의도+아파트",
  },
  {
    id: "prop-003",
    name: "판교 테크노밸리 상가",
    type: "상가",
    price: "3억 8천만원",
    address: "경기도 성남시 분당구 삼평동",
    image: "https://placehold.co/400x300/EC4899/FFFFFF/png?text=판교+상가",
  },
  {
    id: "prop-004",
    name: "제주 애월 펜션",
    type: "단독주택",
    price: "5억 2천만원",
    address: "제주특별자치도 제주시 애월읍",
    image: "https://placehold.co/400x300/10B981/FFFFFF/png?text=제주+펜션",
  },
];

export default function FortuneDemoPage() {
  return (
    <main className="demo-page">
      <div className="demo-container">
        <header className="demo-header">
          <h1>🔮 부동산 사주 데모</h1>
          <p>매물 카드에서 "사주 보기" 버튼을 클릭해보세요!</p>
          <p className="demo-subtitle">
            AI가 각 매물의 기운을 분석하여 재미있는 운세를 알려드립니다.
          </p>
          <div style={{ marginTop: "1rem" }}>
            <a href="/fortune/search" className="demo-search-link">
              🔍 내 위치/아파트로 사주 보기
            </a>
          </div>
        </header>

        <div className="demo-grid">
          {SAMPLE_PROPERTIES.map((property) => (
            <div key={property.id} className="demo-card">
              <div className="demo-card-image">
                <img src={property.image} alt={property.name} />
              </div>
              <div className="demo-card-content">
                <h3>{property.name}</h3>
                <div className="demo-card-meta">
                  <span className="demo-tag">{property.type}</span>
                  <span className="demo-price">{property.price}</span>
                </div>
                <p className="demo-address">📍 {property.address}</p>

                <div className="demo-card-actions">
                  <button className="demo-btn secondary">상세보기</button>
                  <FortuneButton
                    propertyId={property.id}
                    propertyName={property.name}
                    propertyType={property.type}
                    propertyPrice={property.price}
                    propertyAddress={property.address}
                    buttonClassName="demo-btn fortune"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="demo-integration">
          <h2>📦 통합 방법</h2>
          <div className="demo-code">
            <pre>{`import FortuneButton from "@/app/fortune/FortuneButton";

<FortuneButton
  propertyId="prop-001"
  propertyName="강남역 오피스텔"
  propertyType="오피스텔"
  propertyPrice="2억 5천만원"
  propertyAddress="서울시 강남구 역삼동"
/>`}</pre>
          </div>
        </div>

        <div className="demo-features">
          <h2>✨ 주요 기능</h2>
          <ul>
            <li>🤖 GPT 기반 부동산 운세 생성</li>
            <li>🎨 DALL-E 타로 카드 이미지 생성</li>
            <li>📱 카카오톡, 트위터, 링크 공유</li>
            <li>🔗 고유 공유 URL 생성</li>
            <li>📊 조회수 및 공유 횟수 추적</li>
            <li>👤 선택적 사용자 정보 입력 (이름, 생년월일)</li>
          </ul>
        </div>

        <div className="demo-disclaimer">
          <p>
            ⚠️ 본 콘텐츠는 오직 재미용으로 제공되며 실제 투자 및 매매 판단과는 무관합니다.
          </p>
        </div>
      </div>
    </main>
  );
}

