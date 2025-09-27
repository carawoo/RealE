"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import "../auth.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenReady, setTokenReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const type = searchParams.get("type");
    if (type === "recovery") {
      setTokenReady(true);
    }
  }, [searchParams, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase 설정이 완료되지 않았습니다. 관리자에게 문의하세요.");
      return;
    }
    if (!tokenReady) {
      setError("재설정 링크가 올바르지 않습니다.");
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
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }
      setInfo("비밀번호가 변경되었습니다. 로그인 페이지로 이동합니다.");
      setTimeout(() => {
        router.replace("/signin?status=reset-success");
      }, 2500);
    } catch (err: any) {
      const message = err?.message ?? "비밀번호 변경에 실패했습니다.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div>
          <h1>비밀번호 재설정</h1>
          <p>새롭게 사용할 비밀번호를 입력하세요.</p>
        </div>
        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-success">{info}</p>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="password">새 비밀번호</label>
            <input
              id="password"
              type="password"
              placeholder="8자 이상"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
              required
            />
          </div>
          <div className="auth-actions">
            <button className="auth-primary" type="submit" disabled={submitting}>
              {submitting ? "변경 중..." : "비밀번호 변경"}
            </button>
          </div>
        </form>
        <div className="auth-divider">바로 로그인하시겠어요?</div>
        <Link className="auth-secondary" href="/signin">
          로그인 페이지로 이동
        </Link>
      </div>
    </div>
  );
}

