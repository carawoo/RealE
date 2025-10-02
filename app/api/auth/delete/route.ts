import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getSupabaseAdmin } from "@/server/supabase";
import { unlinkKakaoUser } from "@/server/providers/kakao";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;

    // Supabase session (cookie 기반)
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = token || session?.access_token || undefined;
    if (!accessToken && !session?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    // 1) 토큰으로 조회 시도, 실패하면 세션 쿠키의 user 사용
    let userId: string | null = null;
    let userEmail: string | null = null;
    let userData: any = null;
    if (accessToken) {
      const { data } = await admin.auth.getUser(accessToken);
      userData = data;
      if (data?.user) {
        userId = data.user.id;
        userEmail = data.user.email ?? null;
      }
    }
    if (!userId && session?.user) {
      userId = session.user.id;
      userEmail = session.user.email ?? null;
    }
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }
    const identities: any[] = (userData?.user?.identities as any[]) || (session?.user?.identities as any[]) || [];
    const kakaoIdentity = identities.find((identity: any) => identity?.provider === "kakao");
    let kakaoTargetId: string | null = null;
    if (kakaoIdentity) {
      const providerId = (kakaoIdentity as any)?.provider_id;
      const identityData = (kakaoIdentity as any)?.identity_data as Record<string, unknown> | undefined;
      kakaoTargetId =
        (identityData?.id && String(identityData.id)) ||
        (identityData?.user_id && String(identityData.user_id)) ||
        (identityData?.sub && String(identityData.sub)) ||
        (typeof providerId === "string" && providerId.length > 0 ? providerId : null);
    }

    const profileUpdate: Record<string, any> = { deleted_at: new Date().toISOString(), is_deleted: true };
    const { error: profileError } = await admin.from("profiles").update(profileUpdate).eq("id", userId);
    if (profileError) {
      console.warn("Failed to flag profile as deleted", profileError.message);
    }

    const { error: messagesError } = await admin.from("messages").delete().eq("user_id", userId);
    if (messagesError) {
      console.warn("Failed to purge user messages", messagesError.message);
    }

    const { error: conversationsError } = await admin.from("conversations").delete().eq("user_id", userId);
    if (conversationsError) {
      console.warn("Failed to purge conversations", conversationsError.message);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      // 일부 케이스(이미 삭제 등)에서는 오류지만, 클라이언트 UX를 위해 200을 반환
      console.warn("Failed to delete auth user", deleteError.message || deleteError);
    }

    if (kakaoTargetId && process.env.KAKAO_ADMIN_KEY) {
      try {
        await unlinkKakaoUser({ targetId: kakaoTargetId, adminKey: process.env.KAKAO_ADMIN_KEY });
      } catch (unlinkError) {
        console.warn("Kakao unlink error", unlinkError);
      }
    } else if (kakaoIdentity && !process.env.KAKAO_ADMIN_KEY) {
      console.warn("Skipping Kakao unlink: KAKAO_ADMIN_KEY is not configured");
    }

    // 세션 정리는 실패해도 무시
    try { await supabase.auth.signOut(); } catch {}

    console.info("Deleted user", userId, userEmail);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Account deletion error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Server error" }, { status: 500 });
  }
}

