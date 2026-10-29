import { NextResponse } from "next/server";
import { vapidConfig } from "@/lib/push/vapid";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { publicKey: vapidConfig().publicKey },
    { headers: { "Cache-Control": "no-store" } },
  );
}
