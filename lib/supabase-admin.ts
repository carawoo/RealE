// lib/supabase-admin.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE!; // 반드시 SERVICE ROLE

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
  db: { schema: "public" },
});