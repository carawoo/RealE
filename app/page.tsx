// app/page.tsx
import Link from "next/link";
import "./home.css";

export default function Home() {
  return (
    <main className="home">
      {/* 히어로 */}
      <section className="hero">
        <h1>
          내 집 마련 AI 비서, <span className="accent">RealE</span>
        </h1>
        <p className="lead">
          3분 입력 → 1분 결과. <br />지금 내 상황에 맞는 <b>대출 시나리오</b>와 <b>실행 타이밍</b>을 안내해 드려요.
        </p>

        <ul className="chips">
          <li>⚡ 실시간 정책·금리 반영</li>
          <li>🧩 시나리오 비교(최대/안전/정책)</li>
          <li>🔔 변경 알림 & 공유</li>
        </ul>
      </section>

      {/* 특징 */}
      <section className="features">
        <article className="card">
          <h3>맞춤 분석</h3>
          <p>
            소득·현금·부채·희망 형태를 입력하면
            <br /> LTV·DSR·월상환액을 자동 계산해요.
          </p>
        </article>
        <article className="card">
          <h3>정책까지 한 번에</h3>
          <p>
            정부·지자체 지원 조건을 자동 매칭하고
            <br /> 신청 링크도 바로 연결해요.
          </p>
        </article>
        <article className="card">
          <h3>기록 & 공유</h3>
          <p>
            결과를 저장해 두고, 링크로 지인/배우자와
            <br /> 쉽게 공유할 수 있어요.
          </p>
        </article>
      </section>

      {/* 사용 방법 */}
      <section id="how" className="how">
        <h2>어떻게 쓰나요?</h2>
        <ol className="steps">
          <li>
            <span className="num">1</span>
            <div>
              <b>고민을 적어요</b>
              <p>“전세 만기인데 매매가 나을까요?” 처럼 자연어로 자유롭게.</p>
            </div>
          </li>
          <li>
            <span className="num">2</span>
            <div>
              <b>상황 입력</b>
              <p>소득·보유금·희망가격·기간 등을 빠르게 체크.</p>
            </div>
          </li>
          <li>
            <span className="num">3</span>
            <div>
              <b>시나리오 비교</b>
              <p>최대 한도형 / 안전 상환형 / 정책 활용형을 한눈에.</p>
            </div>
          </li>
        </ol>

        {/* ✅ 섹션 하단 CTA (섹션 안 중앙 정렬) */}
        <div className="cta bottom">
          <Link href="/chat" className="btn primary lg">지금 상담 시작</Link>
        </div>
      </section>

      {/* ✅ 페이지 최하단: FAQ 버튼 + 저작권 */}
      <footer className="footer" style={{ gap: 12, flexDirection: "column" as const }}>
        <Link href="/faq" className="btn ghost lg" prefetch={false}>
          FAQ 보기
        </Link>
        <p>© {new Date().getFullYear()} RealE. 모든 권리 보유.</p>
      </footer>

      {/* ✅ 화면 하단 고정 플로팅 CTA (뷰포트 하단에 고정) */}
      <div className="cta-fixed" role="region" aria-label="빠른 시작">
        <div className="inner">
          <Link href="/chat" className="btn primary lg">지금 상담 시작</Link>
        </div>
      </div>
    </main>
  );
}