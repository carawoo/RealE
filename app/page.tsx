"use client";

import Link from "next/link";
import NewsletterBanner from "./components/NewsletterBanner";
import { useCallback } from "react";
import { useAuth } from "./providers/AuthProvider";
import "./home.css";

export default function Home() {
  const startFresh = useCallback(() => {
    const timestamp = Date.now();
    window.location.href = `/chat?fresh=${timestamp}`;
  }, []);

  const { user, loading } = useAuth();

  return (
    <section className="home-container">
      <div className="surface home-surface">
        <header className="home-hero">
          <h1>RealE 대화형 상담</h1>
          <p>
            부동산, 금융, 인테리어 상담을 하나의 AI 에이전트로 진행해 보세요. 
            새 상담을 시작하거나 기존 대화를 공유할 수 있습니다.
          </p>
        </header>
        <div className="home-actions">
          <button className="nav-btn primary" type="button" onClick={startFresh}>
            상담 시작하기
          </button>
          {/* <Link className="nav-btn" href="/product">
            요금제 살펴보기
          </Link> */}
          <Link className="nav-btn" href="/chat/share">
            최근 상담 공유하기
          </Link>
          {!loading && !user && (
            <Link className="nav-btn" href="/signin">
              로그인
            </Link>
          )}
          <Link className="nav-btn fortune-btn" href="/fortune/search">
            🔮 사주&오늘의운세
          </Link>
        </div>

        {/* Ziply Nine 뉴스레터 배너 */}
        <NewsletterBanner variant="full" />

        {/* 서비스 소개 섹션 */}
        <section className="service-intro">
          <h2>🏠 RealE가 제공하는 서비스</h2>
          <div className="service-grid">
            <div className="service-card">
              <div className="service-icon">💰</div>
              <h3>대출 시나리오 분석</h3>
              <p>최대 한도형, 안전 상환형, 정책 활용형 등 3가지 대출 시나리오를 AI가 분석하여 최적의 대출 방안을 제시합니다.</p>
              <ul>
                <li>월 상환액 계산 (원리금균등상환)</li>
                <li>총 이자 및 LTV/DSR 비율 분석</li>
                <li>정책 지원금 자동 매칭</li>
              </ul>
            </div>
            <div className="service-card">
              <div className="service-icon">🤖</div>
              <h3>AI 부동산 상담</h3>
              <p>부동산, 금융, 인테리어 전문가 수준의 상담을 24시간 언제든지 받을 수 있습니다.</p>
              <ul>
                <li>자연어 기반 질문 응답</li>
                <li>프리랜서 소득증명 상담</li>
                <li>금융기관 상담 연결 서비스</li>
              </ul>
            </div>
            <div className="service-card">
              <div className="service-icon">🔮</div>
              <h3>부동산 사주 & 운세</h3>
              <p>재미있는 부동산 운세와 매물별 사주를 AI가 생성하여 제공합니다.</p>
              <ul>
                <li>매일 다른 오늘의 운세</li>
                <li>매물별 맞춤 사주 분석</li>
                <li>SNS 공유 기능</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 지원 정책 프로그램 섹션 */}
        <section className="policy-programs">
          <h2>🏛️ 지원하는 정책 프로그램</h2>
          <div className="policy-grid">
            <div className="policy-item">
              <h3>디딤돌대출 (일반)</h3>
              <p>생애최초 주택구입자와 무주택자를 위한 정책자금 대출</p>
            </div>
            <div className="policy-item">
              <h3>보금자리론 (생애최초)</h3>
              <p>생애최초 주택구입자를 위한 장기 고정금리 대출</p>
            </div>
            <div className="policy-item">
              <h3>신생아 특례대출</h3>
              <p>신생아 출산 가구를 위한 특별 대출 혜택</p>
            </div>
            <div className="policy-item">
              <h3>다자녀 특례대출</h3>
              <p>다자녀 가구를 위한 추가 대출 혜택</p>
            </div>
          </div>
        </section>

        {/* 사용자 후기 */}
        <div className="user-reviews">
          <h2>💬 사용자 후기</h2>
          <div className="reviews-container">
            <div className="reviews-track">
              <div className="review-card">
                <div className="review-content">
                  "월소득과 자본금만 입력했는데 3가지 대출 시나리오를 한눈에 비교할 수 있어서 정말 유용했어요!"
                </div>
                <div className="review-author">김○○님 (30대, 신혼부부)</div>
              </div>
              <div className="review-card">
                <div className="review-content">
                  "프리랜서 소득증명 방법을 상세히 알려주셔서 대출 신청이 훨씬 수월해졌습니다."
                </div>
                <div className="review-author">이○○님 (20대, 프리랜서)</div>
              </div>
              <div className="review-card">
                <div className="review-content">
                  "부동산 사주 기능이 재미있고, 실제로 매물을 검색해서 사주를 볼 수 있어서 신기해요!"
                </div>
                <div className="review-author">박○○님 (40대, 투자자)</div>
              </div>
              {/* 복제된 카드들 (무한 스크롤을 위해) */}
              <div className="review-card">
                <div className="review-content">
                  "월소득과 자본금만 입력했는데 3가지 대출 시나리오를 한눈에 비교할 수 있어서 정말 유용했어요!"
                </div>
                <div className="review-author">김○○님 (30대, 신혼부부)</div>
              </div>
              <div className="review-card">
                <div className="review-content">
                  "프리랜서 소득증명 방법을 상세히 알려주셔서 대출 신청이 훨씬 수월해졌습니다."
                </div>
                <div className="review-author">이○○님 (20대, 프리랜서)</div>
              </div>
              <div className="review-card">
                <div className="review-content">
                  "부동산 사주 기능이 재미있고, 실제로 매물을 검색해서 사주를 볼 수 있어서 신기해요!"
                </div>
                <div className="review-author">박○○님 (40대, 투자자)</div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ 미리보기 섹션 */}
        <section className="faq-preview">
          <h2>❓ 자주 묻는 질문</h2>
          <div className="faq-preview-list">
            <div className="faq-preview-item">
              <h3>최소 몇 일 전에 신청해야 하나요?</h3>
              <p>잔금일 기준 2~3주 전 접수가 안전하고, 늦어도 1주(영업일) 전에는 서류·보증 확인까지 마쳐 두세요.</p>
            </div>
            <div className="faq-preview-item">
              <h3>디딤돌 vs 보금자리(특례) 뭐가 더 이득인가요?</h3>
              <p>장기 고정금리 안정성은 보금자리, 우대자격으로 더 낮을 수 있으면 디딤돌이 유리할 때가 많아요.</p>
            </div>
            <div className="faq-preview-item">
              <h3>체증식이 무조건 좋은가요?</h3>
              <p>원리금균등=예측 쉬움, 원금균등=총이자 적음, 체증식=초기 가벼움. 소득 증가 전망이 있으면 체증식 고려.</p>
            </div>
          </div>
          <div className="faq-link">
            <Link href="/faq" className="nav-btn">
              전체 FAQ 보기
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}