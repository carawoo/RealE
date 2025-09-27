"use client";

import Link from "next/link";
import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./providers/AuthProvider";

const CHAT_PREFIX = "/chat";

export default function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const onChatRoute = pathname?.startsWith(CHAT_PREFIX) ?? false;
  const { user, signOut, loading } = useAuth();

  const goFreshChat = useCallback(() => {
    const timestamp = Date.now();
    router.replace(`/chat?fresh=${timestamp}`);
  }, [router]);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  return (
    <header className="global-nav">
      <Link className="brand" href="/">
        <img src="/realE-logo.png" alt="RealE" className="brand-logo" />
      </Link>
      <nav className="global-actions">
        {onChatRoute ? (
          <>
            <Link className="nav-btn ghost" href="/chat/share" aria-label="대화 공유">
              <span className="nav-label">대화 공유</span>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </Link>
            <button className="nav-btn primary" type="button" onClick={goFreshChat} aria-label="새 대화">
              <span className="nav-label">새 대화</span>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <Link className="nav-btn ghost" href="/faq" aria-label="FAQ">
              <span className="nav-label">FAQ</span>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" />
                <circle cx="12" cy="17" r="0.5" />
              </svg>
            </Link>
            <button className="nav-btn primary" type="button" onClick={goFreshChat} aria-label="상담 시작">
              <span className="nav-label">상담 시작</span>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </>
        )}
        {loading ? null : user ? (
          <>
            <Link className="nav-btn ghost" href="/account" aria-label="마이페이지">
              <span className="nav-label">마이페이지</span>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-3.866 3.134-7 7-7h2c3.866 0 7 3.134 7 7" />
              </svg>
            </Link>
            <button className="nav-btn" type="button" onClick={handleSignOut} aria-label="로그아웃">
              <span className="nav-label">로그아웃</span>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </>
        ) : (
          <Link className="nav-btn ghost" href="/signin" aria-label="로그인">
            <span className="nav-label">로그인</span>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </Link>
        )}
      </nav>
    </header>
  );
}
