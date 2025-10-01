import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const nextPath = request.nextUrl.searchParams.get("next") || "/chat";
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");
  const code = request.nextUrl.searchParams.get("code");

  console.log('[OAuth Callback] Request:', {
    error,
    errorDescription,
    hasCode: !!code,
    nextPath,
    origin
  });

  if (error) {
    console.error('[OAuth Callback] OAuth provider error:', error, errorDescription);
    const redirectUrl = new URL("/signin", origin);
    redirectUrl.searchParams.set("redirect", nextPath);
    // error_description이 있으면 더 자세한 정보 전달
    redirectUrl.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    console.warn('[OAuth Callback] No code provided');
    const redirectUrl = new URL("/signin", origin);
    redirectUrl.searchParams.set("redirect", nextPath);
    redirectUrl.searchParams.set("error", "OAuth code missing");
    return NextResponse.redirect(redirectUrl);
  }

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error('[OAuth Callback] Exchange error:', exchangeError);
    const redirectUrl = new URL("/signin", origin);
    redirectUrl.searchParams.set("redirect", nextPath);
    redirectUrl.searchParams.set("error", exchangeError.message);
    return NextResponse.redirect(redirectUrl);
  }

  console.log('[OAuth Callback] Success, redirecting to:', nextPath);
  const redirectUrl = new URL(nextPath, origin);
  return NextResponse.redirect(redirectUrl);
}

