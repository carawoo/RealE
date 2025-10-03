import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getSupabaseAdmin } from "@/server/supabase";

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user?.id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const admin = getSupabaseAdmin();
    const until = new Date();
    until.setDate(until.getDate() + 30);

    await admin
      .from("user_plan")
      .upsert(
        {
          user_id: user.id,
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


