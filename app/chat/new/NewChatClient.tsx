"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "../chat.css";

const HISTORY_KEY = "reale:conversationHistory";
const ID_KEY = "reale:conversationId";
const FLAG_KEY = "reale:newConversation";

export default function NewChatClient() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.removeItem(HISTORY_KEY);
      window.localStorage.removeItem(ID_KEY);
      window.sessionStorage.setItem(FLAG_KEY, "1");
    } catch (error) {
      console.warn("Failed to reset conversation state", error);
    }

    const timer = window.setTimeout(() => {
      router.replace("/chat");
    }, 40);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <div className="surface" style={{ display: "grid", gap: 12 }}>
      <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>새 대화 준비 중...</h1>
      <p style={{ color: "#5f6368", margin: 0 }}>잠시만 기다려 주세요.</p>
    </div>
  );
}
