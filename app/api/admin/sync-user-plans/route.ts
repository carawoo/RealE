import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !serviceRole) {
      return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
    }

    const admin = createClient(url, serviceRole, { auth: { persistSession: false } });

    // 1. user_stats_kst에서 모든 사용자 정보 조회
    const { data: statsUsers, error: statsError } = await admin
      .from("user_stats_kst")
      .select("id, email, plan, plan_label, pro_until");

    if (statsError) {
      throw new Error(`Failed to fetch user_stats_kst: ${statsError.message}`);
    }

    if (!statsUsers || statsUsers.length === 0) {
      return NextResponse.json({ 
        message: "No users found in user_stats_kst", 
        synced: 0 
      });
    }

    // 2. user_plan에서 기존 사용자들 조회
    const { data: existingPlans, error: planError } = await admin
      .from("user_plan")
      .select("user_id");

    if (planError) {
      throw new Error(`Failed to fetch existing user_plan: ${planError.message}`);
    }

    const existingUserIds = new Set(existingPlans?.map(p => p.user_id) || []);

    // 3. 동기화할 사용자들 필터링 (user_plan에 없는 사용자들만)
    const usersToSync = statsUsers.filter(user => 
      user.id && !existingUserIds.has(user.id)
    );

    if (usersToSync.length === 0) {
      return NextResponse.json({ 
        message: "All users already synced", 
        synced: 0 
      });
    }

    // 4. user_plan에 동기화할 데이터 준비
    const syncData = usersToSync.map(user => {
      const plan = user.plan === "Pro" || user.plan === "Plus" || user.plan === "RealE";
      const planLabel = user.plan_label || (plan ? "plus" : "free");
      
      // 만료일이 없고 Pro/Plus 사용자인 경우 기본 30일 설정
      let proUntil = user.pro_until;
      if (plan && !proUntil) {
        const defaultUntil = new Date();
        defaultUntil.setDate(defaultUntil.getDate() + 30);
        proUntil = defaultUntil.toISOString();
      }

      return {
        user_id: user.id,
        plan: plan,
        plan_label: planLabel,
        pro_until: proUntil,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    // 5. user_plan에 일괄 삽입
    const { data: insertedData, error: insertError } = await admin
      .from("user_plan")
      .insert(syncData)
      .select();

    if (insertError) {
      throw new Error(`Failed to insert user_plan data: ${insertError.message}`);
    }

    return NextResponse.json({
      message: "User plans synced successfully",
      synced: insertedData?.length || 0,
      details: {
        totalStatsUsers: statsUsers.length,
        existingPlanUsers: existingUserIds.size,
        newlySynced: insertedData?.length || 0
      }
    });

  } catch (error: any) {
    console.error("Sync user plans error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync user plans" }, 
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
