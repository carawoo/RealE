// app/api/share-raw/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;

  const res = await fetch(`${url}/rest/v1/recommendations`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,      // ← service_role 사용
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ payload_json: [{ ping: "raw", at: new Date().toISOString() }] }),
  });

  const text = await res.text();
  return NextResponse.json({ status: res.status, text });
}