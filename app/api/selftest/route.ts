// app/api/selftest/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
  };

  let write_ok = false, write_error: any = null;
  try {
    const { data, error } = await supabaseAdmin.from("conversations")
      .insert({ ip: "127.0.0.1", user_agent: "selftest" })
      .select("id")
      .single();
    if (error) throw error;
    write_ok = !!data?.id;
  } catch (e: any) {
    write_ok = false; write_error = { message: e.message, code: e.code };
  }

  return NextResponse.json({ env, supabase: { write_ok, write_error } });
}