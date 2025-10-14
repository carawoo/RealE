import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/server/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    // 1. Admin API를 통해 사용자 생성 (트리거 우회)
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // 이메일 인증 없이 바로 활성화
    });
    
    if (createError) {
      console.error("Admin create user error:", createError);
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }
    
    if (!userData.user) {
      return NextResponse.json({ error: "User creation failed" }, { status: 500 });
    }
    
    const userId = userData.user.id;
    console.log("User created successfully:", userId);
    
    // 2. user_plan 테이블에 레코드 생성
    const { data: planData, error: planError } = await supabase
      .from('user_plan')
      .insert({
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
      // 사용자는 생성되었지만 plan 생성 실패
      return NextResponse.json({ 
        success: true, 
        message: "User created but plan creation failed",
        user_id: userId,
        warning: "Plan creation failed"
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "User and plan created successfully",
      user_id: userId,
      plan: planData
    });
    
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
