import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { publicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY || "" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
