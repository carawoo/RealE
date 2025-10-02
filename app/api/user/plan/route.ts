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
      // user_plan과 user_stats_kst를 JOIN하여 삭제 상태 확인
      let byId = await admin
        .from("user_plan")
        .select(`
          plan,
          plan_label,
          pro_until,
          user_stats_kst!inner(is_deleted)
        `)
        .eq("user_id", userId)
        .eq("user_stats_kst.is_deleted", false)
        .maybeSingle();
      
      if (byId.data) {
        // plan_label을 우선 확인하고, 없으면 plan 컬럼 확인
        const planLabel = byId.data.plan_label;
        const planValue = byId.data.plan;
        
        if (planLabel === "pro" || planValue === "Pro") {
          plan = true;
        } else if (planLabel === "plus" || planValue === "Plus") {
          plan = true; // Plus도 Pro로 처리
        } else if (planValue === "RealE") {
          plan = false; // RealE는 무료 플랜
        }
        
        until = byId.data.pro_until ?? null;
      }
    }

    if (plan === null && email) {
      // 먼저 user_plan에서 이메일로 조회 시도 (삭제 상태 확인)
      const byEmailInPlan = await admin
        .from("user_plan")
        .select(`
          plan,
          plan_label,
          pro_until,
          auth.users!inner(email),
          user_stats_kst!inner(is_deleted)
        `)
        .eq("auth.users.email", email)
        .eq("user_stats_kst.is_deleted", false)
        .maybeSingle();
      
      if (byEmailInPlan.data) {
        // plan_label을 우선 확인하고, 없으면 plan 컬럼 확인
        const planLabel = byEmailInPlan.data.plan_label;
        const planValue = byEmailInPlan.data.plan;
        
        if (planLabel === "pro" || planValue === "Pro") {
          plan = true;
        } else if (planLabel === "plus" || planValue === "Plus") {
          plan = true; // Plus도 Pro로 처리
        } else if (planValue === "RealE") {
          plan = false; // RealE는 무료 플랜
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
          plan = byEmail.data.plan === "Pro" || byEmail.data.plan === "Plus" || byEmail.data.plan === "RealE";
          until = byEmail.data.pro_until ?? null;
          
          // user_plan에 자동 동기화
          if (byEmail.data.id) {
            try {
              const planLabel = byEmail.data.plan_label || (plan ? "pro" : "free");
              let proUntil = until;
              
              // 만료일이 없고 Pro/Plus 사용자인 경우 기본 30일 설정
              if (plan && !proUntil) {
                const defaultUntil = new Date();
                defaultUntil.setDate(defaultUntil.getDate() + 30);
                proUntil = defaultUntil.toISOString();
              }
              
              await admin
                .from("user_plan")
                .upsert({
                  user_id: byEmail.data.id,
                  plan: plan ? "Pro" : "RealE",
                  plan_label: planLabel,
                  pro_until: proUntil
                }, { onConflict: 'user_id' });
              
              console.log(`Auto-synced user plan for ${email}`);
            } catch (syncError) {
              console.warn(`Failed to auto-sync user plan for ${email}:`, syncError);
            }
          }
        }
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

    return NextResponse.json({ 
      plan, 
      pro_until: until,
      plan_label: plan ? "pro" : "free"
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

