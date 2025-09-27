"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
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

