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
    if (oauthError) {
      setSubmitting(false);
      setError(oauthError);
    }
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
      const message = err?.message ?? "로그인에 실패했습니다.";
      setError(message);
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
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
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
              <button
                type="button"
                className="oauth-button"
                onClick={() => handleOAuth("google")}
                disabled={submitting}
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
                Google 계정으로 로그인
              </button>
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
          <Link href="/forgot-id">아이디 찾기</Link>
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

