"use client";

import { Suspense, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import "../auth.css";

export const dynamic = "force-dynamic";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isKakaoInApp, setIsKakaoInApp] = useState(false);

  // 인앱 브라우저 감지 (KakaoTalk, LinkedIn, Facebook, Instagram 등)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      console.log('[SignIn] User-Agent:', userAgent);
      
      const isInAppBrowser = 
        userAgent.includes('kakaotalk') ||
        userAgent.includes('linkedin') ||
        userAgent.includes('fban') ||
        userAgent.includes('fbav') ||
        userAgent.includes('instagram') ||
        userAgent.includes('twitter') ||
        userAgent.includes('line') ||
        userAgent.includes('micromessenger');
      
      console.log('[SignIn] Is In-App Browser:', isInAppBrowser);
      setIsKakaoInApp(isInAppBrowser);
      
      if (isInAppBrowser) {
        setInfo("📱 앱 내 브라우저에서는 구글 로그인이 제한됩니다.\n💡 카카오 계정 또는 이메일 로그인을 사용하시거나, 우측 상단 메뉴에서 '외부 브라우저로 열기'를 선택해주세요.");
      }
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      const nextPath = searchParams.get("redirect") || "/chat";
      router.replace(nextPath);
    }
  }, [user, loading, router, searchParams]);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "reset-success") {
      setInfo("비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해 주세요.");
      return;
    }
    if (status === "confirm-success") {
      setInfo("이메일 인증이 완료되었습니다. 새 계정으로 로그인해 주세요.");
    }
  }, [searchParams]);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    const status = searchParams.get("status");
    if (!oauthError) return;
    // 일부 브라우저/리다이렉션에서 이메일 인증 완료 뒤에도
    // error=OAuth code missing 이 붙는 사례가 있어 안전하게 무시한다.
    if (oauthError === "OAuth code missing") {
      try {
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("error");
          window.history.replaceState(null, "", url.toString());
        }
      } catch {}
      setSubmitting(false);
      return;
    }
    if (status === "confirm-success") {
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setError(oauthError);
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase 설정이 완료되지 않았습니다. 관리자에게 문의하세요.");
      return;
    }
    if (!email || !password) {
      setError("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        throw signInError;
      }
      const nextPath = searchParams.get("redirect") || "/chat";
      router.replace(nextPath);
    } catch (err: any) {
      const code = err?.status ?? err?.code;
      if (code === "invalid_credentials" || err?.message === "Invalid login credentials") {
        setError("이메일 또는 비밀번호가 올바르지 않습니다. 다시 확인해 주세요.");
      } else if (code === "email_not_confirmed") {
        setError("이메일 인증이 완료되지 않았습니다. 메일함을 확인하거나 인증 메일을 다시 요청해 주세요.");
      } else if (code === 429) {
        setError("로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.");
      } else {
        const message = err?.message ?? "로그인에 실패했습니다.";
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOAuth(provider: "google" | "kakao") {
    if (!supabase) {
      setError("Supabase 설정이 완료되지 않았습니다. 관리자에게 문의하세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const nextPath = searchParams.get("redirect") || "/chat";
      const fallbackOrigin = process.env.NEXT_PUBLIC_SITE_URL;
      const origin = typeof window !== "undefined" ? window.location.origin : fallbackOrigin;
      if (!origin) {
        throw new Error("리다이렉트 URL을 구성하지 못했습니다. NEXT_PUBLIC_SITE_URL을 확인하세요.");
      }
      const redirectTo = `${origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const scopes = provider === "kakao" ? "account_email" : undefined;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          scopes,
        },
      });
      if (oauthError) {
        throw oauthError;
      }
    } catch (err: any) {
      const message = err?.message ?? "소셜 로그인에 실패했습니다.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div>
          <h1>로그인</h1>
          <p>RealE 상담을 이용하려면 계정으로 로그인해 주세요.</p>
        </div>
        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-success">{info}</p>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="auth-actions">
            <button className="auth-primary" type="submit" disabled={submitting}>
              {submitting ? "로그인 중..." : "로그인"}
            </button>
            <div className="oauth-buttons">
              {!isKakaoInApp && (
                <button
                  type="button"
                  className="oauth-button"
                  onClick={() => handleOAuth("google")}
                  disabled={submitting}
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
                  Google 계정으로 로그인
                </button>
              )}
              <button
                type="button"
                className="oauth-button"
                onClick={() => handleOAuth("kakao")}
                disabled={submitting}
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e3/KakaoTalk_logo.svg" alt="Kakao" />
                Kakao 계정으로 로그인
              </button>
            </div>
          </div>
        </form>
        <div className="auth-link-row">
          <Link href="/forgot-password">비밀번호 찾기</Link>
        </div>
        <div className="auth-divider">계정이 없으신가요?</div>
        <Link className="auth-secondary" href="/signup">
          회원가입
        </Link>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="auth-shell" /> }>
      <SignInContent />
    </Suspense>
  );
}

