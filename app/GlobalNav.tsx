"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./providers/AuthProvider";

const CHAT_PREFIX = "/chat";

export default function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const onChatRoute = pathname?.startsWith(CHAT_PREFIX) ?? false;
  const { user, signOut, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const goFreshChat = useCallback(() => {
    const timestamp = Date.now();
    router.replace(`/chat?fresh=${timestamp}`);
  }, [router]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setMenuOpen(false);
  }, [signOut]);

  useEffect(() => {
    const updateMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  return (
    <header className="global-nav">
      <Link className="brand" href="/">
        <img src="/realE-logo.png" alt="RealE" className="brand-logo" />
      </Link>
      <nav className="global-actions">
        {isMobile ? (
          <>
            <button
              className="nav-menu-toggle"
              type="button"
              aria-expanded={menuOpen}
              aria-label="메뉴"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <svg className="nav-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
            <div className={`nav-menu${menuOpen ? " open" : ""}`}>
              {!onChatRoute && (
                <Link href="/faq" className="nav-menu__item" onClick={() => setMenuOpen(false)}>
                  FAQ
                </Link>
              )}
              {user ? (
                <>
                  <Link href="/account" className="nav-menu__item" onClick={() => setMenuOpen(false)}>
                    마이페이지
                  </Link>
                  <button type="button" className="nav-menu__item" onClick={handleSignOut}>
                    로그아웃
                  </button>
                </>
              ) : null}
              {onChatRoute && (
                <Link href="/chat/share" className="nav-menu__item" onClick={() => setMenuOpen(false)}>
                  대화 공유
                </Link>
              )}
            </div>
          </>
        ) : (
          <>
            {!onChatRoute && (
              <Link className="nav-btn ghost" href="/faq" aria-label="FAQ">
                <span className="nav-label">FAQ</span>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" />
                  <circle cx="12" cy="17" r="0.5" />
                </svg>
              </Link>
            )}
            {onChatRoute && (
              <Link className="nav-btn ghost" href="/chat/share" aria-label="대화 공유">
                <span className="nav-label">대화 공유</span>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </Link>
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
            ) : null}
          </>
        )}

        <button className="nav-btn primary" type="button" onClick={goFreshChat} aria-label={onChatRoute ? "새 대화" : "상담 시작"}>
          <span className="nav-label">{onChatRoute ? "새 대화" : "상담 시작"}</span>
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>

        {/* 로그인 버튼은 모바일/데스크톱 모두 메뉴 안에서만 노출 */}
      </nav>
    </header>
  );
}
