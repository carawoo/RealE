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
          <Link className="nav-btn" href="/product">
            요금제 살펴보기
          </Link>
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
      </div>
    </section>
  );
}