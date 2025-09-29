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

    return NextResponse.json({ plan, pro_until: until });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

