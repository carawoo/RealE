import { NextResponse } from "next/server";

export function jsonOk(body: any) {
  return NextResponse.json(body);
}

export function jsonBadRequest(message = "Bad Request", details?: string) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function jsonServerError(message = "Server Error", details?: string) {
  return NextResponse.json({ error: message, details }, { status: 500 });
}


