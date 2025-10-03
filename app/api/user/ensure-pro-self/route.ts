import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getSupabaseAdmin } from "@/server/supabase";

export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: false, error: "Removed" }, { status: 410 });
}

export const dynamic = "force-dynamic";


