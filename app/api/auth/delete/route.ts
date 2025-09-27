import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getSupabaseAdmin } from "@/server/supabase";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;

    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = token || session?.access_token;
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    const kakaoIdentity = userData.user.identities?.find((identity) => identity.provider === "kakao");

    const { error: profileError } = await admin.from("profiles").update({ deleted_at: new Date().toISOString() }).eq("id", userId);
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
      console.error("Failed to delete auth user", deleteError.message || deleteError);
      return NextResponse.json({ ok: false, error: "탈퇴 처리 중 오류가 발생했습니다." }, { status: 500 });
    }

    if (kakaoIdentity?.provider_id && process.env.KAKAO_ADMIN_KEY) {
      try {
        const response = await fetch("https://kapi.kakao.com/v1/user/unlink", {
          method: "POST",
          headers: {
            Authorization: `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
          },
          body: new URLSearchParams({ target_id_type: "user_id", target_id: kakaoIdentity.provider_id }),
        });
        if (!response.ok) {
          const text = await response.text();
          console.warn("Failed to unlink Kakao user", response.status, text);
        }
      } catch (unlinkError) {
        console.warn("Kakao unlink error", unlinkError);
      }
    }

    await supabase.auth.signOut();

    console.info("Deleted user", userId, userEmail);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Account deletion error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Server error" }, { status: 500 });
  }
}

