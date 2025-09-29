// app/api/share/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
export const runtime = "nodejs";

async function whoAmI(url: string, key: string) {
  const r = await fetch(`${url}/rest/v1/rpc/debug_jwt`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  });
  try { return await r.json(); } catch { return { raw: await r.text() }; }
}

export async function POST(req: Request) {
  try {
    const { msgs } = await req.json();
    if (!Array.isArray(msgs) || msgs.length === 0) {
      return NextResponse.json({ ok: false, error: "대화 내용이 비어 있습니다." }, { status: 400 });
    }

    // 현재 로그인한 사용자 ID를 얻어 저장(없으면 익명 공유)
    let userId: string | null = null;
    try {
      const supabase = createRouteHandlerClient({ cookies });
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user?.id ?? null;
    } catch {}

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE || "";

    if (!url || !serviceKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "SUPABASE_SERVICE_ROLE (and NEXT_PUBLIC_SUPABASE_URL) env is missing. Set it in .env(.local) and restart the dev server.",
        },
        { status: 500 }
      );
    }

    // 고정 슬러그/UUID 생성(테이블 제약 대응: slug NOT NULL 등)
    const uuid = (globalThis as any)?.crypto?.randomUUID
      ? (globalThis as any).crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const slug = uuid;

    // 제목 컬럼 NOT NULL 대응: 첫 메시지에서 간단히 제목 생성
    const firstContent = (() => {
      try {
        for (const m of msgs as any[]) {
          const text = typeof m?.text === "string" ? m.text : m?.content;
          if (typeof text === "string" && text.trim()) return text.trim();
        }
      } catch {}
      return "";
    })();
    const title = firstContent ? firstContent.slice(0, 40) : "RealE 상담 기록";

    const res = await fetch(`${url}/rest/v1/recommendations`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      // 일부 스키마에서 slug NOT NULL, id 수동 지정이 필요할 수 있어 같이 전달
      body: JSON.stringify({
        id: uuid,
        slug,
        payload_json: msgs,
        user_id: userId,
        is_public: true,
        title,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, status: res.status, error: text, urlHost: new URL(url).host },
        { status: 500 }
      );
    }

    const row = JSON.parse(text)[0] ?? {};
    const outSlug = row.slug ?? row.id ?? slug;
    return NextResponse.json({ ok: true, url: `/r/${outSlug}`, urlHost: new URL(url).host });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}