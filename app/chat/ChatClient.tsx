"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CopilotKit } from "@copilotkit/react-core";
import { loadStripe } from "@stripe/stripe-js";
import dynamic from "next/dynamic";
import "./chat.css";
import { useAuth } from "@/app/providers/AuthProvider";

const KakaoMap = dynamic(() => import("./KakaoMap"), { ssr: false });

type Role = "user" | "assistant";
type Message = { role: Role; content: string; location?: string };

const INITIAL_ASSISTANT_MESSAGE =
  "안녕하세요! RealE(리얼이)입니다. 부동산, 은행, 인테리어 관련 고민을 편하게 말씀해 주세요.";

const STORAGE_KEYS = {
  conversationId: "reale:conversationId",
  history: "reale:conversationHistory",
  archive: "reale:lastConversationHistory",
  newConversation: "reale:newConversation",
  proAccess: "reale:proAccess",
  questionCount: "reale:questionCount",
} as const;

// 사용자별 키 생성 함수
function getUserStorageKey(baseKey: string, userId?: string | null): string {
  if (!userId) return baseKey;
  return `${baseKey}:${userId}`;
}

const FREE_QUESTION_LIMIT = 5;
const UPGRADE_PRICE_DISPLAY = "3,900원";
const STRIPE_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
const PLUS_DAILY_LIMIT = 30; // RealE Plus 일일 질문 제한
const PRO_DAILY_LIMIT = 50; // RealE Pro 일일 질문 제한
const PRO_DURATION_DAYS = 30; // 구독 기간(일)

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const freshParam = searchParams.get("fresh");
  const upgradedParam = searchParams.get("upgraded");

  const [messages, setMessages] = useState<Message[]>(() => initialMessages());
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const assistantPointer = useRef<number>(-1);
  // 한 답변을 여러 말풍선으로 자연스럽게 분할하기 위한 카운터/버퍼
  const splitCountRef = useRef<number>(0);
  const pendingRef = useRef<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [proAccess, setProAccess] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_COPILOT_PUBLIC_API_KEY;
  const copilotEnabled = typeof publicKey === "string" && publicKey.trim().length > 0;
  const skipArchiveRef = useRef(false);
  const { user, loading: authLoading, supabase } = useAuth();
  // 초기 렌더에서 서버/클라이언트 HTML 일치 보장을 위해 0으로 시작
  const [totalQuestionsUsed, setTotalQuestionsUsed] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [dailyUsed, setDailyUsed] = useState(0);

  const makeMessage = useCallback((role: Role, content: string): Message => ({ role, content }), []);

  const ensureLoggedIn = useCallback(() => {
    if (authLoading) return false;
    if (!user) {
      router.push("/signin?redirect=/chat");
      return false;
    }
    return true;
  }, [authLoading, user, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEYS.proAccess);
    if (stored === "1") {
      setProAccess(true);
    }
  }, []);

  // 서버 DB의 플랜 상태를 동기화(관리자 대시보드 변경 반영)
  useEffect(() => {
    async function syncPlanFromDB() {
      if (!supabase || !user) return;
      try {
        let plan: boolean | null = null;
        let until: string | null = null;

        // 우선 서버 API(서비스 롤) 시도: 프로덕션 신뢰도 향상
        try {
          const res = await fetch("/api/user/plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, email: user.email }),
          });
          if (res.ok) {
            const data = await res.json();
            if (typeof data?.plan === "boolean" || data?.pro_until) {
              plan = typeof data.plan === "boolean" ? data.plan : null;
              until = data?.pro_until ?? null;
            }
          }
        } catch {}

        // user_plan 테이블에서 직접 조회 (plan: boolean 또는 enum(plan_type) 모두 지원)
        if (plan === null) {
          const byId = await supabase
            .from("user_plan")
            .select("plan, plan_label, pro_until")
            .eq("user_id", user.id)
            .maybeSingle();

          if (byId.data) {
            const rawPlan: any = (byId.data as any).plan;
            const rawLabel: any = (byId.data as any).plan_label;

            // plan이 enum 문자열인 경우: 'RealE' | 'Plus' | 'Pro'
            if (typeof rawPlan === "string") {
              const planStr = rawPlan.trim();
              plan = planStr !== "RealE"; // Plus/Pro => true, RealE => false
            } else if (typeof rawPlan === "boolean") {
              // 과거 스키마(BOOLEAN) 호환
              plan = rawPlan;
            } else if (typeof rawLabel === "string") {
              // 최종 폴백: plan_label 기반 추론
              const lbl = rawLabel.trim().toLowerCase();
              plan = lbl === "plus" || lbl === "pro";
            }

            until = (byId.data as any).pro_until ?? null;
          }
        }

        if (plan !== null) {
          const untilMs = until ? new Date(until).getTime() : null;
          if (plan) {
            if (typeof window !== "undefined") {
              window.localStorage.setItem(STORAGE_KEYS.proAccess, "1");
              if (untilMs) window.localStorage.setItem("reale:proAccessUntil", String(untilMs));
            }
            setProAccess(true);
          } else {
            if (typeof window !== "undefined") {
              window.localStorage.setItem(STORAGE_KEYS.proAccess, "0");
              window.localStorage.removeItem("reale:proAccessUntil");
            }
            setProAccess(false);
          }
        } else {
          // 최종 폴백: 서버 API를 통해 서비스 롤로 조회(RLS 우회)
          const res = await fetch("/api/user/plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, email: user.email }),
          });
          const data = await res.json();
          if (res.ok && data) {
            const inferredPlan = typeof data.plan === "boolean" ? data.plan : false;
            const untilMs = data?.pro_until ? new Date(data.pro_until).getTime() : null;
            if (inferredPlan) {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(STORAGE_KEYS.proAccess, "1");
                if (untilMs) window.localStorage.setItem("reale:proAccessUntil", String(untilMs));
              }
              setProAccess(true);
            } else {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(STORAGE_KEYS.proAccess, "0");
                window.localStorage.removeItem("reale:proAccessUntil");
              }
              setProAccess(false);
            }
          }
        }
      } catch {
        // 무시
      }
    }

    syncPlanFromDB();
    function onFocus() { syncPlanFromDB(); }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
      return () => window.removeEventListener("focus", onFocus);
    }
  }, [supabase, user]);

  useEffect(() => {
    if (typeof window === "undefined" || upgradedParam !== "1") return;
    const now = Date.now();
    const until = now + PRO_DURATION_DAYS * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(STORAGE_KEYS.proAccess, "1");
    window.localStorage.setItem("reale:proAccessUntil", String(until));
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
    // 마운트 후 로컬스토리지에서 질문 사용량을 동기화
    if (!mounted) {
      try {
        if (typeof window !== "undefined") {
          const stored = window.localStorage.getItem(STORAGE_KEYS.questionCount);
          if (stored) {
            const parsed = Number(stored);
            if (Number.isFinite(parsed)) {
              setTotalQuestionsUsed(parsed);
            }
          } else {
            const storedHistory = window.localStorage.getItem(STORAGE_KEYS.history);
            if (storedHistory) {
              const parsedHistory = JSON.parse(storedHistory) as Message[];
              if (Array.isArray(parsedHistory)) {
                const count = parsedHistory.filter((m) => m.role === "user").length;
                setTotalQuestionsUsed(Math.min(count, FREE_QUESTION_LIMIT));
              }
            }
          }
        }
      } catch (error) {
        console.warn("Failed to derive question count from history", error);
      } finally {
        setMounted(true);
      }
    }

    storeHistory(messages, { skipArchive: skipArchiveRef.current });
    if (skipArchiveRef.current) {
      skipArchiveRef.current = false;
    }
    if (!proAccess) {
      const userMessagesCount = messages.filter((m) => m.role === "user").length;
      if (userMessagesCount > totalQuestionsUsed) {
        const nextCount = Math.min(userMessagesCount, FREE_QUESTION_LIMIT);
        setTotalQuestionsUsed(nextCount);
        window.localStorage.setItem(STORAGE_KEYS.questionCount, String(nextCount));
      }
    }
  }, [messages, proAccess, totalQuestionsUsed]);

  const userMessagesCount = messages.filter((m) => m.role === "user").length;
  // 개발 환경에서는 쿼터 제한을 해제해 로컬 테스트가 막히지 않도록 함
  const quotaDisabledInDev = process.env.NODE_ENV !== "production";

  // Pro 만료 확인
  const proUntilRaw = typeof window !== "undefined" ? window.localStorage.getItem("reale:proAccessUntil") : null;
  const proValid = (() => {
    if (quotaDisabledInDev) return true;
    if (!proAccess) return false;
    if (!proUntilRaw) return true;
    const until = Number(proUntilRaw);
    if (!Number.isFinite(until)) return true;
    return Date.now() < until;
  })();

  // 일일 사용량(프로 전용) – 사용자별로 분리하여 저장
  const [todayKey, setTodayKey] = useState(() => 
    typeof window !== "undefined" ? new Date().toISOString().slice(0, 10) : ""
  );
  
  // 자정이 지나면 todayKey 업데이트
  useEffect(() => {
    const checkMidnight = () => {
      const newTodayKey = new Date().toISOString().slice(0, 10);
      if (newTodayKey !== todayKey) {
        console.log('[Daily Reset] Date changed, resetting daily count:', todayKey, '->', newTodayKey);
        setTodayKey(newTodayKey);
        setDailyUsed(0);
      }
    };
    
    // 1분마다 날짜 체크
    const interval = setInterval(checkMidnight, 60000);
    return () => clearInterval(interval);
  }, [todayKey]);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user?.id) return;
    try {
      const userDailyKey = getUserStorageKey(`reale:daily:${todayKey}`, user.id);
      const raw = window.localStorage.getItem(userDailyKey);
      const v = Number(raw);
      setDailyUsed(Number.isFinite(v) ? v : 0);
      console.log('[Daily Count] Loaded for', todayKey, ':', v);
    } catch { setDailyUsed(0); }
  }, [todayKey, user?.id]);

  // 사용자 변경 시: 로컬 저장값을 우선 사용하므로 별도 초기화하지 않음
  // (초기화는 날짜가 바뀔 때 키가 달라지면서 자연스럽게 0으로 시작)

  const effectiveProAccess = proValid || quotaDisabledInDev;
  
  // Pro 플랜 감지 (URL 파라미터나 사용자 플랜 정보 확인)
  const isProPlan = effectiveProAccess && (searchParams.get('plan') === 'pro' || (user && user.user_metadata?.plan === 'pro'));
  const dailyLimit = effectiveProAccess ? (isProPlan ? PRO_DAILY_LIMIT : PLUS_DAILY_LIMIT) : FREE_QUESTION_LIMIT;
  const planName = isProPlan ? 'RealE Pro' : 'RealE Plus';
  
  const normalizedQuestionCount = effectiveProAccess ? userMessagesCount : Math.min(totalQuestionsUsed, FREE_QUESTION_LIMIT);
  const questionsLeft = effectiveProAccess
    ? Math.max(dailyLimit - dailyUsed, 0)
    : Math.max(FREE_QUESTION_LIMIT - normalizedQuestionCount, 0);
  
  // 디버깅을 위한 콘솔 로그
  console.log('Debug - FREE_QUESTION_LIMIT:', FREE_QUESTION_LIMIT);
  console.log('Debug - effectiveProAccess:', effectiveProAccess);
  console.log('Debug - normalizedQuestionCount:', normalizedQuestionCount);
  console.log('Debug - questionsLeft:', questionsLeft);
  console.log('Debug - user:', !!user);
  console.log('Debug - totalQuestionsUsed:', totalQuestionsUsed);
  console.log('Debug - userMessagesCount:', userMessagesCount);
  const outOfQuota = effectiveProAccess
    ? dailyUsed >= dailyLimit
    : normalizedQuestionCount >= FREE_QUESTION_LIMIT;

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

  // 새 어시스턴트 말풍선 생성
  function pushNewAssistantBubble(): void {
    setMessages((prev) => {
      const next = [...prev, makeMessage("assistant", "")];
      assistantPointer.current = next.length - 1;
      return next;
    });
  }

  // 스트리밍 중: 500자 제한이지만 문장 경계(…다./…요./…니다. 등)에서만 다음 말풍선으로 넘김
  function appendChunk(chunk: string) {
    const index = assistantPointer.current;
    if (index < 0) return;
    pendingRef.current += chunk;
    setMessages((prev) => {
      if (!prev[index]) return prev;
      const next = [...prev];
      let i = index;
      const MAX = 500;

      // 현재 말풍선의 누적 텍스트
      let curr = next[i].content ?? "";

      // 문장 패턴 확장: 다./요./니다./예요./에요./습니다./죠. 및 ? ! 로 끝나는 문장
      const re = /(.*?(?:다\.|요\.|니다\.|예요\.|에요\.|습니다\.|죠\.|\?|!)(?=\s|$))/gs;
      const buffer = pendingRef.current;
      let lastIdx = 0;
      let m: RegExpExecArray | null;

      // 헬퍼: 문장을 현재/새 말풍선에 배치
      function place(sentence: string) {
        // 현재 말풍선에 더하면 500 초과? -> 새 말풍선으로 넘김
        if (curr.length > 0 && curr.length + sentence.length > MAX) {
          // 현재 말풍선 고정 후 새 말풍선 시작
          next[i] = { ...next[i], content: curr };
          (next as any).push(makeMessage("assistant", ""));
          i = next.length - 1;
          assistantPointer.current = i;
          curr = "";
        }
        // 문장이 자체로 500자를 넘더라도 그대로 한 말풍선에 실음(요구사항: 500 넘으면 그 문장은 다음 채팅)
        curr += sentence;
      }

      // 버퍼 내 완결된 문장들을 처리
      while ((m = re.exec(buffer)) !== null) {
        const sentence = m[1];
        const seg = buffer.slice(lastIdx, m.index) + sentence; // '다.' 전의 누적 포함
        // seg는 사실상 sentence 자체이지만 안정성 위해 lastIdx 고려
        place(seg);
        lastIdx = m.index + sentence.length;
      }

      // 미완의 꼬리 부분은 다음 청크에서 이어붙이도록 유지
      const tail = buffer.slice(lastIdx);
      pendingRef.current = tail;

      // 화면에 현재 누적 반영
      next[i] = { ...next[i], content: curr };
      return next;
    });
  }

  function finalizeAssistant(content: string, location?: string) {
    const index = assistantPointer.current;
    if (index < 0) return;
    const MAX = 500;
    const text = (pendingRef.current || content) || "";
    setMessages((prev) => {
      if (!prev[index]) return prev;
      const next = [...prev];
      let i = index;

      // 남은 텍스트를 확장된 문장 단위로 분배
      let curr = next[i].content ?? "";
      const re = /(.*?(?:다\.|요\.|니다\.|예요\.|에요\.|습니다\.|죠\.|\?|!)(?=\s|$))/gs;
      let last = 0;
      let m: RegExpExecArray | null;
      function pushSentence(s: string) {
        if (curr.length > 0 && curr.length + s.length > MAX) {
          next[i] = { ...next[i], content: curr };
          (next as any).push(makeMessage("assistant", ""));
          i = next.length - 1;
          curr = "";
        }
        curr += s;
      }

      while ((m = re.exec(text)) !== null) {
        const s = m[1];
        const seg = text.slice(last, m.index) + s;
        pushSentence(seg);
        last = m.index + s.length;
      }
      // 마지막 꼬리(문장 미완성분)는 남아 있으면 그대로 붙임
      const tail = text.slice(last);
      if (tail) {
        // tail이 500을 넘으면 새 말풍선으로 이동
        if (curr.length > 0 && curr.length + tail.length > MAX) {
          next[i] = { ...next[i], content: curr };
          (next as any).push(makeMessage("assistant", tail));
          i = next.length - 1;
        } else {
          curr += tail;
          next[i] = { ...next[i], content: curr };
        }
      } else {
        next[i] = { ...next[i], content: curr };
      }
      
      // location이 있으면 마지막 메시지에 추가
      if (location) {
        next[i] = { ...next[i], location };
      }
      
      assistantPointer.current = -1;
      return next;
    });
    assistantPointer.current = -1;
    pendingRef.current = "";
    splitCountRef.current = 0;
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
      let detectedLocation: string | undefined;

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
            if (typeof payload.location === "string") {
              detectedLocation = payload.location;
              console.log("Location detected:", detectedLocation);
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
        finalizeAssistant(finalText.trim(), detectedLocation);
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
    if (!ensureLoggedIn()) {
      return;
    }
    if (!effectiveProAccess && normalizedQuestionCount >= FREE_QUESTION_LIMIT) {
      return;
    }

    skipArchiveRef.current = true;

    const updatedHistory: Message[] = [...messages, makeMessage("user", text)];

    setMessages((prev) => {
      const next: Message[] = [...prev, makeMessage("user", text), makeMessage("assistant", "")];
      assistantPointer.current = next.length - 1;
      splitCountRef.current = 0; // 답변마다 분할 카운트 리셋
      pendingRef.current = "";
      return next;
    });

    await streamAssistant(text, updatedHistory);

    // Pro 일일 카운트 증가 (사용자별)
    if (effectiveProAccess && typeof window !== "undefined" && user?.id) {
      try {
        const next = dailyUsed + 1;
        const userDailyKey = getUserStorageKey(`reale:daily:${todayKey}`, user.id);
        window.localStorage.setItem(userDailyKey, String(next));
        // 즉시 화면 반영
        setDailyUsed(next);
      } catch {}
    }
  }

  async function onSubmitDraft() {
    const text = draft.trim();
    if (!text) return;
    if (!ensureLoggedIn()) {
      return;
    }
    if (!effectiveProAccess && normalizedQuestionCount >= FREE_QUESTION_LIMIT) {
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
    if (!ensureLoggedIn()) {
      return;
    }
    if (typeof window === "undefined") {
      setPaymentError("브라우저 환경에서만 결제가 가능합니다.");
      return;
    }
    
    // Plus 유저가 한도 초과했을 때는 Pro 플랜으로 업그레이드
    const shouldUpgradeToPro = effectiveProAccess && !isProPlan && outOfQuota;
    
    setCheckoutLoading(true);
    setPaymentError(null);
    try {
      if (shouldUpgradeToPro) {
        // Pro 플랜으로 업그레이드 페이지로 리다이렉트
        console.log('[Checkout] Plus user upgrading to Pro');
        window.location.href = '/checkout?plan=pro';
        return;
      }
      
      const res = await fetch("/api/kakaopay/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemName: "RealE Plus", amount: 3900 }),
      });

      const data = await res.json();
      if (!res.ok || !data) {
        throw new Error(data?.error || "결제 세션 생성에 실패했어요.");
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
          {messages.map((m, i) => {
            console.log(`[ChatClient] Message ${i}:`, { role: m.role, hasLocation: !!m.location, location: m.location });
            return (
              <div key={`${m.role}-${i}`} className={`chat-row ${m.role}`}>
                <div className={`chat-bubble ${m.role}`}>
                  {m.content}
                  {m.location && m.role === "assistant" && (
                    <div style={{ marginTop: "12px" }}>
                      <KakaoMap address={m.location} height="250px" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="chat-compose">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => {
              if (!ensureLoggedIn()) {
                setDraft("");
              }
            }}
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
          <button
            type="button"
            className="chat-send"
            onClick={onSubmitDraft}
            disabled={loading || outOfQuota}
          >
            {loading ? "전송 중..." : "전송"}
          </button>
        </div>
        <div className="chat-usage">
          <p className="chat-usage__status">
            {!user
              ? `무료 ${FREE_QUESTION_LIMIT}회 질문 중 ${Math.min(normalizedQuestionCount, FREE_QUESTION_LIMIT)}회 사용 — 남은 질문 ${questionsLeft}회`
              : effectiveProAccess
              ? `${planName} 활성화 — 남은 일일 질문 ${questionsLeft}회 (일일 ${dailyLimit}회, 구독기간 ${PRO_DURATION_DAYS}일)`
              : `무료 ${FREE_QUESTION_LIMIT}회 질문 중 ${Math.min(normalizedQuestionCount, FREE_QUESTION_LIMIT)}회 사용 — 남은 질문 ${questionsLeft}회`}
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
            <h2 className="chat-paywall__title">추가 질문 안내</h2>
            {effectiveProAccess ? (
              isProPlan ? (
                <p className="chat-paywall__body">
                  오늘의 일일 한도({dailyLimit}회)를 모두 사용했어요. 추가 필요 시 2025reale@gmail.com 으로 문의 주세요.
                </p>
              ) : (
                <p className="chat-paywall__body">
                  RealE Plus 일일 한도({PLUS_DAILY_LIMIT}회)를 모두 사용했어요. 🎉 RealE Pro로 업그레이드하시면 일일 {PRO_DAILY_LIMIT}회까지 질문하실 수 있어요!
                </p>
              )
            ) : (
              <p className="chat-paywall__body">
                무료 {FREE_QUESTION_LIMIT}회 질문이 모두 사용되었습니다. {UPGRADE_PRICE_DISPLAY} 결제로 RealE Plus {PRO_DURATION_DAYS}일 이용(일일 {PLUS_DAILY_LIMIT}회)할 수 있어요.
              </p>
            )}
            <button
              type="button"
              className="chat-upgrade-button"
              onClick={startCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading 
                ? "페이지로 이동 중..." 
                : (effectiveProAccess && !isProPlan) 
                  ? "RealE Pro로 업그레이드하기" 
                  : "결제하고 계속하기"
              }
            </button>
            {paymentError && <p className="chat-paywall__error">{paymentError}</p>}
          </div>
        )}
        {false && !copilotEnabled && (
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