"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import "../auth.css";
export default function ForgotIdPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) {
      setError("가입한 이메일 주소를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      setInfo(`${email} 주소가 로그인 아이디입니다.
가입 시 입력한 이메일을 사용해 로그인하거나 비밀번호를 재설정해 주세요.`);
    } catch (err: any) {
      const message = err?.message ?? "아이디 조회에 실패했습니다.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div>
          <h1>아이디 찾기</h1>
          <p>가입한 이메일 주소를 입력하면 등록된 아이디를 안내해 드립니다.</p>
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
              {submitting ? "조회 중..." : "아이디 찾기"}
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

