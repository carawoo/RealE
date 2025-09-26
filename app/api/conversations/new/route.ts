// app/api/conversations/new/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/server/supabase";

export const runtime = "nodejs";

export async function POST() {
  // IP 정도만 저장(스키마에 맞게 필드명 조정: 예: ip TEXT 존재)
  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local-dev";

  const { data, error } = await getSupabaseAdmin()
    .from("conversations")
    .insert({ ip })                // ← 테이블 컬럼명에 맞게 필요시 수정
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}