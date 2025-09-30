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
type Role = "user" | "assistant";
type MessageRow = { role: Role; content: string; fields: Fields | null };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// LLM provider is handled in server/llm

// ---------- Helpers ----------

// 최근 메시지 내용 가져오기 (맥락용) - conversations 테이블 사용
async function fetchRecentMessages(conversationId: string, limit: number = 5): Promise<Array<{ role: Role; content: string }>> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !conversationId) return [];
  const url =
    `${SUPABASE_URL}/rest/v1/conversations` +
    `?select=*` +
    `&id=eq.${conversationId}` +
    `&order=created_at.desc` +
    `&limit=${limit}`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const rows = await res.json();
    // conversations 테이블에서 메시지 데이터 추출 (임시)
    return Array.isArray(rows) ? rows.map((r: any) => ({ 
      role: r.response_type as Role || 'user', 
      content: String(r.message || '') 
    })) : [];
  } catch {
    return [];
  }
}


// ---------- Supabase ----------
async function fetchConversationProfile(conversationId: string): Promise<Fields> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return {};
  const url =
    `${SUPABASE_URL}/rest/v1/conversations` +
    `?select=*` +
    `&id=eq.${conversationId}` +
    `&order=created_at.asc`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return {};
    const rows: any[] = await res.json();
    let acc: Fields = {};
    for (const r of rows) {
      if (r?.fields) acc = mergeFields(acc, r.fields);
      if (r.response_type === "user") acc = mergeFields(acc, extractFieldsFrom(r.message || ''));
    }
    return acc;
  } catch {
    return {};
  }
}

// Supabase에 메시지 저장 - conversations 테이블 사용
async function saveMessageToSupabase(
  conversationId: string, 
  role: Role, 
  content: string, 
  fields: Fields | null = null
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !conversationId) {
    console.warn("Supabase 저장 실패: 환경변수 또는 conversationId 누락");
    return false;
  }

  const attempt = async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: conversationId,
        response_type: role,
        message: content,
        fields: fields,
        account_id: 'api_user',
        kst_timestamp: new Date().toISOString(),
        timestamp: new Date().toISOString()
      })
    });
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch {}
      throw new Error(`${response.status} ${response.statusText} ${detail}`);
    }
  };

  let tries = 0;
  const maxTries = 3;
  while (tries < maxTries) {
    try {
      await attempt();
      console.log(`✅ Supabase 저장 성공: ${role} 메시지`);
      return true;
    } catch (err) {
      tries += 1;
      console.error(`Supabase 저장 실패 (시도 ${tries}/${maxTries}):`, err instanceof Error ? err.message : err);
      if (tries >= maxTries) return false;
      // backoff
      await new Promise(res => setTimeout(res, 150 * tries));
    }
  }
  return false;
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