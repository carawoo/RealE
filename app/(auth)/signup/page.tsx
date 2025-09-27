"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import "../auth.css";

export default function SignUpPage() {
  const router = useRouter();
  const { supabase } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase 설정이 완료되지 않았습니다. 관리자에게 문의하세요.");
      return;
    }
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!agree) {
      setError("이용약관 및 개인정보 처리방침에 동의해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const fallbackOrigin = process.env.NEXT_PUBLIC_SITE_URL;
      const origin = typeof window !== "undefined" ? window.location.origin : fallbackOrigin;
      const nextPath = "/signin?status=confirm-success";
      const emailRedirectTo = origin ? `${origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}` : undefined;
      const signUpOptions = emailRedirectTo ? { emailRedirectTo } : undefined;
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: signUpOptions,
      });
      if (signUpError) {
        throw signUpError;
      }
      setInfo("가입 확인 메일을 전송했습니다. 메일의 링크를 눌러 로그인해 주세요.");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setAgree(false);
      setTimeout(() => {
        router.replace("/signin");
      }, 4000);
    } catch (err: any) {
      const message = err?.message ?? "회원가입에 실패했습니다.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div>
          <h1>회원가입</h1>
          <p>이메일과 비밀번호를 입력해 RealE 계정을 생성하세요.</p>
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
              placeholder="8자 이상"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="confirm">비밀번호 확인</label>
            <input
              id="confirm"
              type="password"
              placeholder="비밀번호 재입력"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#3c4043" }}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(event) => setAgree(event.target.checked)}
            />
            서비스 이용약관과 개인정보 처리방침에 동의합니다.
          </label>
          <div className="auth-actions">
            <button className="auth-primary" type="submit" disabled={submitting}>
              {submitting ? "가입 중..." : "가입하기"}
            </button>
          </div>
        </form>
        <div className="auth-divider">이미 계정이 있으신가요?</div>
        <Link className="auth-secondary" href="/signin">
          로그인
        </Link>
      </div>
    </div>
  );
}

