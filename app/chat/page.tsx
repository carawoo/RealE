// app/chat/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import "./chat.css";

// ===== 타입 =====
type Role = "user" | "assistant";
type Card = { title: string; subtitle?: string; monthly?: string; totalInterest?: string; notes?: string[] };
type Msg = { role: Role; text?: string; cards?: Card[]; checklist?: string[] };

// ===== 초기 메시지 =====
const INITIAL_MSG: Msg = {
  role: "assistant",
  text: '안녕하세요! 무엇을 도와드릴까요? (예: "전세로 살지 매매가 나을지 고민이에요")',
};

// ===== Supabase 클라이언트 =====
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// ===== 금액 파서 & 추출(간단형) =====
function parseWon(s = ""): number {
  const clean = s.replace(/\s+/g, "");
  let n = 0;
  const mEok = /(\d+(?:\.\d+)?)억/.exec(clean);
  if (mEok) n += Math.round(parseFloat(mEok[1]) * 1e8);
  const mCheon = /(\d+(?:\.\d+)?)천/.exec(clean);
  if (mCheon) n += Math.round(parseFloat(mCheon[1]) * 1e7);
  const mMan = /(\d+(?:\.\d+)?)만/.exec(clean);
  if (mMan) n += Math.round(parseFloat(mMan[1]) * 1e4);
  const mRaw = /(\d{1,3}(?:,\d{3})+|\d+)/.exec(clean);
  if (mRaw) n = Math.max(n, parseInt(mRaw[1].replace(/,/g, ""), 10));
  return n;
}
function extractMoneyInputsFromText(text: string) {
  const t = (text || "").toLowerCase();
  const income = (() => {
    const m = /(월\s*소득|세후\s*월소득|소득|수입)\s*([0-9,억천만\s]+)/.exec(t);
    return m ? parseWon(m[2]) : undefined;
  })();
  const cash = (() => {
    const m = /(보유\s*현금|현금|가용\s*현금)\s*([0-9,억천만\s]+)/.exec(t);
    return m ? parseWon(m[2]) : undefined;
  })();
  return { incomeMonthly: income, cashOnHand: cash };
}

// ===== 컴포넌트 =====
export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  // 대화 ID
  const [conversationId, setConversationId] = useState<string | null>(null);
  const LS_KEY = "reale:convId";

  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // 첫 로드: localStorage에서 convId 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setConversationId(saved);
    } catch {}
  }, []);

  // textarea 높이 자동
  useEffect(() => {
    if (!areaRef.current) return;
    areaRef.current.style.height = "auto";
    areaRef.current.style.height = Math.min(areaRef.current.scrollHeight, 120) + "px";
  }, [input]);

  // 스크롤 맨 아래 고정
  useEffect(() => {
    const t = setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [msgs, loading]);

  // ===== 새 대화/공유 =====
  function handleReset() {
    setLoading(false);
    setInput("");
    setMsgs([INITIAL_MSG]);
    setConversationId(null);
    try { localStorage.removeItem(LS_KEY); } catch {}
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

  // ===== conversations 보장 =====
  async function ensureConversation(): Promise<string | null> {
    try {
      // 이미 state에 있으면 반환
      if (conversationId) return conversationId;

      // localStorage에 있으면 복원
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        setConversationId(saved);
        return saved;
      }

      // Supabase 없으면 생성 불가
      if (!supabase) return null;

      // 새로 생성
      const { data, error } = await supabase.from("conversations").insert({}).select("id").single();
      if (error || !data?.id) {
        console.warn("[conv] insert error:", error);
        return null;
      }
      setConversationId(data.id);
      try { localStorage.setItem(LS_KEY, data.id); } catch {}
      return data.id;
    } catch (e) {
      console.warn("[conv] ensureConversation exception:", e);
      return null;
    }
  }

  // ===== 메시지 저장 =====
  async function saveUserMessage(content: string) {
    try {
      if (!supabase) return;
      const cid = await ensureConversation();
      if (!cid) return;

      const fields = extractMoneyInputsFromText(content);
      const hasFields = !!(fields.incomeMonthly || fields.cashOnHand);

      await supabase.from("messages").insert({
        conversation_id: cid,
        role: "user",
        content,
        fields: hasFields ? fields : null,
      });
    } catch (e) {
      console.warn("[messages] user insert error:", e);
    }
  }

  async function saveAssistantMessage(content: string, cards?: Card[], checklist?: string[]) {
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
      });
    } catch (e) {
      console.warn("[messages] assistant insert error:", e);
    }
  }

  // ===== 백엔드 호출 =====
  async function callBackend(message: string, intent?: "summary" | "verify") {
    setLoading(true);
    try {
      const cid = await ensureConversation();
      const res = await fetch("/api/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, intent, conversationId: cid }),
      });
      const data = await res.json();

      const intentSummary = typeof data?.intentSummary === "string" ? data.intentSummary : "";
      const reply =
        typeof data?.reply === "string" && data.reply.trim()
          ? data.reply
          : "분석에 실패했어요. 한 번만 다시 시도해 주세요.";
      const cards: Card[] = Array.isArray(data?.cards) ? data.cards : [];
      const checklist: string[] = Array.isArray(data?.checklist) ? data.checklist : [];

      if (intentSummary) {
        setMsgs(prev => [...prev, { role: "assistant", text: `의도요약: ${intentSummary}` }]);
      }

      setMsgs(prev => [...prev, { role: "assistant", text: reply }]);
      saveAssistantMessage(reply, cards, checklist);

      if (cards.length || checklist.length) {
        setMsgs(prev => [...prev, { role: "assistant", cards, checklist }]);
      }
    } catch {
      const errText = "서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
      setMsgs(prev => [...prev, { role: "assistant", text: errText }]);
      saveAssistantMessage(errText);
    } finally {
      setLoading(false);
    }
  }

  // ===== 전송 =====
  async function send() {
    const message = input.trim();
    if (!message || loading) return;

    // 화면 반영 + 저장
    setMsgs(prev => [...prev, { role: "user", text: message }]);
    saveUserMessage(message);
    setInput("");

    // 서버 호출(의도는 서버가 자동 판단; 필요 시 summary/verify로 호출 가능)
    await callBackend(message);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // ===== 렌더 =====
  return (
    <div className="chat-container">
      {/* 좌측 상단 홈 */}
      <Link href="/" className="chat-home" aria-label="홈으로 이동" title="홈으로 이동">
        <span className="icon">🏠</span><span className="label">홈</span>
      </Link>

      {/* 우측 상단 새 대화 */}
      <button type="button" className="chat-reset" onClick={handleReset} aria-label="새 대화 시작" title="새 대화 시작">
        <span className="icon">↺</span><span className="label">새 대화</span>
      </button>

      {/* 우측 상단 공유 */}
      <button type="button" className="chat-share" onClick={handleShare} disabled={sharing} aria-label="대화 공유" title="대화 공유">
        <span className="icon">🔗</span><span className="label">{sharing ? "생성 중…" : "공유"}</span>
      </button>

      {/* 스크롤 영역 */}
      <div ref={listRef} className="chat-messages">
        <div className="messages-container">
          {/* 웰컴 */}
          <div className="welcome-section">
            <div className="bot-avatar">🏠</div>
            <div className="welcome-text">
              <h2>RealE: 당신의 부동산 비서</h2>
              <p>부동산 관련 고민을 자유롭게 말씀해 주세요</p>
            </div>
          </div>

          {/* 메시지 렌더링 */}
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

              {(m.cards?.length || m.checklist?.length) ? (
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
                </div>
              ) : null}
            </div>
          ))}

          {/* 로딩 도트 */}
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

      {/* 입력 */}
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