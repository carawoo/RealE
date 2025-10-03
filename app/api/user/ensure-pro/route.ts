import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/server/supabase";

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();
    if (!userId && !email) {
      return NextResponse.json({ ok: false, error: "Missing userId or email" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // 기본 만료일: 30일
    const until = new Date();
    until.setDate(until.getDate() + 30);

    // 이메일이 주어졌고 userId가 없으면 이메일로 user_id 조회
    let finalUserId: string | null = userId || null;
    if (!finalUserId && email) {
      const { data } = await admin.from("auth.users").select("id").eq("email", email).maybeSingle();
      if (data?.id) finalUserId = data.id as unknown as string;
    }

    if (!finalUserId) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // upsert Pro (ENUM/문자열 스키마 호환)
    await admin
      .from("user_plan")
      .upsert(
        {
          user_id: finalUserId,
          plan: "Pro" as any,
          plan_label: "pro",
          pro_until: until.toISOString(),
        },
        { onConflict: "user_id" }
      );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";


