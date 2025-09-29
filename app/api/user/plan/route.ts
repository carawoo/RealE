import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    let userId: string | undefined;
    let email: string | undefined;
    try {
      const body = await req.json();
      userId = body?.userId;
      email = body?.email;
    } catch {}

    // 빈 요청이면 쿠키의 세션 토큰에서 유저 식별자/이메일을 추출
    if (!userId && !email) {
      const jar = cookies();
      const token = jar.get("sb-access-token")?.value || jar.get("access_token")?.value;
      if (token && token.includes(".")) {
        const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8"));
        userId = payload?.sub ?? userId;
        email = payload?.email ?? email;
      }
    }
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

    // 이메일만 있을 때 user_plan에도 이메일로 조인 시도(보조) - auth.users 조회
    if (plan === null && email) {
      try {
        const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1, email });
        const found = users?.users?.find((u: any) => u.email === email);
        if (found?.id) {
          const byId = await admin
            .from("user_plan")
            .select("plan, plan_label, pro_until")
            .eq("user_id", found.id)
            .maybeSingle();
          if (byId.data) {
            plan = byId.data.plan ?? (byId.data.plan_label ? String(byId.data.plan_label).toLowerCase() === "plus" : null);
            until = byId.data.pro_until ?? null;
          }
        }
      } catch {}
    }

    return NextResponse.json({ plan, pro_until: until });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

