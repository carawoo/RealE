"use client";

import Link from "next/link";
import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

const CHAT_PREFIX = "/chat";

export default function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const onChatRoute = pathname?.startsWith(CHAT_PREFIX) ?? false;

  const goFreshChat = useCallback(() => {
    const timestamp = Date.now();
    router.replace(`/chat?fresh=${timestamp}`);
  }, [router]);

  return (
    <header className="global-nav">
      <Link className="brand" href="/">
        <img src="/realE-logo.png" alt="RealE" className="brand-logo" />
      </Link>
      <nav className="global-actions">
        {onChatRoute ? (
          <>
            <Link className="nav-btn ghost" href="/chat/share">
              대화 공유
            </Link>
            <button className="nav-btn primary" type="button" onClick={goFreshChat}>
              새 대화
            </button>
          </>
        ) : (
          <>
            <Link className="nav-btn ghost" href="/faq">
              FAQ
            </Link>
            <button className="nav-btn primary" type="button" onClick={goFreshChat}>
              상담 시작
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
