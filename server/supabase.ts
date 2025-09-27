// server/supabase.ts
// Server-only Supabase clients (lazy init to avoid build-time env errors)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !service) throw new Error("Supabase admin env vars are missing");
  adminClient = createClient(url, service, { auth: { persistSession: false } });
  return adminClient;
}
