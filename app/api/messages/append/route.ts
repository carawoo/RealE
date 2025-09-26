// app/api/messages/append/route.ts
import { NextResponse } from "next/server";
import { jsonBadRequest } from "@/server/shared/http";
import { getSupabaseAdmin } from "@/server/supabase";

export const runtime = "nodejs";

type Item = { role: "user" | "assistant"; text: string };

export async function POST(req: Request) {
  const { conversation_id, items } = await req.json();

  if (!conversation_id) return jsonBadRequest("conversation_id is required");
  if (!Array.isArray(items) || items.length === 0) return jsonBadRequest("items is empty");

  // ⚠️ messages 테이블의 본문 컬럼명이 `text`인지 `content`인지 프로젝트마다 다릅니다.
  // 기본은 `text`로 가정. 만약 `content`라면 아래 객체의 `text`를 `content`로 바꿔 주세요.
  const rows = (items as Item[]).map((i) => ({
    conversation_id,
    role: i.role,
    content: i.text, // ← 컬럼명을 content로 변경
  }));

  const { error } = await getSupabaseAdmin().from("messages").insert(rows);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}