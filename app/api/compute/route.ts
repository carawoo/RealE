// app/api/compute/route.ts
// 새로운 전문가 시스템 기반 API

import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { jsonBadRequest, jsonServerError } from "@/server/shared/http";
import { randomUUID } from "crypto";
import { runChatAgent } from "../../../server/agents/chat";
import { 
  Fields, 
  extractFieldsFrom, 
  mergeFields
} from "../../../server/shared/utils";
import { getSupabaseAdmin } from "@/server/supabase";
type Role = "user" | "assistant";
type MessageRow = { role: Role; content: string; fields: Fields | null };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// LLM provider is handled in server/llm

// ---------- Helpers ----------

// 최근 메시지 내용 가져오기 (맥락용) - messages 테이블 사용
async function fetchRecentMessages(conversationId: string, limit: number = 5): Promise<Array<{ role: Role; content: string }>> {
  if (!conversationId) return [];
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("메시지 조회 실패:", error);
      return [];
    }
    return (data || []).map((r: any) => ({ role: r.role as Role, content: String(r.content || '') }));
  } catch (err) {
    console.error("메시지 조회 중 오류:", err);
    return [];
  }
}


// ---------- Supabase ----------
async function fetchConversationProfile(conversationId: string): Promise<Fields> {
  if (!conversationId) return {};
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("messages")
      .select("fields, role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("프로필 조회 실패:", error);
      return {};
    }
    let acc: Fields = {};
    for (const r of data || []) {
      if (r?.fields) acc = mergeFields(acc, r.fields);
      if (r.role === 'user') acc = mergeFields(acc, extractFieldsFrom(r.content || ''));
    }
    return acc;
  } catch (err) {
    console.error("프로필 조회 중 오류:", err);
    return {};
  }
}

// Supabase에 메시지 저장 - messages 테이블 사용 (관리자 권한)
async function saveMessageToSupabase(
  conversationId: string, 
  role: Role, 
  content: string, 
  fields: Fields | null = null
): Promise<boolean> {
  try {
    console.log(`🔄 Supabase 저장 시도(messages): ${role}`);
    const payload: Record<string, any> = {
      conversation_id: conversationId,
      role,
      content,
      fields: fields && Object.keys(fields).length > 0 ? fields : null,
    };
    const { data, error } = await getSupabaseAdmin()
      .from("messages")
      .insert(payload)
      .select();

    if (error) {
      console.error(`❌ Supabase 저장 실패:`, error);
      return false;
    }

    console.log(`✅ Supabase 저장 성공: ${role} 메시지`, data);
    return true;
  } catch (err) {
    console.error(`❌ Supabase 저장 실패:`, err instanceof Error ? err.message : err);
    return false;
  }
}

// 대화 시작 시 conversation_id 생성 (없는 경우) - admin client로 보장
async function ensureConversationId(conversationId?: string): Promise<string> {
  const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  try {
    // 1) 이미 유효한 UUID가 넘어오면 upsert 보장
    if (conversationId && isValidUuid(conversationId)) {
      await getSupabaseAdmin().from('conversations')
        .upsert({ id: conversationId }, { onConflict: 'id' });
      return conversationId;
    }

    // 2) 새로 생성
    const { data, error } = await getSupabaseAdmin()
      .from('conversations')
      .insert({})
      .select('id')
      .single();

    if (error) throw error;
    return data.id as string;
  } catch (e) {
    console.error('대화 생성 실패, 로컬 UUID 사용:', e);
    return randomUUID();
  }
}

// ---------- 메인 API 핸들러 ----------
export async function POST(request: NextRequest) {
  try {
    const { message, conversationId } = await request.json();
    
    if (!message || typeof message !== "string") return jsonBadRequest("Invalid message");

    // conversation_id 보장
    const finalConversationId = await ensureConversationId(conversationId);
    
    // 사용자 메시지를 Supabase에 저장
    await saveMessageToSupabase(finalConversationId, "user", message, extractFieldsFrom(message));

    // 대화 프로필 가져오기 및 필드 병합 (저장용)
    const profile = finalConversationId ? await fetchConversationProfile(finalConversationId) : {};
    const newFields = extractFieldsFrom(message);
    const mergedProfile = mergeFields(profile, newFields);

    // 최근 10개 메시지로 맥락 구성
    const recent = finalConversationId ? await fetchRecentMessages(finalConversationId, 10) : [];

    const reply = await runChatAgent(message, recent, { profile: mergedProfile });
 
    // 어시스턴트 메시지 저장 (실패해도 무시)
    try {
      await saveMessageToSupabase(finalConversationId, "assistant", reply, mergedProfile);
    } catch (error) {
      console.error("Supabase 저장 에러:", error);
    }
 
    return NextResponse.json({ content: reply, fields: mergedProfile });

  } catch (error) {
    console.error("API Error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    // 더 구체적인 에러 메시지 제공
    let errorMessage = "분석에 실패했어요. 한 번만 다시 시도해 주세요.";
    
    if (error instanceof Error) {
      if (error.message.includes('Supabase')) {
        errorMessage = "데이터베이스 연결에 문제가 있습니다. 잠시 후 다시 시도해 주세요.";
      } else if (error.message.includes('import') || error.message.includes('module')) {
        errorMessage = "시스템 모듈 로딩에 문제가 있습니다. 잠시 후 다시 시도해 주세요.";
      }
    }
    
    return jsonServerError(errorMessage, process.env.NODE_ENV === 'development' ? (error as any)?.message : undefined);
  }
}