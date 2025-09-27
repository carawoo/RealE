"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/providers/AuthProvider";
import "../auth.css";

export default function ForgotPasswordPage() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase 설정이 완료되지 않았습니다. 관리자에게 문의하세요.");
      return;
    }
    if (!email) {
      setError("가입한 이메일 주소를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      if (!origin) {
        throw new Error("비밀번호 재설정 URL이 구성되지 않았습니다. NEXT_PUBLIC_SITE_URL을 설정해 주세요.");
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });
      if (resetError) {
        throw resetError;
      }
      setInfo("비밀번호 재설정 메일을 전송했습니다. 메일을 확인해 주세요.");
      setEmail("");
    } catch (err: any) {
      const message = err?.message ?? "메일 전송에 실패했습니다.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div>
          <h1>비밀번호 찾기</h1>
          <p>가입 시 사용한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.</p>
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
              required
            />
          </div>
          <div className="auth-actions">
            <button className="auth-primary" type="submit" disabled={submitting}>
              {submitting ? "전송 중..." : "재설정 메일 보내기"}
            </button>
          </div>
        </form>
        <div className="auth-divider">다시 로그인하시겠어요?</div>
        <Link className="auth-secondary" href="/signin">
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

