// lib/supabase.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE ?? "",
  {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "reale/server" } },
  }
);