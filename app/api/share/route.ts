// app/api/share/route.ts
import { NextResponse } from "next/server";
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

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE!;
    const rolePeek = await whoAmI(url, serviceKey); // ← 지금 역할 확인

    const res = await fetch(`${url}/rest/v1/recommendations`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ payload_json: msgs }),
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, status: res.status, error: text, rolePeek, urlHost: new URL(url).host },
        { status: 500 }
      );
    }

    const row = JSON.parse(text)[0] ?? {};
    const slug = row.public_id ?? row.id;
    return NextResponse.json({ ok: true, url: `/r/${slug}`, rolePeek, urlHost: new URL(url).host });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}