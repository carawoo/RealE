// app/blog/page.tsx
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import "../global.css";
import "./blog.css";


// 블로그 포스트 데이터
const blogPosts = [
  {
    id: "loan-scenarios-2025",
    title: "2025년 부동산 대출 시나리오 완벽 가이드",
    excerpt: "2025년 새롭게 변화한 대출 정책과 금리 환경을 반영한 최적의 대출 전략을 제시합니다. 최대 한도형, 안전 상환형, 정책 활용형 대출의 장단점을 상세히 분석하고, 현재 시장 상황에 맞는 최적의 선택 방법을 알려드립니다.",
    category: "대출 가이드",
    date: "2025-01-15",
    readTime: "8분",
    image: "/images/blog/loan-scenarios-2025.jpg",
    featured: true
  },
  {
    id: "policy-loans-comparison-2025",
    title: "디딤돌대출 vs 보금자리론 2025년 최신 비교 분석",
    excerpt: "2025년 새롭게 개편된 정책자금 대출 조건을 반영한 디딤돌대출과 보금자리론의 상세 비교 분석입니다. 생애최초 주택구입자를 위한 두 가지 주요 정책자금 대출의 최신 조건과 개인 상황별 최적 선택 기준을 제시합니다.",
    category: "정책 분석",
    date: "2025-01-12",
    readTime: "6분",
    image: "/images/blog/policy-loans-comparison-2025.jpg",
    featured: false
  },
  {
    id: "freelancer-income-proof-2025",
    title: "프리랜서도 대출 받을 수 있다! 2025년 소득증명 완벽 가이드",
    excerpt: "2025년 강화된 대출 심사 기준에 맞춘 프리랜서와 자영업자를 위한 소득증명 방법과 대출 승인률을 높이는 실전 노하우를 공유합니다. 최신 금융권 심사 기준과 승인 사례를 바탕으로 한 실용적인 가이드입니다.",
    category: "소득증명",
    date: "2025-01-10",
    readTime: "10분",
    image: "/images/blog/freelancer-income-proof-2025.jpg",
    featured: false
  },
  {
    id: "ltv-dsr-calculations-2025",
    title: "LTV와 DSR 계산법 2025년 최신 기준 완벽 이해",
    excerpt: "2025년 새롭게 변경된 LTV와 DSR 기준을 반영한 부동산 대출의 핵심 지표 계산 방법과 기준을 쉽게 설명하고, 실제 사례로 연습해봅니다. 최신 정책 변화와 금융권 기준을 모두 반영한 실용적인 가이드입니다.",
    category: "대출 기초",
    date: "2025-01-08",
    readTime: "7분",
    image: "/images/blog/ltv-dsr-calculations-2025.jpg",
    featured: false
  },
  {
    id: "real-estate-market-2025",
    title: "2025년 부동산 시장 전망과 투자 전략",
    excerpt: "2025년 부동산 시장의 주요 이슈와 투자 포인트를 분석하고, 신중한 투자를 위한 조언을 제공합니다. 최근 정책 변화와 시장 동향을 반영한 실전 투자 전략과 주의사항을 상세히 다룹니다.",
    category: "시장 분석",
    date: "2025-01-05",
    readTime: "12분",
    image: "/images/blog/real-estate-market-2025.jpg",
    featured: true
  },
  {
    id: "interior-design-trends-2025",
    title: "2025년 인테리어 트렌드와 집값 상승 요인",
    excerpt: "2025년 최신 인테리어 트렌드가 부동산 가격에 미치는 영향과 투자 가치를 높이는 인테리어 요소들을 소개합니다. 최근 부동산 시장에서 주목받는 인테리어 트렌드와 실제 집값 상승 사례를 분석합니다.",
    category: "인테리어",
    date: "2025-01-03",
    readTime: "9분",
    image: "/images/blog/interior-design-trends-2025.jpg",
    featured: false
  },
  {
    id: "new-town-investment-2025",
    title: "2025년 신도시 투자 전략과 핫스팟 분석",
    excerpt: "2025년 새롭게 주목받는 신도시 개발 지역과 투자 포인트를 상세히 분석합니다. 교통 인프라 확충과 정부 정책을 바탕으로 한 투자 전략과 주의사항을 제시합니다.",
    category: "시장 분석",
    date: "2025-01-20",
    readTime: "11분",
    image: "/images/blog/new-town-investment-2025.jpg",
    featured: false
  },
  {
    id: "mortgage-rate-forecast-2025",
    title: "2025년 주택담보대출 금리 전망과 대응 전략",
    excerpt: "2025년 주택담보대출 금리 동향과 전망을 분석하고, 금리 변동에 대비한 대출 전략을 제시합니다. 고금리 시대에 맞는 대출 상품 선택과 상환 방법을 상세히 안내합니다.",
    category: "대출 가이드",
    date: "2025-01-18",
    readTime: "9분",
    image: "/images/blog/mortgage-rate-forecast-2025.jpg",
    featured: false
  },
  {
    id: "real-estate-tax-2025",
    title: "2025년 부동산 세금 정책 변화와 절세 전략",
    excerpt: "2025년 새롭게 변경된 부동산 관련 세금 정책과 절세 방법을 상세히 안내합니다. 양도소득세, 종합부동산세, 취득세 등 주요 세금의 변화와 실전 절세 노하우를 공유합니다.",
    category: "정책 분석",
    date: "2025-01-16",
    readTime: "13분",
    image: "/images/blog/real-estate-tax-2025.jpg",
    featured: false
  },
  {
    id: "commercial-real-estate-2025",
    title: "2025년 상업용 부동산 투자 기회와 리스크",
    excerpt: "2025년 상업용 부동산 시장의 투자 기회와 주의사항을 분석합니다. 오피스, 상가, 물류시설 등 각 유형별 투자 포인트와 시장 전망을 상세히 다룹니다.",
    category: "시장 분석",
    date: "2025-01-14",
    readTime: "10분",
    image: "/images/blog/commercial-real-estate-2025.jpg",
    featured: false
  }
];

const categories = ["전체", "대출 가이드", "정책 분석", "소득증명", "대출 기초", "시장 분석", "인테리어"];

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState("전체");

  useEffect(() => {
    document.title = "부동산 블로그 - RealE";
  }, []);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };

  const filteredPosts = selectedCategory === "전체" 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);

  return (
    <main className="blog-page">
      <div className="blog-container">
        <header className="blog-header">
          <h1>📚 부동산 블로그</h1>
          <p>부동산 대출, 정책, 투자에 대한 전문적인 정보와 최신 뉴스를 제공합니다.</p>
        </header>

        {/* 카테고리 필터 */}
        <div className="blog-categories">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-btn ${selectedCategory === category ? "active" : ""}`}
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* 추천 포스트 */}
        <section className="featured-posts">
          <h2>⭐ 추천 포스트</h2>
          <div className="featured-grid">
            {filteredPosts.filter(post => post.featured).map((post) => (
              <article key={post.id} className="featured-card">
                <div className="post-image">
                  <img src={post.image} alt={post.title} />
                  <div className="post-category">{post.category}</div>
                </div>
                <div className="post-content">
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                <div className="post-meta">
                  <span className="post-read-time">{post.readTime} 읽기</span>
                </div>
                  <Link href={`/blog/${post.id}`} className="read-more-btn">
                    자세히 보기 →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 전체 포스트 목록 */}
        <section className="all-posts">
          <h2>📖 {selectedCategory === "전체" ? "모든" : selectedCategory} 포스트</h2>
          <div className="posts-grid">
            {filteredPosts.map((post) => (
              <article key={post.id} className="post-card">
                <div className="post-image">
                  <img src={post.image} alt={post.title} />
                  <div className="post-category">{post.category}</div>
                </div>
                <div className="post-content">
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                <div className="post-meta">
                  <span className="post-read-time">{post.readTime} 읽기</span>
                </div>
                  <Link href={`/blog/${post.id}`} className="read-more-btn">
                    자세히 보기 →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 뉴스레터 구독 섹션 */}
        <section className="blog-newsletter">
          <div className="newsletter-card">
            <h3>📰 부동산 뉴스레터 구독</h3>
            <p>매주 부동산 시장 동향과 유용한 정보를 이메일로 받아보세요.</p>
            <div className="newsletter-form">
              <button 
                className="subscribe-btn"
                onClick={() => window.open("https://ziply-nine.vercel.app/newsletter", "_blank")}
              >
                구독하기
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
