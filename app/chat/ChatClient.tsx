"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CopilotKit } from "@copilotkit/react-core";
import { loadStripe } from "@stripe/stripe-js";
import "./chat.css";

type Role = "user" | "assistant";
type Message = { role: Role; content: string };

const INITIAL_ASSISTANT_MESSAGE =
  "안녕하세요! RealE(리얼이)입니다. 부동산, 은행, 인테리어 관련 고민을 편하게 말씀해 주세요.";

const STORAGE_KEYS = {
  conversationId: "reale:conversationId",
  history: "reale:conversationHistory",
  archive: "reale:lastConversationHistory",
  newConversation: "reale:newConversation",
  proAccess: "reale:proAccess",
} as const;

const FREE_QUESTION_LIMIT = 5;
const UPGRADE_PRICE_DISPLAY = "₩9,900";
const STRIPE_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripeClient() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) return null;
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

function initialMessages(): Message[] {
  return [{ role: "assistant", content: INITIAL_ASSISTANT_MESSAGE }];
}

function createFreshConversation() {
  const init = initialMessages();
  const newId = generateId();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEYS.conversationId, newId);
  }
  return { messages: init, id: newId };
}

function snapshotCurrentConversation(messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    if (messages.length === 0) return;
    window.localStorage.setItem(STORAGE_KEYS.archive, JSON.stringify(messages));
  } catch (error) {
    console.warn("Failed to snapshot conversation", error);
  }
}

function resetStoredConversation() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEYS.conversationId);
  window.localStorage.removeItem(STORAGE_KEYS.history);
}

function storeHistory(messages: Message[], options?: { skipArchive?: boolean }) {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(messages);
    window.localStorage.setItem(STORAGE_KEYS.history, serialized);
    if (!options?.skipArchive) {
      window.localStorage.setItem(STORAGE_KEYS.archive, serialized);
    }
  } catch (error) {
    console.warn("Failed to persist conversation history", error);
  }
}

function archiveHistory(messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.archive, JSON.stringify(messages));
  } catch (error) {
    console.warn("Failed to save archive", error);
  }
}

function generateId() {
  if (typeof globalThis !== "undefined") {
    const g: any = globalThis;
    if (typeof g?.crypto?.randomUUID === "function") {
      return g.crypto.randomUUID();
    }
    const cryptoObj = g.crypto;
    if (cryptoObj?.getRandomValues) {
      const array = new Uint32Array(4);
      cryptoObj.getRandomValues(array);
      return Array.from(array, (value) => value.toString(16).padStart(8, "0")).join("-");
    }
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatClient() {
  const searchParams = useSearchParams();
  const freshParam = searchParams.get("fresh");
  const upgradedParam = searchParams.get("upgraded");

  const [messages, setMessages] = useState<Message[]>(() => initialMessages());
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const assistantPointer = useRef<number>(-1);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [proAccess, setProAccess] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_COPILOT_PUBLIC_API_KEY;
  const copilotEnabled = typeof publicKey === "string" && publicKey.trim().length > 0;
  const skipArchiveRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEYS.proAccess);
    if (stored === "1") {
      setProAccess(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || upgradedParam !== "1") return;
    window.localStorage.setItem(STORAGE_KEYS.proAccess, "1");
    setProAccess(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("upgraded");
    window.history.replaceState({}, "", url.toString());
  }, [upgradedParam]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasFreshParam = freshParam !== null;
    const hasSessionFlag = window.sessionStorage.getItem(STORAGE_KEYS.newConversation) === "1";
    const shouldReset = hasFreshParam || hasSessionFlag;

    if (shouldReset) {
      const previousHistory = window.localStorage.getItem(STORAGE_KEYS.history);
      if (previousHistory) {
        try {
          window.localStorage.setItem(STORAGE_KEYS.archive, previousHistory);
        } catch (error) {
          console.warn("Failed to archive previous conversation", error);
        }
      }

      window.sessionStorage.removeItem(STORAGE_KEYS.newConversation);
      resetStoredConversation();
      assistantPointer.current = -1;

      const fresh = createFreshConversation();
      skipArchiveRef.current = true;
      setMessages(fresh.messages);
      setConversationId(fresh.id);
      storeHistory(fresh.messages, { skipArchive: true });

      if (hasFreshParam) {
        const url = new URL(window.location.href);
        url.searchParams.delete("fresh");
        window.history.replaceState({}, "", url.toString());
      }
      return;
    }

    const storedId = window.localStorage.getItem(STORAGE_KEYS.conversationId);
    if (storedId) {
      setConversationId(storedId);
    } else {
      const newId = generateId();
      setConversationId(newId);
      window.localStorage.setItem(STORAGE_KEYS.conversationId, newId);
    }

    const storedHistory = window.localStorage.getItem(STORAGE_KEYS.history);
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (error) {
        console.warn("Failed to restore conversation history", error);
      }
    }
  }, [freshParam]);

  useEffect(() => {
    storeHistory(messages, { skipArchive: skipArchiveRef.current });
    if (skipArchiveRef.current) {
      skipArchiveRef.current = false;
    }
  }, [messages]);

  const userQuestionCount = messages.filter((m) => m.role === "user").length;
  const questionsLeft = proAccess ? null : Math.max(FREE_QUESTION_LIMIT - userQuestionCount, 0);
  const outOfQuota = !proAccess && userQuestionCount >= FREE_QUESTION_LIMIT;

  function ensureConversationId() {
    if (!conversationId) {
      const newId = generateId();
      setConversationId(newId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEYS.conversationId, newId);
      }
      return newId;
    }
    return conversationId;
  }

  function appendChunk(chunk: string) {
    const index = assistantPointer.current;
    if (index < 0) return;
    setMessages((prev) => {
      if (!prev[index]) return prev;
      const next = [...prev];
      next[index] = {
        ...next[index],
        content: (next[index].content ?? "") + chunk,
      };
      return next;
    });
  }

  function finalizeAssistant(content: string) {
    const index = assistantPointer.current;
    if (index < 0) return;
    setMessages((prev) => {
      if (!prev[index]) return prev;
      const next = [...prev];
      next[index] = { ...next[index], content };
      return next;
    });
    assistantPointer.current = -1;
  }

  async function streamAssistant(message: string, historyForApi: Message[]) {
    setLoading(true);
    try {
      const conversationKey = ensureConversationId();
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId: conversationKey, history: historyForApi }),
      });

      if (!res.body) {
        finalizeAssistant("현재 답변을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const payload = JSON.parse(line);
            if (typeof payload.delta === "string") {
              appendChunk(payload.delta);
            }
            if (typeof payload.content === "string") {
              finalText = payload.content;
            }
            if (payload.done) {
              finalText = finalText || payload.delta || "";
            }
          } catch (err) {
            console.warn("stream chunk parse error", err, line);
          }
        }
      }

      if (finalText.trim().length > 0) {
        finalizeAssistant(finalText.trim());
      } else {
        finalizeAssistant("현재 답변을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    } catch (error) {
      console.error("streamAssistant error", error);
      finalizeAssistant("답변 생성에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  async function send(message: string) {
    const text = message.trim();
    if (!text || loading) return;
    if (!proAccess && userQuestionCount >= FREE_QUESTION_LIMIT) {
      return;
    }

    skipArchiveRef.current = true;

    const updatedHistory = [...messages, { role: "user", content: text }];

    setMessages((prev) => {
      const next = [...prev, { role: "user", content: text }, { role: "assistant", content: "" }];
      assistantPointer.current = next.length - 1;
      return next;
    });

    await streamAssistant(text, updatedHistory);
  }

  async function onSubmitDraft() {
    const text = draft.trim();
    if (!text) return;
    if (!proAccess && userQuestionCount >= FREE_QUESTION_LIMIT) {
      return;
    }
    setDraft("");
    await send(text);
  }

  async function handleNewConversation() {
    if (loading) return;
    archiveHistory(messages);
    resetStoredConversation();
    const fresh = createFreshConversation();
    skipArchiveRef.current = true;
    setMessages(fresh.messages);
    setConversationId(fresh.id);
    storeHistory(fresh.messages, { skipArchive: true });

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEYS.newConversation, "1");
      const timestamp = Date.now();
      window.location.replace(`/chat?fresh=${timestamp}`);
    }
  }

  async function startCheckout() {
    if (checkoutLoading) return;
    if (!STRIPE_PRICE_ID) {
      setPaymentError("결제 구성이 완료되지 않았어요. 환경변수를 확인해 주세요.");
      return;
    }
    if (typeof window === "undefined") {
      setPaymentError("브라우저 환경에서만 결제가 가능합니다.");
      return;
    }
    setCheckoutLoading(true);
    setPaymentError(null);
    try {
      const origin = window.location.origin;
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: STRIPE_PRICE_ID,
          successUrl: `${origin}/chat?upgraded=1`,
          cancelUrl: `${origin}/chat`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data) {
        throw new Error(data?.error || "결제 세션 생성에 실패했어요.");
      }

      const stripePromiseInstance = getStripeClient();
      if (stripePromiseInstance) {
        const stripe = await stripePromiseInstance;
        if (stripe && data.id) {
          const { error } = await stripe.redirectToCheckout({ sessionId: data.id });
          if (error) {
            throw error;
          }
          return;
        }
      }

      if (typeof data.url === "string" && data.url.length > 0) {
        window.location.href = data.url;
        return;
      }

      throw new Error("결제 페이지로 이동하지 못했어요.");
    } catch (error: any) {
      setPaymentError(error?.message || "결제 준비 중 문제가 발생했어요.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  const textareaPlaceholder = outOfQuota
    ? "결제를 완료하면 추가 질문을 보낼 수 있어요."
    : "궁금한 점을 물어보세요!";

  const chatShell = (
    <div className="surface chat-surface">
      <header className="chat-surface__header">
        <h1>RealE 상담</h1>
        <p>질문을 입력하면 실시간으로 부동산·금융·인테리어 전문가가 답변합니다.</p>
      </header>
      <div className="chat-surface__body">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={`${m.role}-${i}`} className={`chat-row ${m.role}`}>
              <div className={`chat-bubble ${m.role}`}>{m.content}</div>
            </div>
          ))}
        </div>
        <div className="chat-usage">
          <p className="chat-usage__status">
            {proAccess
              ? "RealE Plus가 활성화되어 추가 질문 제한 없이 이용할 수 있어요."
              : `무료 ${FREE_QUESTION_LIMIT}회 질문 중 ${Math.min(userQuestionCount, FREE_QUESTION_LIMIT)}회 사용 — 남은 질문 ${questionsLeft}회`}
          </p>
          {!proAccess && !outOfQuota && (
            <button
              type="button"
              className="chat-upgrade-button"
              onClick={startCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? "결제 준비 중..." : `${UPGRADE_PRICE_DISPLAY}에 RealE Plus 이용`}
            </button>
          )}
        </div>
        {outOfQuota && (
          <div className="chat-paywall">
            <h2 className="chat-paywall__title">추가 질문은 RealE Plus에서</h2>
            <p className="chat-paywall__body">
              무료 {FREE_QUESTION_LIMIT}회 질문이 모두 사용되었습니다. {UPGRADE_PRICE_DISPLAY} 결제를 완료하면 전문 상담을 제한 없이 이어갈 수 있어요.
            </p>
            <button
              type="button"
              className="chat-upgrade-button"
              onClick={startCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? "결제 페이지로 이동 중..." : "결제하고 계속하기"}
            </button>
            {paymentError && <p className="chat-paywall__error">{paymentError}</p>}
          </div>
        )}
        <div className="chat-compose">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmitDraft();
              }
            }}
            placeholder={textareaPlaceholder}
            className="chat-textarea"
            disabled={loading || outOfQuota}
          />
          <button type="button" className="chat-send" onClick={onSubmitDraft} disabled={loading || outOfQuota}>
            {loading ? "전송 중..." : "전송"}
          </button>
        </div>
        {!copilotEnabled && (
          <p className="chat-warning">CopilotKit 공개 키가 설정되지 않아 기본 입력만 표시됩니다.</p>
        )}
      </div>
    </div>
  );

  if (!copilotEnabled) {
    return chatShell;
  }

  return <CopilotKit publicApiKey={publicKey}>{chatShell}</CopilotKit>;
}