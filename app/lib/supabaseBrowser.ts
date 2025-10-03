import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY)가 설정되지 않았습니다.");
}

// 싱글톤 패턴으로 클라이언트 중복 생성 방지
let supabaseClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient() {
  // 이미 생성된 클라이언트가 있으면 재사용
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase 브라우저 클라이언트를 초기화할 수 없습니다. 환경 변수를 확인하세요.");
  }

  // 클라이언트 사이드에서만 실행
  if (typeof window === 'undefined') {
    throw new Error("Supabase 클라이언트는 브라우저 환경에서만 사용할 수 있습니다.");
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}

