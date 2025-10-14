import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/server/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    // 1. 사용자 찾기 (auth.users는 직접 접근 불가하므로 다른 방법 사용)
    // Supabase Admin API를 통해 사용자 정보 가져오기
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (userError || !userData.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const userId = userData.user.id;
    
    // 2. user_plan 테이블에 레코드 생성
    const { data: planData, error: planError } = await supabase
      .from('user_plan')
      .upsert({
        user_id: userId,
        plan: true,
        plan_label: 'Pro',
        pro_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (planError) {
      console.error("Plan creation error:", planError);
      return NextResponse.json({ error: "Failed to create user plan" }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "User plan created successfully",
      user_id: userId,
      plan: planData
    });
    
  } catch (error) {
    console.error("Fix signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
