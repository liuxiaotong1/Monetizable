import { NextRequest, NextResponse } from "next/server";
import { processGmailPush } from "@/lib/opportunity-agent/gmail-events";

export async function POST(request: NextRequest) {
  const expected = process.env.GMAIL_PUBSUB_VERIFICATION_TOKEN;
  if (!expected || request.nextUrl.searchParams.get("token") !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json() as { message?: { data?: string } };
  if (!payload.message?.data) return NextResponse.json({ ok: true, ignored: true });
  const event = JSON.parse(Buffer.from(payload.message.data, "base64").toString("utf8")) as { emailAddress: string; historyId: string };
  const result = await processGmailPush(event);
  return NextResponse.json({ ok: true, ...result });
}
