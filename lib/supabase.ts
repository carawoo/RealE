// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE!;

export const supabase = createClient(URL, ANON, { auth: { persistSession: false }});
export const supabaseAdmin = createClient(URL, SERVICE, { auth: { persistSession: false }});