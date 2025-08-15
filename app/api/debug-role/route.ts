// app/api/debug-role/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const r1 = await supabase.rpc("debug_current_role");       // anon 클라
  const r2 = await supabaseAdmin.rpc("debug_current_role");   // service_role 클라

  return NextResponse.json({
    anon_role: r1.data ?? null,
    anon_error: r1.error?.message ?? null,
    service_role: r2.data ?? null,
    service_error: r2.error?.message ?? null,
  });
}