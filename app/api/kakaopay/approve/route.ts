import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const adminKey = process.env.KAKAOPAY_ADMIN_KEY || "";
  const cid = process.env.KAKAOPAY_CID || "";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  if (!adminKey || !cid || !site) {
    return NextResponse.redirect(`${site || "/"}/chat?upgraded=0`);
  }

  const search = req.nextUrl.searchParams;
  const pgToken = search.get("pg_token");
  const cookieStore = cookies();
  const tid = cookieStore.get("kp_tid")?.value || "";
  const partnerOrderId = cookieStore.get("kp_oid")?.value || "";
  const partnerUserId = "guest";

  if (!pgToken || !tid) {
    return NextResponse.redirect(`${site}/chat?upgraded=0`);
  }

  const body = new URLSearchParams({
    cid,
    tid,
    partner_order_id: partnerOrderId,
    partner_user_id: partnerUserId,
    pg_token: pgToken,
  });

  const r = await fetch("https://kapi.kakao.com/v1/payment/approve", {
    method: "POST",
    headers: {
      Authorization: `KakaoAK ${adminKey}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body,
    cache: "no-store",
  });

  if (!r.ok) {
    return NextResponse.redirect(`${site}/chat?upgraded=0`);
  }

  // 성공: 클라이언트에서 localStorage proAccess=1로 처리하도록 업그레이드 플래그
  return NextResponse.redirect(`${site}/chat?upgraded=1`);
}


