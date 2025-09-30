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

// 최근 메시지 내용 가져오기 (맥락용) - conversations 테이블 사용
async function fetchRecentMessages(conversationId: string, limit: number = 5): Promise<Array<{ role: Role; content: string }>> {
  if (!conversationId) return [];
  
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("conversations")
      .select("message")
      .eq("id", conversationId)
      .order("kst_timestamp", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("메시지 조회 실패:", error);
      return [];
    }

    return Array.isArray(data) ? data.map((r: any) => ({ 
      role: 'user' as Role, // conversations 테이블에는 role 정보가 없으므로 기본값 사용
      content: String(r.message || '') 
    })) : [];
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
      .from("conversations")
      .select("fields, message")
      .eq("id", conversationId)
      .order("kst_timestamp", { ascending: true });

    if (error) {
      console.error("프로필 조회 실패:", error);
      return {};
    }

    let acc: Fields = {};
    for (const r of data || []) {
      if (r?.fields) acc = mergeFields(acc, r.fields);
      if (r.message) acc = mergeFields(acc, extractFieldsFrom(r.message));
    }
    return acc;
  } catch (err) {
    console.error("프로필 조회 중 오류:", err);
    return {};
  }
}

// Supabase에 메시지 저장 - conversations 테이블 사용 (관리자 권한)
async function saveMessageToSupabase(
  conversationId: string, 
  role: Role, 
  content: string, 
  fields: Fields | null = null
): Promise<boolean> {
  if (!conversationId) {
    console.warn("Supabase 저장 실패: conversationId 누락");
    return false;
  }

  try {
    console.log(`🔄 Supabase 저장 시도: ${role} 메시지, conversationId: ${conversationId}`);
    
    const { data, error } = await getSupabaseAdmin()
      .from("conversations")
      .insert({
        id: conversationId,
        message: content,
        account_id: 'api_user',
        kst_timestamp: new Date().toISOString(),
        timestamp: new Date().toISOString()
      })
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

// 대화 시작 시 conversation_id 생성 (없는 경우)
async function ensureConversationId(conversationId?: string): Promise<string> {
  const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase 환경변수 누락으로 임시 ID 생성");
    return `temp_${Date.now()}`;
  }

  // Provided external conversationId
  if (conversationId) {
    if (!isValidUuid(conversationId)) {
      // Ignore non-UUID external ids; create a proper conversation row
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ created_at: new Date().toISOString() })
        });
        if (response.ok) {
          const [conversation] = await response.json();
          console.log(`✅ 새 대화 생성: ${conversation.id}`);
          return conversation.id;
        }
      } catch (e) {
        console.error('대화 생성 중 오류:', e);
      }
      // 최종 폴백: 로컬에서 UUID 생성 후 upsert 시도
      const localId = randomUUID();
      try {
        const up = await fetch(`${SUPABASE_URL}/rest/v1/conversations?on_conflict=id`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify({ id: localId, created_at: new Date().toISOString() })
        });
        if (up.ok) {
          console.log(`✅ 새 대화 생성(로컬): ${localId}`);
          return localId;
        }
      } catch {}
      console.warn('외부 conversationId가 UUID가 아니어서 로컬 UUID로 대체합니다.');
      return localId;
    }

    // UUID이면 해당 id로 대화 upsert 시도 (없으면 생성)
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/conversations?on_conflict=id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({ id: conversationId, created_at: new Date().toISOString() })
      });
      if (!response.ok) {
        console.warn('대화 upsert 실패, 새로 생성합니다.');
        // Fallback: create new
        const res2 = await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ created_at: new Date().toISOString() })
        });
        if (res2.ok) {
          const [conv] = await res2.json();
          console.log(`✅ 새 대화 생성: ${conv.id}`);
          return conv.id;
        }
        return conversationId; // as-is fallback
      }
      return conversationId;
    } catch (e) {
      console.error('대화 upsert 중 오류:', e);
      return conversationId;
    }
  }

  // No conversationId provided: create new
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        created_at: new Date().toISOString()
      })
    });

    if (response.ok) {
      const [conversation] = await response.json();
      console.log(`✅ 새 대화 생성: ${conversation.id}`);
      return conversation.id;
    } else {
      console.warn("대화 생성 실패, 임시 ID 사용");
      return `temp_${Date.now()}`;
    }
  } catch (error) {
    console.error("대화 생성 중 오류:", error);
    return `temp_${Date.now()}`;
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