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
    const { itemName, amount } = await req.json();
    const totalAmount = Number(amount) || 3900;
    const name = typeof itemName === "string" && itemName.trim().length > 0 ? itemName : "RealE Plus";

    const orderId = randomId();
    const userId = "guest"; // 선택: 필요 시 세션에서 사용자 ID를 읽어 대입

    const approvalUrl = `${siteEnv}/api/kakaopay/approve`;
    const cancelUrl = `${siteEnv}/chat`;
    const failUrl = `${siteEnv}/chat`;

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


