// app/api/debug-http/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const sr = process.env.SUPABASE_SERVICE_ROLE!;

  async function call(key: string) {
    const r = await fetch(`${url}/rest/v1/rpc/debug_jwt`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const txt = await r.text();
    try { return { ok: r.ok, status: r.status, body: JSON.parse(txt) }; }
    catch { return { ok: r.ok, status: r.status, body: txt }; }
  }

  const anonRes = await call(anon);
  const srRes = await call(sr);

  // 환경변수 길이도 같이 확인
  const srLen = (process.env.SUPABASE_SERVICE_ROLE || "").length;
  const urlHost = (() => { try { return new URL(url).host; } catch { return url; } })();

  return NextResponse.json({
    env: { urlHost, srLen },
    anon: anonRes,
    service: srRes,
  });
}