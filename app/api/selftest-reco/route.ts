// app/api/selftest-reco/route.ts (임시)
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
export const runtime = "nodejs";

export async function GET() {
  const urlOk = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sr = process.env.SUPABASE_SERVICE_ROLE;
  const srOk = !!sr;
  const srLen = sr?.length ?? 0;

  // 진짜 admin으로 insert 해보기
  const { data, error } = await supabaseAdmin
    .from("recommendations")
    .insert({ payload_json: [{ ping: "ok", at: new Date().toISOString() }] })
    .select("id")
    .single();

  return NextResponse.json({
    env: { urlOk, srOk, srLen },
    insert_ok: !error,
    insert_error: error ? { message: error.message } : null,
    id: data?.id ?? null,
  });
}