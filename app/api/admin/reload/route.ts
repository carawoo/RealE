import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !service) {
    return NextResponse.json({ ok: false, error: "server not configured" }, { status: 500 });
  }
  const admin = createClient(url, service, { auth: { persistSession: false } });
  try {
    const channel = admin.channel("system:reload");
    await channel.send({ type: "broadcast", event: "reload", payload: { ts: Date.now() } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}


