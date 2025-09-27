"use client";

import { useCallback, useEffect, useState } from "react";
import "../chat.css";

type Message = { role: "user" | "assistant"; content: string };

type ShareState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

const STORAGE_KEY = "reale:conversationHistory";
const ARCHIVE_KEY = "reale:lastConversationHistory";

export default function ChatSharePage() {
  const [state, setState] = useState<ShareState>({ status: "idle" });
  const [history, setHistory] = useState<Message[]>(() => []);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (text: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn("copy failed", error);
    }
  }, []);

  const loadHistory = useCallback(() => {
    if (typeof window === "undefined") return [];
    const readHistory = () => {
      const archive = window.localStorage.getItem(ARCHIVE_KEY);
      if (archive) return archive;
      return window.localStorage.getItem(STORAGE_KEY);
    };

    try {
      const raw = readHistory();
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is Message =>
          item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string"
        );
      }
      return [];
    } catch (error) {
      console.warn("Failed to parse conversation history", error);
      return [];
    }
  }, []);

  useEffect(() => {
    const currentHistory = loadHistory();
    setHistory(currentHistory);

    if (currentHistory.length === 0) {
      setState({ status: "error", message: "최근 대화가 없습니다. 먼저 채팅을 시작해 주세요." });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    (async () => {
      try {
        const res = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ msgs: currentHistory })
        });
        const data = await res.json();
        if (!res.ok || !data?.url) {
          throw new Error(data?.error || "공유 링크 생성에 실패했습니다.");
        }
        const absoluteUrl = new URL(data.url, window.location.origin).toString();
        if (!cancelled) {
          setState({ status: "ready", url: absoluteUrl });
        }
      } catch (error: any) {
        if (!cancelled) {
          setState({ status: "error", message: error?.message || "예상치 못한 오류가 발생했습니다." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  return (
    <div className="surface" style={{ width: "min(100%, 560px)", display: "grid", gap: 24 }}>
      <h1 className="section-title">대화 공유</h1>
      <p>현재 상담 기록이 자동으로 공유 링크로 생성됩니다. 아래 링크를 복사해 전달해 주세요.</p>

      {state.status === "loading" && <p>공유 링크를 준비하고 있어요...</p>}

      {state.status === "ready" && (
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ fontSize: 13, color: "#6b7280" }}>공유 링크</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              readOnly
              value={state.url}
              onFocus={(event) => event.currentTarget.select()}
              style={{
                flex: 1,
                borderRadius: 12,
                padding: "12px 14px",
                border: "1px solid rgba(15, 23, 42, 0.16)",
                background: "#f8fafc",
                fontSize: 14,
                color: "#1f2933"
              }}
            />
            <button
              type="button"
              onClick={() => handleCopy(state.url)}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #1a73e8, #4285f4)",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#9aa5b1" }}>버튼을 눌러 링크를 복사한 뒤 공유해 주세요.</p>
        </div>
      )}

      {state.status === "error" && (
        <div style={{ borderRadius: 16, padding: 16, background: "#fde8e8", color: "#b91c1c" }}>
          {state.message}
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>미리보기</h2>
        {history.length === 0 ? (
          <p style={{ color: "#9aa5b1" }}>최근 대화가 없습니다. 먼저 채팅을 시작해 주세요.</p>
        ) : (
          <ul style={{ display: "grid", gap: 12, paddingLeft: 0, listStyle: "none" }}>
            {history.map((msg, index) => (
              <li
                key={`${msg.role}-${index}`}
                style={{
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  borderRadius: 16,
                  padding: 16,
                  background: "#ffffff",
                  boxShadow: "0 12px 18px rgba(15, 23, 42, 0.04)"
                }}
              >
                <strong style={{ display: "block", marginBottom: 8 }}>
                  {msg.role === "user" ? "🙋 사용자" : "🤖 RealE"}
                </strong>
                <div style={{ whiteSpace: "pre-wrap", color: "#374151" }}>{msg.content}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
