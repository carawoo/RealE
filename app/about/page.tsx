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
          <h1>🏢 RealE 회사 소개</h1>
          <p className="about-subtitle">
            부동산 대출 상담의 새로운 패러다임을 제시하는 AI 비서 서비스
          </p>
        </header>

        {/* 회사 개요 */}
        <section className="company-overview">
          <div className="overview-content">
            <h2>📋 회사 개요</h2>
            <div className="company-info">
              <div className="info-item">
                <h3>상호명</h3>
                <p>뚝딱컴퍼니</p>
              </div>
              <div className="info-item">
                <h3>대표자</h3>
                <p>김재환</p>
              </div>
              <div className="info-item">
                <h3>사업자등록번호</h3>
                <p>854-52-00876</p>
              </div>
              <div className="info-item">
                <h3>대표전화</h3>
                <p>010-2592-3007</p>
              </div>
              <div className="info-item">
                <h3>대표이메일</h3>
                <p>2025reale@gmail.com</p>
              </div>
              <div className="info-item">
                <h3>주소</h3>
                <p>경기도 안산시 단원구 광덕2로 17, 1316동 304호<br />(초지동, 그린빌주공13단지아파트)</p>
              </div>
            </div>
          </div>
        </section>

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

        {/* 기술 스택 */}
        <section className="technology-stack">
          <h2>🛠️ 기술 스택</h2>
          <div className="tech-categories">
            <div className="tech-category">
              <h3>Frontend</h3>
              <div className="tech-tags">
                <span className="tech-tag">Next.js 14</span>
                <span className="tech-tag">React 18</span>
                <span className="tech-tag">TypeScript</span>
                <span className="tech-tag">CSS Modules</span>
              </div>
            </div>
            <div className="tech-category">
              <h3>Backend</h3>
              <div className="tech-tags">
                <span className="tech-tag">Next.js API Routes</span>
                <span className="tech-tag">Supabase</span>
                <span className="tech-tag">OpenAI GPT</span>
                <span className="tech-tag">Stripe</span>
              </div>
            </div>
            <div className="tech-category">
              <h3>Infrastructure</h3>
              <div className="tech-tags">
                <span className="tech-tag">Vercel</span>
                <span className="tech-tag">PostgreSQL</span>
                <span className="tech-tag">Redis</span>
                <span className="tech-tag">CDN</span>
              </div>
            </div>
          </div>
        </section>

        {/* 팀 소개 */}
        <section className="team-introduction">
          <h2>👥 팀 소개</h2>
          <div className="team-content">
            <div className="team-member">
              <div className="member-avatar">👨‍💼</div>
              <div className="member-info">
                <h3>김재환 (대표)</h3>
                <p className="member-role">CEO & Founder</p>
                <p className="member-description">
                  부동산 금융 분야 10년 경력의 전문가로, AI 기술과 부동산 상담을 결합한 
                  혁신적인 서비스를 만들고 있습니다. 사용자 중심의 서비스 개발을 추구합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 연혁 */}
        <section className="company-history">
          <h2>📅 연혁</h2>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-date">2024.12</div>
              <div className="timeline-content">
                <h3>RealE 서비스 런칭</h3>
                <p>AI 기반 부동산 대출 상담 서비스 정식 출시</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-date">2024.11</div>
              <div className="timeline-content">
                <h3>베타 테스트 시작</h3>
                <p>제한된 사용자 대상 베타 서비스 운영</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-date">2024.10</div>
              <div className="timeline-content">
                <h3>기술 개발 완료</h3>
                <p>AI 모델 학습 및 서비스 플랫폼 구축</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-date">2024.09</div>
              <div className="timeline-content">
                <h3>회사 설립</h3>
                <p>뚝딱컴퍼니 법인 설립 및 사업자 등록</p>
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
              <div className="contact-icon">📱</div>
              <h3>전화 문의</h3>
              <p>010-2592-3007</p>
              <p className="contact-note">평일 09:00 - 18:00</p>
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
