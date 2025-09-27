import { NextResponse } from "next/server";
import { testMailgunConnection } from "@/app/api/utils/mail";

export async function GET() {
  try {
    await testMailgunConnection();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("SMTP test failed", error);
    return NextResponse.json({ ok: false, error: error?.message ?? String(error) }, { status: 500 });
  }
}


