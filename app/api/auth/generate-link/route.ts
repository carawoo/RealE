import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// POST /api/auth/generate-link
// Body: { email: string, password?: string, next?: string, type?: 'signup' | 'magiclink' }
// Returns: { link: string }
export async function POST(req: NextRequest) {
  try {
    const { email, password, next, type } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !serviceRole) {
      return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
    }

    const origin = req.nextUrl.origin;
    const redirectTo = `${origin}/api/auth/callback?next=${encodeURIComponent(
      typeof next === "string" && next.length > 0 ? next : "/signin"
    )}`;

    const admin = createClient(url, serviceRole, { auth: { persistSession: false } });

    // Support two modes:
    // - signup (default): creates a new user confirmation link
    // - magiclink: sends a one-click sign-in link (no password)
    const mode = (type === "magiclink" || type === "signup") ? type : "signup";

    const result = await admin.auth.admin.generateLink({
      type: mode === "magiclink" ? "magiclink" : "signup",
      email,
      password: mode === "signup" ? (typeof password === "string" && password.length > 0 ? password : undefined) : undefined,
      options: { redirectTo },
    } as any);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    // Prefer action_link; fallback to email_otp link if provided
    const link = (result.data as any)?.properties?.action_link || (result.data as any)?.properties?.email_otp || null;
    if (!link) {
      return NextResponse.json({ error: "No link generated" }, { status: 500 });
    }

    return NextResponse.json({ link });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}


