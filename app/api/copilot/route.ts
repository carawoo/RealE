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
      await admin.from("messages").insert({
        conversation_id: conversationId || null,
        role: "user",
        content: message,
      });
      await admin.from("messages").insert({
        conversation_id: conversationId || null,
        role: "assistant",
        content: reply,
      });
    } catch {}

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


