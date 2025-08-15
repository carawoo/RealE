// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE!;

// 브라우저/엣지용 퍼블릭 클라이언트(읽기/사용자 세션용)
export const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 서버(Node)에서만 쓰는 admin 클라이언트(쓰기/RLS 우회)
export const supabaseAdmin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});