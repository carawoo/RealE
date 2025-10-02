import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !serviceRole) {
      return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
    }

    const admin = createClient(url, serviceRole, { auth: { persistSession: false } });

    let plan: boolean | null = null;
    let until: string | null = null;

    if (userId) {
      let byId = await admin
        .from("user_plan")
        .select("plan, plan_label, pro_until")
        .eq("user_id", userId)
        .maybeSingle();
      if (byId.data) {
        plan = byId.data.plan ?? (byId.data.plan_label ? String(byId.data.plan_label).toLowerCase() === "plus" : null);
        until = byId.data.pro_until ?? null;
      }
    }

    if (plan === null && email) {
      const byEmail = await admin
        .from("user_stats_kst")
        .select("plan, plan_label, pro_until")
        .eq("email", email)
        .maybeSingle();
      if (byEmail.data) {
        plan = byEmail.data.plan ?? (byEmail.data.plan_label ? String(byEmail.data.plan_label).toLowerCase() === "plus" : null);
        until = byEmail.data.pro_until ?? null;
      }
    }

    // Pro 사용자인데 만료일이 없는 경우 기본 만료일 설정 (30일 후)
    if (plan === true && !until) {
      const defaultUntil = new Date();
      defaultUntil.setDate(defaultUntil.getDate() + 30);
      until = defaultUntil.toISOString();
      
      // user_plan 테이블에 기본 만료일 업데이트
      if (userId) {
        try {
          await admin
            .from("user_plan")
            .upsert({ 
              user_id: userId, 
              plan: true, 
              plan_label: "plus",
              pro_until: until 
            });
        } catch (updateError) {
          console.warn("Failed to update default expiry date:", updateError);
        }
      }
    }

    return NextResponse.json({ plan, pro_until: until });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

