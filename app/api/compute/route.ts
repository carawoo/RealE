// app/api/compute/route.ts
// 새로운 전문가 시스템 기반 API

import { NextRequest, NextResponse } from "next/server";
import { routeUserMessage, postProcessResponse, generateFallbackResponse } from "../../../lib/smart-router";
import { 
  Fields, 
  extractFieldsFrom, 
  mergeFields, 
  isNumbersOnlyAsk, 
  replyNumbersOnly
} from "../../../lib/utils";
import { 
  CURRENT_LOAN_POLICY, 
  checkPolicyDataFreshness
} from "../../../lib/policy-data";

type Role = "user" | "assistant";
type MessageRow = { role: Role; content: string; fields: Fields | null };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 정책 데이터 신선도 확인
checkPolicyDataFreshness();

// ---------- Helpers ----------
function generateUuidV4(): string {
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return template.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------- Supabase ----------
async function fetchConversationProfile(conversationId: string): Promise<Fields> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return {};
  const url =
    `${SUPABASE_URL}/rest/v1/messages` +
    `?select=fields,role,content,created_at` +
    `&conversation_id=eq.${conversationId}` +
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
    const rows: MessageRow[] = await res.json();
    let acc: Fields = {};
    for (const r of rows) {
      if (r?.fields) acc = mergeFields(acc, r.fields);
      if (r.role === "user") acc = mergeFields(acc, extractFieldsFrom(r.content));
    }
    return acc;
  } catch {
    return {};
  }
}

// Supabase에 메시지 저장
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
    const response = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        role: role,
        content: content,
        fields: fields
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
      const localId = generateUuidV4();
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
    
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    // conversation_id 보장
    const finalConversationId = await ensureConversationId(conversationId);
    
    // 사용자 메시지를 Supabase에 저장
    await saveMessageToSupabase(finalConversationId, "user", message, extractFieldsFrom(message));

    // 대화 프로필 가져오기
    const profile = finalConversationId ? await fetchConversationProfile(finalConversationId) : {};
    
    // 새 메시지에서 필드 추출 및 병합
    const newFields = extractFieldsFrom(message);
    const mergedProfile = mergeFields(profile, newFields);

    // 숫자만 요청 처리 (기존 로직 유지)
    if (isNumbersOnlyAsk(message)) {
      const numbers = replyNumbersOnly(mergedProfile);
      const response = {
        content: numbers,
        fields: mergedProfile
      };
      
      // assistant 메시지를 Supabase에 저장
      await saveMessageToSupabase(finalConversationId, "assistant", numbers, mergedProfile);
      
      return NextResponse.json(response);
    }

    // 새로운 전문가 시스템으로 라우팅
    let smartResponse = routeUserMessage(message, mergedProfile);
    
    // 라우팅 실패 시 폴백 처리
    if (!smartResponse) {
      smartResponse = generateFallbackResponse(message, mergedProfile);
    }
    
    // 응답 후처리
    smartResponse = postProcessResponse(smartResponse, message);
    
    // Supabase에 저장
    if (smartResponse.content) {
      await saveMessageToSupabase(finalConversationId, "assistant", smartResponse.content, mergedProfile);
    }
    
    // 응답 반환 (기존 형식 유지)
    const response = {
      content: smartResponse.content,
      cards: smartResponse.cards,
      checklist: smartResponse.checklist,
      fields: mergedProfile
    };
    
    return NextResponse.json(response);

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}