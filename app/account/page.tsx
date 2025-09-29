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
            <p style={{ margin: "6px 0 0", color: "#056449", fontWeight: 600 }}>
              RealE Plus 이용 중 — {proUntil ? `만료 예정: ${new Date(proUntil).toLocaleDateString("ko-KR")}` : "만료일 정보 없음"}
              <br />일일 질문 한도 30회이며, 추가 필요 시 2025reale@gmail.com 으로 문의 주세요.
            </p>
          ) : (
            <p style={{ margin: "6px 0 0", color: "#3c4043" }}>
              RealE 체험(무료 5회 질문) 사용 중입니다. 결제 후 Plus(30일, 일일 30회)로 이용할 수 있어요.
            </p>
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

