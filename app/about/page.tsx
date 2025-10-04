// app/about/page.tsx
import Link from "next/link";
import "../global.css";
import "./about.css";

export const metadata = {
  title: "회사 소개 - RealE",
  description: "RealE는 부동산 대출 상담을 위한 AI 비서 서비스입니다. 전문가 수준의 상담과 정확한 정보를 제공합니다."
};

export default function AboutPage() {
  return (
    <main className="about-page">
      <div className="about-container">
        <header className="about-header">
          <p className="about-subtitle">
            부동산 대출 상담의 새로운 패러다임을 제시하는 AI 비서 서비스
          </p>
        </header>


        {/* 서비스 소개 */}
        <section className="service-introduction">
          <h2>🚀 서비스 소개</h2>
          <div className="service-cards">
            <div className="service-card">
              <div className="service-icon">🤖</div>
              <h3>AI 부동산 상담</h3>
              <p>
                GPT 기반의 고도화된 AI가 부동산, 금융, 인테리어 전문가 수준의 상담을 제공합니다. 
                24시간 언제든지 정확하고 신뢰할 수 있는 정보를 받아보세요.
              </p>
            </div>
            <div className="service-card">
              <div className="service-icon">💰</div>
              <h3>대출 시나리오 분석</h3>
              <p>
                최대 한도형, 안전 상환형, 정책 활용형 등 3가지 대출 시나리오를 AI가 분석하여 
                개인 상황에 맞는 최적의 대출 방안을 제시합니다.
              </p>
            </div>
            <div className="service-card">
              <div className="service-icon">🏛️</div>
              <h3>정책 프로그램 매칭</h3>
              <p>
                디딤돌대출, 보금자리론, 신생아 특례대출 등 다양한 정부 지원 프로그램을 
                자동으로 매칭하여 혜택을 놓치지 않도록 도와드립니다.
              </p>
            </div>
            <div className="service-card">
              <div className="service-icon">🔮</div>
              <h3>부동산 사주 & 운세</h3>
              <p>
                재미있는 부동산 운세와 매물별 사주를 AI가 생성하여 제공합니다. 
                SNS 공유 기능으로 친구들과 함께 즐겨보세요.
              </p>
            </div>
          </div>
        </section>

        {/* 핵심 가치 */}
        <section className="core-values">
          <h2>💎 핵심 가치</h2>
          <div className="values-grid">
            <div className="value-item">
              <div className="value-icon">🎯</div>
              <h3>정확성</h3>
              <p>최신 정책과 시장 정보를 바탕으로 정확한 상담을 제공합니다.</p>
            </div>
            <div className="value-item">
              <div className="value-icon">⚡</div>
              <h3>신속성</h3>
              <p>24시간 언제든지 즉시 상담을 받을 수 있습니다.</p>
            </div>
            <div className="value-item">
              <div className="value-icon">🔒</div>
              <h3>신뢰성</h3>
              <p>개인정보 보호와 데이터 보안을 최우선으로 합니다.</p>
            </div>
            <div className="value-item">
              <div className="value-icon">💡</div>
              <h3>혁신성</h3>
              <p>AI 기술을 활용한 새로운 부동산 상담 경험을 제공합니다.</p>
            </div>
          </div>
        </section>



        {/* 연혁 */}
        <section className="company-history">
          <h2>📅 연혁</h2>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-date">2025.09</div>
              <div className="timeline-content">
                <h3>오픈베타 서비스 시작</h3>
                <p>RealE AI 부동산 대출 상담 서비스 오픈베타 런칭</p>
              </div>
            </div>
          </div>
        </section>

        {/* 문의 및 연락처 */}
        <section className="contact-info">
          <h2>📞 문의 및 연락처</h2>
          <div className="contact-cards">
            <div className="contact-card">
              <div className="contact-icon">📧</div>
              <h3>이메일 문의</h3>
              <p>2025reale@gmail.com</p>
              <p className="contact-note">24시간 내 답변 드립니다</p>
            </div>
            <div className="contact-card">
              <div className="contact-icon">💬</div>
              <h3>실시간 상담</h3>
              <p>서비스 내 AI 상담</p>
              <p className="contact-note">24시간 이용 가능</p>
            </div>
          </div>
        </section>

        {/* CTA 섹션 */}
        <section className="about-cta">
          <div className="cta-content">
            <h2>🚀 지금 시작해보세요</h2>
            <p>RealE와 함께 스마트한 부동산 대출 상담을 경험해보세요</p>
            <div className="cta-buttons">
              <Link href="/chat" className="cta-btn primary">
                상담 시작하기
              </Link>
              <Link href="/product" className="cta-btn secondary">
                요금제 보기
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
