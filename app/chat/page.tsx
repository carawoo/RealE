// app/chat/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isLowInfo, isRealEstateQuery, isAnalyticalTopic } from "@/lib/text";
import { FAQ } from "@/app/data/faqs";
import { bestFAQMatch } from "@/app/data/faq";
import "./chat.css";

type Role = "user" | "assistant";
type Card = { title: string; subtitle?: string; monthly?: string; totalInterest?: string; notes?: string[] };
type Msg = { role: Role; text?: string; cards?: Card[]; checklist?: string[]; actions?: string[] };

const INITIAL_MSG: Msg = {
  role: "assistant",
  text: '안녕하세요! 무엇을 도와드릴까요? (예: "전세로 살지 매매가 나을지 고민이에요")',
};

// Supabase (클라이언트)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// 로컬 유지: 대화 id
const CONV_KEY = "reale:conv";

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // 초기 conv 복원
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(CONV_KEY) : null;
    if (saved) setConversationId(saved);
  }, []);

  // textarea auto-resize
  useEffect(() => {
    if (!areaRef.current) return;
    areaRef.current.style.height = "auto";
    areaRef.current.style.height = Math.min(areaRef.current.scrollHeight, 120) + "px";
  }, [input]);

  // 스크롤 하단 고정
  useEffect(() => {
    const t = setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [msgs, loading]);

  function handleReset() {
    setLoading(false);
    setInput("");
    setMsgs([INITIAL_MSG]);
    setConversationId(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(CONV_KEY);
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function handleShare() {
    if (sharing) return;
    try {
      setSharing(true);
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ msgs }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const absolute = new URL(data.url, window.location.origin).toString();
      await navigator.clipboard?.writeText(absolute).catch(() => {});
      alert("공유 링크가 복사되었어요!\n" + absolute);
    } catch (e: any) {
      alert(e?.message || "공유 중 오류가 발생했어요.");
    } finally {
      setSharing(false);
    }
  }

  /* ───────── Supabase 저장 ───────── */
  async function ensureConversation(): Promise<string | null> {
    try {
      if (!supabase) return null;
      if (conversationId) return conversationId;
      const { data, error } = await supabase.from("conversations").insert({}).select("id").single();
      if (error) {
        console.warn("[conv] insert error:", error);
        return null;
      }
      setConversationId(data.id);
      if (typeof window !== "undefined") window.localStorage.setItem(CONV_KEY, data.id);
      return data.id;
    } catch (e) {
      console.warn("[conv] ensureConversation exception:", e);
      return null;
    }
  }

  async function saveUserMessage(content: string) {
    try {
      if (!supabase) return;
      const cid = await ensureConversation();
      if (!cid) return;
      await supabase.from("messages").insert({ conversation_id: cid, role: "user", content });
    } catch (e) {
      console.warn("[messages] user insert error:", e);
    }
  }

  async function saveAssistantMessage(content: string, cards?: Card[], checklist?: string[], actions?: string[]) {
    try {
      if (!supabase) return;
      const cid = await ensureConversation();
      if (!cid) return;
      await supabase.from("messages").insert({
        conversation_id: cid,
        role: "assistant",
        content,
        cards: cards && cards.length ? cards : null,
        checklist: checklist && checklist.length ? checklist : null,
        // actions는 fields(jsonb)에 보관
        fields: actions && actions.length ? { actions } : null,
      });
    } catch (e) {
      console.warn("[messages] assistant insert error:", e);
    }
  }

  /* ───────── 백엔드 호출 ───────── */
  async function callBackend(message: string, extra?: { intent?: "summary" | "verify" }) {
    setLoading(true);
    try {
      const cid = await ensureConversation();
      const res = await fetch("/api/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId: cid, intent: extra?.intent }),
      });
      const data = await res.json();

      const reply = typeof data?.reply === "string"
        ? data.reply
        : "분석에 실패했어요. 한 번만 다시 시도해 주세요.";

      const cards: Card[] = Array.isArray(data?.cards) ? data.cards : [];
      const checklist: string[] = Array.isArray(data?.checklist) ? data.checklist : [];
      const actions: string[] = Array.isArray(data?.nextSteps) ? data.nextSteps
        : Array.isArray(data?.actions) ? data.actions : [];

      // 본문
      setMsgs(prev => [...prev, { role: "assistant", text: reply }]);
      // 저장
      saveAssistantMessage(reply, cards, checklist, actions);

      // 구조 결과(카드/체크/다음단계)
      if (cards.length || checklist.length || actions.length) {
        setMsgs(prev => [...prev, { role: "assistant", cards, checklist, actions }]);
      }
    } catch (e) {
      const errText = "서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
      setMsgs(prev => [...prev, { role: "assistant", text: errText }]);
      saveAssistantMessage(errText);
    } finally {
      setLoading(false);
    }
  }

  /* ───────── 전송 ───────── */
  async function send() {
    const message = input.trim();
    if (!message || loading) return;

    setMsgs(prev => [...prev, { role: "user", text: message }]);
    saveUserMessage(message);
    setInput("");

    if (isLowInfo(message)) {
      const txt = "어떤 상황인지 자세히 말씀해 주시면! 상황에 맞춰 도움을 드릴게요!";
      setMsgs(prev => [...prev, { role: "assistant", text: txt }]);
      saveAssistantMessage(txt);
      return;
    }

    if (!isRealEstateQuery(message)) {
      const txt =
        "이 서비스는 '부동산/주택금융' 상담 전용이에요 🙂\n" +
        "예) 전세 vs 매매, LTV/DSR 한도, 특례보금자리 요건/금리, 월세↔보증금 조정 등";
      setMsgs(prev => [...prev, { role: "assistant", text: txt }]);
      saveAssistantMessage(txt);
      return;
    }

    if (isAnalyticalTopic(message)) {
      await callBackend(message);
      return;
    }

    const hit = bestFAQMatch(message, FAQ, 0.9);
    if (hit) {
      const txt = `${hit.item.a}\n\n(참고: 자주 묻는 질문에서 자동 안내 · 유사도 ${(hit.score * 100).toFixed(0)}%)`;
      setMsgs(prev => [...prev, { role: "assistant", text: txt }]);
      saveAssistantMessage(txt);
      return;
    }

    await callBackend(message);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  /* ───────── UI ───────── */
  return (
    <div className="chat-container">
      <Link href="/" className="chat-home" aria-label="홈으로 이동" title="홈으로 이동">
        <span className="icon">🏠</span><span className="label">홈</span>
      </Link>

      <button type="button" className="chat-reset" onClick={handleReset} aria-label="새 대화 시작" title="새 대화 시작">
        <span className="icon">↺</span><span className="label">새 대화</span>
      </button>

      <button type="button" className="chat-share" onClick={handleShare} disabled={sharing} aria-label="대화 공유" title="대화 공유">
        <span className="icon">🔗</span><span className="label">{sharing ? "생성 중…" : "공유"}</span>
      </button>

      <div ref={listRef} className="chat-messages">
        <div className="messages-container">
          <div className="welcome-section">
            <div className="bot-avatar">🏠</div>
            <div className="welcome-text">
              <h2>RealE: 당신의 부동산 비서</h2>
              <p>부동산 관련 고민을 자유롭게 말씀해 주세요</p>
            </div>
          </div>

          {msgs.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              {m.text && (
                <div className="message-content">
                  {m.text.split("\n").map((line, idx, arr) => (
                    <span key={idx}>
                      {line}
                      {idx < arr.length - 1 && <br />}
                    </span>
                  ))}
                </div>
              )}

              {(m.cards?.length || m.checklist?.length || m.actions?.length) ? (
                <div className="result-cards">
                  {m.cards?.map((c, idx) => (
                    <div key={idx} className="result-card">
                      <div className="title">{c.title}</div>
                      {c.subtitle && <div className="sub">{c.subtitle}</div>}
                      {c.monthly && <div className="big">{c.monthly}</div>}
                      {c.totalInterest && <div>{c.totalInterest}</div>}
                      {Array.isArray(c.notes) && c.notes.length > 0 && (
                        <ul>{c.notes.map((n, ni) => <li key={ni}>{n}</li>)}</ul>
                      )}
                    </div>
                  ))}

                  {Array.isArray(m.checklist) && m.checklist.length > 0 && (
                    <div className="result-card">
                      <div className="title">서류 체크리스트</div>
                      <ul>{m.checklist.map((n, ni) => <li key={ni}>{n}</li>)}</ul>
                    </div>
                  )}

                  {Array.isArray(m.actions) && m.actions.length > 0 && (
                    <div className="result-card">
                      <div className="title">다음 단계</div>
                      <ul>{m.actions.map((n, ni) => <li key={ni}>{n}</li>)}</ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ))}

          {loading && (
            <div className="typing-indicator">
              <div className="typing-container">
                <div className="typing-bubble">
                  <div className="typing-dots"><span></span><span></span><span></span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="chat-input-container">
        <div className="chat-input">
          <div className="input-wrapper">
            <textarea
              ref={areaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="고민을 자유롭게 말해보세요"
              className="chat-input textarea"
              rows={1}
            />
          </div>

          <button onClick={send} disabled={loading || !input.trim()} className="send-button" aria-busy={loading}>
            {loading ? "⏳" : "📤"}
          </button>
        </div>
      </div>
    </div>
  );
}