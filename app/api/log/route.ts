// app/api/log/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/server/supabase";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 예: { conversation_id, role, text, meta }
    const { conversation_id, role, text, meta } = body;

    // 1) 대화 생성 필요 시
    // await supabaseAdmin.from("conversations").insert({ id: conversation_id }).select("id").single();

    // 2) 메시지 저장
    const { error } = await getSupabaseAdmin().from("messages")
      .insert({ conversation_id, role, text, meta });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message || "log error" }, { status: 500 });
  }
}