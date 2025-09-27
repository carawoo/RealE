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

    const { error: profileError } = await admin.from("profiles").update({ deleted_at: new Date().toISOString() }).eq("id", userId);
    if (profileError) {
      console.warn("Failed to flag profile as deleted", profileError.message);
    }

    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Account deletion error", error);
    return NextResponse.json({ ok: false, error: error?.message || "Server error" }, { status: 500 });
  }
}

