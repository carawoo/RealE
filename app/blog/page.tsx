// app/blog/page.tsx
import Link from "next/link";
import "../global.css";
import "./blog.css";

export const metadata = {
  title: "부동산 블로그 - RealE",
  description: "부동산 대출, 정책, 투자에 대한 전문적인 정보와 최신 뉴스를 제공합니다."
};

// 블로그 포스트 데이터
const blogPosts = [
  {
    id: "loan-scenarios-2024",
    title: "2024년 부동산 대출 시나리오 완벽 가이드",
    excerpt: "최대 한도형, 안전 상환형, 정책 활용형 대출의 장단점을 상세히 분석하고, 현재 시장 상황에 맞는 최적의 선택 방법을 알려드립니다.",
    category: "대출 가이드",
    date: "2024-01-15",
    readTime: "8분",
    image: "https://placehold.co/400x250/6366F1/FFFFFF/png?text=대출+시나리오",
    featured: true
  },
  {
    id: "policy-loans-comparison",
    title: "디딤돌대출 vs 보금자리론, 어떤 것이 더 유리할까?",
    excerpt: "생애최초 주택구입자를 위한 두 가지 주요 정책자금 대출을 비교 분석하고, 개인 상황별 최적 선택 기준을 제시합니다.",
    category: "정책 분석",
    date: "2024-01-12",
    readTime: "6분",
    image: "https://placehold.co/400x250/8B5CF6/FFFFFF/png?text=정책+대출",
    featured: false
  },
  {
    id: "freelancer-income-proof",
    title: "프리랜서도 대출 받을 수 있다! 소득증명 완벽 가이드",
    excerpt: "프리랜서와 자영업자를 위한 소득증명 방법과 대출 승인률을 높이는 실전 노하우를 공유합니다.",
    category: "소득증명",
    date: "2024-01-10",
    readTime: "10분",
    image: "https://placehold.co/400x250/EC4899/FFFFFF/png?text=소득증명",
    featured: false
  },
  {
    id: "ltv-dsr-calculations",
    title: "LTV와 DSR 계산법, 이제 완벽하게 이해하자",
    excerpt: "부동산 대출의 핵심 지표인 LTV와 DSR의 계산 방법과 기준을 쉽게 설명하고, 실제 사례로 연습해봅니다.",
    category: "대출 기초",
    date: "2024-01-08",
    readTime: "7분",
    image: "https://placehold.co/400x250/10B981/FFFFFF/png?text=LTV+DSR",
    featured: false
  },
  {
    id: "real-estate-market-2024",
    title: "2024년 부동산 시장 전망과 투자 전략",
    excerpt: "올해 부동산 시장의 주요 이슈와 투자 포인트를 분석하고, 신중한 투자를 위한 조언을 제공합니다.",
    category: "시장 분석",
    date: "2024-01-05",
    readTime: "12분",
    image: "https://placehold.co/400x250/F59E0B/FFFFFF/png?text=시장+전망",
    featured: true
  },
  {
    id: "interior-design-trends",
    title: "2024년 인테리어 트렌드와 집값 상승 요인",
    excerpt: "최신 인테리어 트렌드가 부동산 가격에 미치는 영향과 투자 가치를 높이는 인테리어 요소들을 소개합니다.",
    category: "인테리어",
    date: "2024-01-03",
    readTime: "9분",
    image: "https://placehold.co/400x250/EF4444/FFFFFF/png?text=인테리어",
    featured: false
  }
];

const categories = ["전체", "대출 가이드", "정책 분석", "소득증명", "대출 기초", "시장 분석", "인테리어"];

export default function BlogPage() {
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
              className={`category-btn ${category === "전체" ? "active" : ""}`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* 추천 포스트 */}
        <section className="featured-posts">
          <h2>⭐ 추천 포스트</h2>
          <div className="featured-grid">
            {blogPosts.filter(post => post.featured).map((post) => (
              <article key={post.id} className="featured-card">
                <div className="post-image">
                  <img src={post.image} alt={post.title} />
                  <div className="post-category">{post.category}</div>
                </div>
                <div className="post-content">
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <div className="post-meta">
                    <span className="post-date">{post.date}</span>
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
          <h2>📖 모든 포스트</h2>
          <div className="posts-grid">
            {blogPosts.map((post) => (
              <article key={post.id} className="post-card">
                <div className="post-image">
                  <img src={post.image} alt={post.title} />
                  <div className="post-category">{post.category}</div>
                </div>
                <div className="post-content">
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <div className="post-meta">
                    <span className="post-date">{post.date}</span>
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
              <input type="email" placeholder="이메일 주소를 입력하세요" />
              <button className="subscribe-btn">구독하기</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
