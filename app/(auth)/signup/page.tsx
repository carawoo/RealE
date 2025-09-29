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
  const [resending, setResending] = useState(false);
  const [resendProgress, setResendProgress] = useState<string | null>(null);

  async function resendSignupEmail(targetEmail: string) {
    if (!supabase) return;
    if (!targetEmail) return;
    setResending(true);
    setError(null);
    setInfo(null);
    try {
      const maxAttempts = 5;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        setResendProgress(`확인 메일 재전송 시도 중... (${attempt}/${maxAttempts})`);
        const { error: resendError } = await supabase.auth.resend({ type: "signup", email: targetEmail });
        if (!resendError) {
          setInfo("확인 메일을 재전송했습니다. 메일함(스팸함 포함)을 확인해 주세요.");
          setResendProgress(null);
          return;
        }
        // 지연 후 재시도 (2,4,8,16s ...)
        const delayMs = Math.min(16000, 2000 * Math.pow(2, attempt - 1));
        await new Promise((r) => setTimeout(r, delayMs));
      }
      setError("확인 메일 재전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setResending(false);
      setResendProgress(null);
    }
  }

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
      // 안전장치: 네트워크 지연/행 상태 방지 (최대 25초)
      const timeoutMs = 25000;
      const timeoutPromise = new Promise<{ error: any }>((_, reject) =>
        setTimeout(() => reject(new Error("요청이 지연되고 있어요. 잠시 후 다시 시도해 주세요.")), timeoutMs)
      );
      const signUpPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: origin ? `${origin}/api/auth/callback?next=${encodeURIComponent("/signin")}` : undefined,
        },
      });
      const { error: signUpError } = await Promise.race([signUpPromise, timeoutPromise]) as { error: any };
      if (signUpError) {
        // 일부 환경에서 이메일 발송 단계에서 타임아웃이 날 수 있어 자동 재전송을 시도
        await resendSignupEmail(email);
        if (!info) {
          throw signUpError;
        }
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
        {!error && submitting && (
          <p className="auth-info" style={{ color: "#5f6368", marginTop: 6 }}>
            요청을 처리 중입니다. 25초 이상 지연되면 연결 상태를 확인하고 다시 시도해 주세요.
          </p>
        )}
        {resendProgress && (
          <p className="auth-info" style={{ color: "#5f6368", marginTop: 6 }}>{resendProgress}</p>
        )}
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
        <div className="auth-actions" style={{ marginTop: 8 }}>
          <button
            className="auth-secondary"
            type="button"
            onClick={() => resendSignupEmail(email)}
            disabled={resending || !email}
          >
            {resending ? "확인 메일 재전송 중..." : "확인 메일 다시 보내기"}
          </button>
        </div>
        <div className="auth-divider">이미 계정이 있으신가요?</div>
        <Link className="auth-secondary" href="/signin">
          로그인
        </Link>
      </div>
    </div>
  );
}

