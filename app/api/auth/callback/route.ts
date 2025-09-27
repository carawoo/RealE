import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const nextPath = request.nextUrl.searchParams.get("next") || "/chat";
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");

  if (error) {
    const redirectUrl = new URL("/signin", origin);
    redirectUrl.searchParams.set("redirect", nextPath);
    redirectUrl.searchParams.set("error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = new URL("/signin", origin);
    redirectUrl.searchParams.set("redirect", nextPath);
    redirectUrl.searchParams.set("error", "OAuth code missing");
    return NextResponse.redirect(redirectUrl);
  }

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const redirectUrl = new URL("/signin", origin);
    redirectUrl.searchParams.set("redirect", nextPath);
    redirectUrl.searchParams.set("error", exchangeError.message);
    return NextResponse.redirect(redirectUrl);
  }

  const redirectUrl = new URL(nextPath, origin);
  return NextResponse.redirect(redirectUrl);
}

