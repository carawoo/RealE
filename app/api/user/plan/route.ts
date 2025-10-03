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
    let planLabel: string | null = null;

    if (userId) {
      // user_plan 우선 조회
      let byId = await admin
        .from("user_plan")
        .select("plan, plan_label, pro_until")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (byId.data) {
        console.log('[API] user_plan query result:', byId.data);
        // plan_label을 우선 확인하고, 없으면 plan 컬럼 확인
        planLabel = byId.data.plan_label;
        const planValue = byId.data.plan;
        
        if (planLabel === "pro" || planValue === "pro" || planValue === "Pro") {
          plan = true;
        } else if (planLabel === "plus" || planValue === "plus" || planValue === "Plus") {
          plan = true; // Plus도 Pro로 처리
        } else if (planValue === "RealE" || planValue === "reale") {
          plan = false; // RealE는 무료 플랜
          planLabel = "RealE"; // 무료 플랜일 때 plan_label을 RealE로 설정
        }
        until = byId.data.pro_until ?? null;
        console.log('[API] plan detection result:', { plan, planLabel, until });
      }
    }

    if (plan === null && email) {
      // user_plan에서 이메일로 조회 (LEFT JOIN으로 완화)
      const byEmailInPlan = await admin
        .from("user_plan")
        .select(`
          plan,
          plan_label,
          pro_until,
          auth.users(email),
          user_stats_kst(is_deleted)
        `)
        .eq("auth.users.email", email)
        .maybeSingle();
      
      if (byEmailInPlan.data) {
        // plan_label을 우선 확인하고, 없으면 plan 컬럼 확인
        planLabel = byEmailInPlan.data.plan_label;
        const planValue = byEmailInPlan.data.plan;
        
        if (planLabel === "pro" || planValue === "Pro") {
          plan = true;
        } else if (planLabel === "plus" || planValue === "Plus") {
          plan = true; // Plus도 Pro로 처리
        } else if (planValue === "RealE") {
          plan = false; // RealE는 무료 플랜
          planLabel = "RealE"; // 무료 플랜일 때 plan_label을 RealE로 설정
        }
        until = byEmailInPlan.data.pro_until ?? null;
      } else {
        // user_plan에 없으면 user_stats_kst에서 조회
        const byEmail = await admin
          .from("user_stats_kst")
          .select("id, plan, plan_label, pro_until")
          .eq("email", email)
          .maybeSingle();
        if (byEmail.data) {
          plan = byEmail.data.plan === "Pro" || byEmail.data.plan === "Plus";
          planLabel = byEmail.data.plan_label || (plan ? "pro" : "free");
          until = byEmail.data.pro_until ?? null;
          // 더 이상 자동 동기화하지 않음 (read-only)
        }
      }
    }

    // Pro 사용자인데 만료일이 없는 경우 기본 만료일 설정 (30일 후)
    // read-only 반환만 수행

    return NextResponse.json({ 
      plan,
      pro_until: until,
      plan_label: planLabel || (plan ? "pro" : "RealE")
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

