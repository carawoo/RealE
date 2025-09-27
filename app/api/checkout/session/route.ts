import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn("STRIPE_SECRET_KEY is not set. Checkout session endpoint will return 500.");
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })
  : null;

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ ok: false, error: "Stripe secret not configured" }, { status: 500 });
  }

  try {
    const { priceId, successUrl, cancelUrl } = await req.json();

    if (typeof priceId !== "string" || priceId.trim().length === 0) {
      return NextResponse.json({ ok: false, error: "Missing priceId" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://real-e.space";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: typeof successUrl === "string" && successUrl.length > 0 ? successUrl : `${baseUrl}/chat?upgraded=1`,
      cancel_url: typeof cancelUrl === "string" && cancelUrl.length > 0 ? cancelUrl : `${baseUrl}/chat`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ ok: true, id: session.id, url: session.url });
  } catch (error: any) {
    console.error("Failed to create Stripe checkout session", error);
    return NextResponse.json({ ok: false, error: error?.message || "Failed to create session" }, { status: 500 });
  }
}

