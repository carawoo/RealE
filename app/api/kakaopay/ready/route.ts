import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

function randomId(): string {
  if ((globalThis as any)?.crypto?.randomUUID) return (globalThis as any).crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function POST(req: NextRequest) {
  const adminKey = process.env.KAKAOPAY_ADMIN_KEY || "";
  const cid = process.env.KAKAOPAY_CID || ""; // 테스트: TC0ONETIME
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  if (!adminKey || !cid || !site) {
    return NextResponse.json(
      { ok: false, error: "KakaoPay env missing (KAKAOPAY_ADMIN_KEY, KAKAOPAY_CID, NEXT_PUBLIC_SITE_URL)" },
      { status: 500 }
    );
  }

  try {
    const { itemName, amount } = await req.json();
    const totalAmount = Number(amount) || 3900;
    const name = typeof itemName === "string" && itemName.trim().length > 0 ? itemName : "RealE Plus";

    const orderId = randomId();
    const userId = "guest"; // 선택: 필요 시 세션에서 사용자 ID를 읽어 대입

    const approvalUrl = `${site}/api/kakaopay/approve`;
    const cancelUrl = `${site}/chat`;
    const failUrl = `${site}/chat`;

    const body = new URLSearchParams({
      cid,
      partner_order_id: orderId,
      partner_user_id: userId,
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


