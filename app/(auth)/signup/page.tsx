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
      // 안전장치: 네트워크 지연/행 상태 방지 (최대 25초)
      const timeoutMs = 25000;
      const timeoutPromise = new Promise<{ error: any }>((_, reject) =>
        setTimeout(() => reject(new Error("요청이 지연되고 있어요. 잠시 후 다시 시도해 주세요.")), timeoutMs)
      );
      const signUpPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/signin?from=signup`
        },
      });
      const { data: signUpData, error: signUpError } = await Promise.race([signUpPromise, timeoutPromise]) as { data: any; error: any };
      
      // 데이터베이스 오류가 발생한 경우 재시도 로직
      if (signUpError) {
        const errorMessage = signUpError.message || signUpError.toString();
        console.warn("Signup error:", errorMessage);
        
        // "Database error saving new user" 오류인 경우 여러 번 재시도
        if (errorMessage.includes("Database error saving new user")) {
          console.log("Database error detected, attempting multiple retries...");
          
          let retrySuccess = false;
          const maxRetries = 3;
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`Retry attempt ${attempt}/${maxRetries}`);
            
            // 점진적 대기 시간 (1초, 2초, 3초)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            
            try {
              // 재시도 (이메일 인증 사용)
              const retryResult = await supabase.auth.signUp({
                email,
                password,
                options: {
                  emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/signin?from=signup`
                }
              });
              
              if (!retryResult.error) {
                console.log(`Retry attempt ${attempt} successful!`);
                retrySuccess = true;
                
                // user_plan 수동 생성 시도
                try {
                  const fixResponse = await fetch('/api/user/fix-signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                  });
                  
                  if (fixResponse.ok) {
                    console.log("User plan created successfully");
                  } else {
                    console.warn("Failed to create user plan, but signup succeeded");
                  }
                } catch (fixError) {
                  console.warn("Fix signup API error:", fixError);
                }
                
                setInfo("회원가입이 완료되었습니다! 이메일을 확인하여 인증을 완료해 주세요.");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setAgree(false);
                setTimeout(() => {
                  router.replace("/signin?from=signup");
                }, 4000);
                return;
              } else {
                console.warn(`Retry attempt ${attempt} failed:`, retryResult.error.message);
              }
              
            } catch (retryError) {
              console.warn(`Retry attempt ${attempt} error:`, retryError);
            }
          }
          
          // 모든 재시도 실패 - Admin API로 최종 시도
          if (!retrySuccess) {
            console.log("All retries failed, trying admin API...");
            
            try {
              const adminResponse = await fetch('/api/auth/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              });
              
              const adminResult = await adminResponse.json();
              
              if (adminResponse.ok && adminResult.success) {
                console.log("Admin API successful:", adminResult);
                setInfo("회원가입이 완료되었습니다! 이메일을 확인하여 인증을 완료해 주세요.");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setAgree(false);
                setTimeout(() => {
                  router.replace("/signin?from=signup");
                }, 4000);
                return;
              } else {
                console.error("Admin API failed:", adminResult);
                setError("회원가입 중 일시적인 문제가 발생했습니다. 다른 이메일 주소로 시도해 보시거나 잠시 후 다시 시도해 주세요.");
                return;
              }
            } catch (adminError) {
              console.error("Admin API error:", adminError);
              setError("회원가입 중 일시적인 문제가 발생했습니다. 다른 이메일 주소로 시도해 보시거나 잠시 후 다시 시도해 주세요.");
              return;
            }
          }
        }
        
        // 다른 오류는 그대로 처리
        throw signUpError;
      }
      
      // 정상적인 성공 케이스
      // user_plan 수동 생성 시도
      try {
        const fixResponse = await fetch('/api/user/fix-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        
        if (fixResponse.ok) {
          console.log("User plan created successfully");
        } else {
          console.warn("Failed to create user plan, but signup succeeded");
        }
      } catch (fixError) {
        console.warn("Fix signup API error:", fixError);
      }
      
      setInfo("회원가입이 완료되었습니다! 바로 로그인하실 수 있습니다.");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setAgree(false);
      setTimeout(() => {
        router.replace("/signin?from=signup");
      }, 2000);
    } catch (err: any) {
      const raw = err?.message ?? "회원가입에 실패했습니다.";
      // 친절한 한글 에러 메시지
      const lower = String(raw).toLowerCase();
      if (
        lower.includes("user already registered") ||
        lower.includes("already registered") ||
        lower.includes("already exists") ||
        lower.includes("repeated_signup")
      ) {
        setError("이미 가입된 계정입니다. 로그인하시거나 비밀번호를 재설정해 주세요.");
      } else if (
        lower.includes("email_address_invalid") ||
        lower.includes("email address") && lower.includes("invalid")
      ) {
        setError("유효하지 않은 이메일 주소입니다. 실제 사용 가능한 이메일 주소를 입력해 주세요.");
      } else {
        setError(raw);
      }
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
            회원가입을 처리 중입니다...
          </p>
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
        <div className="auth-divider">이미 계정이 있으신가요?</div>
        <Link className="auth-secondary" href="/signin">
          로그인
        </Link>
      </div>
    </div>
  );
}

