"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import "../(auth)/auth.css";
import "./account.css";

export default function AccountPage() {
  const router = useRouter();
  const { user, supabase, loading, signOut, session } = useAuth();
  const [proActive, setProActive] = useState(false);
  const [proUntil, setProUntil] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteDone, setDeleteDone] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin?redirect=/account");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const pa = window.localStorage.getItem("reale:proAccess");
      const untilRaw = window.localStorage.getItem("reale:proAccessUntil");
      if (pa === "1") setProActive(true);
      if (untilRaw) {
        const v = Number(untilRaw);
        if (Number.isFinite(v)) setProUntil(v);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // 서버 DB의 플랜을 읽어 로컬 상태/스토리지에 동기화
    async function syncPlanFromDB() {
      if (!supabase || !user) return;
      try {
        // 1) 우선 user_plan_readonly를 user_id로 조회
        let plan: boolean | null = null;
        let until: string | null = null;

        // 탈퇴한 사용자 상태를 정확히 반영하기 위해 API만 사용
        const res = await fetch("/api/user/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, email: user.email }),
        });
        const data = await res.json();
        console.log("Plan API Response:", data); // 디버깅용 로그
        if (res.ok && data) {
          const inferredPlan = typeof data.plan === "boolean" ? data.plan : false;
          const isPro = data?.plan_label === "pro";
          const untilMs = data?.pro_until ? new Date(data.pro_until).getTime() : null;
          
          // API에서 null을 반환하면 무료 플랜으로 처리
          if (data.plan === null) {
            window.localStorage.setItem("reale:proAccess", "0");
            window.localStorage.removeItem("reale:proAccessUntil");
            setProActive(false);
            setProUntil(null);
          } else if (inferredPlan || isPro) {
            window.localStorage.setItem("reale:proAccess", "1");
            if (untilMs) window.localStorage.setItem("reale:proAccessUntil", String(untilMs));
            setProActive(true);
            setProUntil(untilMs);
          } else {
            window.localStorage.setItem("reale:proAccess", "0");
            window.localStorage.removeItem("reale:proAccessUntil");
            setProActive(false);
            setProUntil(null);
          }
        } else {
          // API 오류 시 무료 플랜으로 처리
          window.localStorage.setItem("reale:proAccess", "0");
          window.localStorage.removeItem("reale:proAccessUntil");
          setProActive(false);
          setProUntil(null);
        }
        }
      } catch (e) {
        // 무시: 권한/테이블 부재 등은 UI에 영향을 주지 않음
      }
    }

    syncPlanFromDB();
    // 탭 활성화 시 재동기화
    function onFocus() {
      syncPlanFromDB();
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
      return () => window.removeEventListener("focus", onFocus);
    }
  }, [supabase, user]);

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    if (newPassword.length < 8) {
      setPasswordError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }
      setPasswordMessage("비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호로 접속해 주세요.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err?.message ?? "비밀번호 변경에 실패했습니다.");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (!session?.access_token) {
      setDeleteError("세션이 만료되었습니다. 다시 로그인해 주세요.");
      return;
    }
    if (!confirm("정말 탈퇴하시겠어요? 탈퇴 시 상담 기록 및 이용자의 개인정보가 삭제됩니다.")) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/auth/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "탈퇴 처리에 실패했습니다.");
      }
      setDeleteDone(true);
      await signOut();
      router.replace("/signin");
    } catch (err: any) {
      setDeleteError(err?.message ?? "탈퇴 처리에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  async function startCheckout() {
    if (checkoutLoading) return;
    if (!user) {
      router.replace("/signin?redirect=/account");
      return;
    }
    setCheckoutLoading(true);
    setPaymentError(null);
    try {
      const res = await fetch("/api/kakaopay/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemName: "RealE Plus", amount: 3900 }),
      });
      const data = await res.json();
      if (!res.ok || !data) throw new Error(data?.error || "결제 준비에 실패했어요.");
      if (typeof data.url === "string" && data.url.length > 0) {
        window.location.href = data.url;
        return;
      }
      throw new Error("결제 페이지로 이동하지 못했어요.");
    } catch (err: any) {
      setPaymentError(err?.message || "결제 준비 중 문제가 발생했어요.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="auth-shell" style={{ marginTop: 24 }}>
      <div className="auth-card">
        <div>
          <h1>계정 설정</h1>
          <p>RealE 계정을 관리하고 비밀번호를 변경할 수 있습니다.</p>
        </div>
        <section className="auth-section">
          <h2 style={{ margin: 0, fontSize: 18 }}>이용 상태</h2>
          {proActive ? (
            <div>
              <p style={{ margin: "6px 0 0", color: "#056449", fontWeight: 600 }}>
                RealE {proActive ? "Pro" : "Plus"} 이용 중
                {proUntil ? (
                  <> — 만료 예정: {new Date(proUntil).toLocaleDateString("ko-KR")}</>
                ) : (
                  <> — 무제한 이용</>
                )}
              </p>
              <p style={{ margin: "4px 0 0", color: "#5f6368", fontSize: 14 }}>
                일일 질문 한도 30회
                {!proUntil && (
                  <><br />만료일 정보가 없습니다. 문의가 필요하시면 2025reale@gmail.com으로 연락해 주세요.</>
                )}
              </p>
            </div>
          ) : (
            <div>
              <p style={{ margin: "6px 0 12px", color: "#3c4043" }}>
                RealE 체험(무료 5회 질문) 사용 중입니다. 결제 후 Plus(30일, 일일 30회)로 이용할 수 있어요.
              </p>
              <button className="auth-primary" type="button" onClick={startCheckout} disabled={checkoutLoading}>
                {checkoutLoading ? "결제 준비 중..." : "3,900원에 RealE Plus 시작"}
              </button>
              {paymentError && <p className="auth-error" style={{ marginTop: 8 }}>{paymentError}</p>}
            </div>
          )}
          {proActive && (
            <div style={{ marginTop: 12 }}>
              <p style={{ margin: "6px 0 12px", color: "#3c4043" }}>
                Pro 플랜을 이용 중입니다. 추가 문의사항이 있으시면 2025reale@gmail.com으로 연락해 주세요.
              </p>
            </div>
          )}
        </section>
        <section className="auth-section">
          <h2 style={{ margin: 0, fontSize: 18 }}>기본 정보</h2>
          <p style={{ margin: "4px 0 0", color: "#3c4043" }}>이메일: {user.email}</p>
        </section>
        <section className="auth-section">
          <h2 style={{ margin: 0, fontSize: 18 }}>비밀번호 변경</h2>
          {passwordError && <p className="auth-error">{passwordError}</p>}
          {passwordMessage && <p className="auth-success">{passwordMessage}</p>}
          <form className="auth-form" onSubmit={handlePasswordChange}>
            <div className="auth-field">
              <label htmlFor="new-pass">새 비밀번호</label>
              <input
                id="new-pass"
                type="password"
                placeholder="8자 이상"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="confirm-pass">비밀번호 확인</label>
              <input
                id="confirm-pass"
                type="password"
                placeholder="비밀번호 재입력"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
            <button className="auth-primary" type="submit" disabled={passwordLoading}>
              {passwordLoading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        </section>
        <section className="auth-section account-danger">
          <h2 style={{ margin: 0, fontSize: 18, color: "#c5221f" }}>회원탈퇴</h2>
          <p style={{ margin: "6px 0 12px", color: "#5f6368" }}>
            탈퇴를 진행하면 상담 기록과 이용자의 개인정보가 모두 삭제됩니다.
          </p>
          {deleteError && <p className="auth-error">{deleteError}</p>}
          {deleteDone && <p className="auth-success">탈퇴가 완료되었습니다.</p>}
          <button className="auth-secondary" type="button" onClick={handleDeleteAccount} disabled={deleting}>
            {deleting ? "탈퇴 처리 중..." : "회원탈퇴"}
          </button>
        </section>
        <div className="auth-divider">다른 작업을 하시겠어요?</div>
        <div className="auth-actions">
          <Link className="auth-secondary" href="/chat">
            채팅으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

