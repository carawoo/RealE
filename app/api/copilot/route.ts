// app/api/copilot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { runChatAgent } from "@/server/agents/chat";
import { getSupabaseAdmin } from "@/server/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, history } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ ok: false, error: "Invalid message" }, { status: 400 });
    }

    const baseHistory: Array<{ role: 'user' | 'assistant'; content: string }> = Array.isArray(history)
      ? history.filter((m: any) => typeof m?.role === "string" && typeof m?.content === "string")
      : [];
    console.log("[/api/copilot] incoming", { message, conversationId, historyLength: baseHistory.length });
    const rawReply = await runChatAgent(message, baseHistory, { conversationId: conversationId || undefined });
    const reply = rawReply?.trim() ? rawReply.trim() : "현재 답변을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.";
    console.log("[/api/copilot] reply", reply);

    // Optional logging to Supabase if env present
    try {
      const admin = getSupabaseAdmin();
      const isUuid = (v?: string) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

      let convId: string | null = null;
      if (isUuid(conversationId)) {
        convId = conversationId as string;
        // 보장용 upsert (없으면 생성)
        await admin.from('conversations').upsert({ id: convId }, { onConflict: 'id' });
      } else {
        // UUID가 아니면 스키마에 맞는 최소 컬럼으로 헤더 생성 후 그 id 사용
        const now = new Date().toISOString();
        const created = await admin
          .from('conversations')
          .insert({
            response_type: 'user',
            account_id_text: 'unknown_user',
            kst_timestamp: now,
            timestamp: now,
            message: '[init]'
          })
          .select('id')
          .single();
        if (!created.error && created.data?.id) convId = String(created.data.id);
      }

      // 메시지 적재 (convId가 없으면 NULL 허용 스키마가 아닌 경우는 skip)
      if (convId) {
        await admin.from("messages").insert({ conversation_id: convId, role: "user", content: message });
        await admin.from("messages").insert({ conversation_id: convId, role: "assistant", content: reply });
      } else {
        // convId 생성 실패 시라도 로그는 남긴다(대화 연결 없이)
        await admin.from("messages").insert({ conversation_id: null as any, role: "user", content: message }).throwOnError();
        await admin.from("messages").insert({ conversation_id: null as any, role: "assistant", content: reply }).throwOnError();
      }
    } catch (e) {
      console.warn('[copilot] supabase logging skipped:', e);
    }

    const encoder = new TextEncoder();

    function chunkText(text: string): string[] {
      const result: string[] = [];
      const words = text.split(/(\s+)/);
      let current = "";
      for (const word of words) {
        if ((current + word).length > 60 && current.trim().length > 0) {
          result.push(current);
          current = "";
        }
        current += word;
      }
      if (current.trim().length > 0) {
        result.push(current);
      }
      return result.length > 0 ? result : [text];
    }

    const stream = new ReadableStream({
      start(controller) {
        const send = (payload: any) => controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"));
        for (const piece of chunkText(reply)) {
          send({ delta: piece });
        }
        send({ done: true, content: reply });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}


