"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient as createRealtimeClient } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "../lib/supabaseBrowser";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  supabase: SupabaseClient | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [supabase] = useState<SupabaseClient | null>(() => {
    try {
      return createSupabaseBrowserClient();
    } catch (error) {
      console.warn("Supabase 브라우저 클라이언트를 생성하지 못했습니다.", error);
      return null;
    }
  });

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Realtime 원격 새로고침 구독 (system:reload 채널)
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;
    const rt = createRealtimeClient(url, anon, { realtime: { params: { eventsPerSecond: 1 } } });
    const channel = rt.channel("system:reload");
    channel.on("broadcast", { event: "reload" }, (_payload) => {
      try { location.reload(); } catch {}
    }).subscribe();
    return () => { try { channel.unsubscribe(); } catch {} };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      // JWT 사용자가 존재하지 않는 경우 등 로그아웃 실패 시에도
      // 클라이언트 상태를 정리하여 사용자 경험을 보장
      console.warn("로그아웃 중 오류 발생, 클라이언트 상태 정리 중:", error?.message);
      
      // 로컬 상태 정리
      setSession(null);
      setUser(null);
      
      // 로컬 스토리지 정리
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("reale:proAccess");
          localStorage.removeItem("reale:proAccessUntil");
          localStorage.removeItem("reale:conversationHistory");
          localStorage.removeItem("reale:lastConversationHistory");
          localStorage.removeItem("reale:conversationId");
        } catch (storageError) {
          console.warn("로컬 스토리지 정리 중 오류:", storageError);
        }
      }
    }
    
    if (pathname?.startsWith("/account")) {
      router.replace("/");
    }
  };

  const value = useMemo(
    () => ({ user, session, supabase, loading, signOut }),
    [session, supabase, loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}

