import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/server/supabase";

export const runtime = "nodejs";

function randomId(): string {
  if ((globalThis as any)?.crypto?.randomUUID) return (globalThis as any).crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function POST(req: NextRequest) {
  const adminKey = process.env.KAKAOPAY_ADMIN_KEY || "";
  const cid = process.env.KAKAOPAY_CID || ""; // 테스트: TC0ONETIME
  const siteEnv = process.env.NEXT_PUBLIC_SITE_URL || "";
  const origin = siteEnv || req.nextUrl.origin;
  const mock = process.env.KAKAOPAY_MOCK === "1" || process.env.NODE_ENV !== "production";
  if ((!adminKey || !cid || !siteEnv) && mock) {
    const { itemName, amount } = await req.json();
    const uuid = randomId();
    const approveUrl = `${origin}/api/kakaopay/approve?pg_token=MOCK&mock=1&oid=${encodeURIComponent(uuid)}`;
    return NextResponse.json({ ok: true, url: approveUrl, mock: true });
  }
  if (!adminKey || !cid || !siteEnv) {
    // 심사/제휴 전: 내부 안내 페이지로 이동시켜 임시 결제안내 노출
    return NextResponse.json({ ok: true, url: "/checkout" });
  }

  try {
    const bodyJson = await req.json();
    const { itemName, amount, targetPlan, userId } = bodyJson || {} as any;
    let totalAmount = Number(amount) || 3900; // 기본: Plus 3,900원
    let name = typeof itemName === "string" && itemName.trim().length > 0 ? itemName : "RealE Plus";

    // 업그레이드 결제 분기: Plus → Pro 시 1,100원(5,000 - 3,900)만 결제
    if (targetPlan === "pro") {
      name = "RealE Pro";
      try {
        const admin = getSupabaseAdmin();
        const uid = typeof userId === "string" && userId.length > 0 ? userId : null;
        if (uid) {
          const byId = await admin
            .from("user_plan")
            .select("plan, plan_label")
            .eq("user_id", uid)
            .maybeSingle();
          const rawPlan: any = byId.data?.plan;
          const rawLabel: any = byId.data?.plan_label;
          const isPlus = (typeof rawPlan === "string" && rawPlan === "Plus") ||
                         (typeof rawLabel === "string" && rawLabel.toLowerCase() === "plus");
          if (isPlus) {
            totalAmount = 1100; // 차액 결제
          } else {
            totalAmount = 5000; // 일반 Pro 결제
          }
        } else {
          // 사용자 식별 불가 시 기본 Pro 가격로 처리(보수적)
          totalAmount = 5000;
        }
      } catch {
        totalAmount = 5000;
      }
    }

    const orderId = randomId();
    const partnerUserId = typeof userId === "string" && userId.length > 0 ? userId : "guest";

    const approvalUrl = `${siteEnv}/api/kakaopay/approve`;
    const cancelUrl = `${siteEnv}/chat`;
    const failUrl = `${siteEnv}/chat`;

    const body = new URLSearchParams({
      cid,
      partner_order_id: orderId,
      partner_user_id: partnerUserId,
      item_name: name,
      quantity: "1",
      total_amount: String(totalAmount),
      tax_free_amount: "0",
      approval_url: approvalUrl,
      cancel_url: cancelUrl,
      fail_url: failUrl,
    });

    const r = await fetch("https://kapi.kakao.com/v1/payment/ready", {
      method: "POST",
      headers: {
        Authorization: `KakaoAK ${adminKey}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body,
      cache: "no-store",
    });

    const data = await r.json();
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: data?.msg || data }, { status: 500 });
    }

    const tid: string = data.tid;
    const nextUrl: string = data.next_redirect_pc_url || data.next_redirect_mobile_url;
    const cookieStore = cookies();
    cookieStore.set("kp_tid", tid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
    cookieStore.set("kp_oid", orderId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });

    return NextResponse.json({ ok: true, url: nextUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}


