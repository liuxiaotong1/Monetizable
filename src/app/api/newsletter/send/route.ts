import { NextResponse } from "next/server";
import { runNewsletterSend } from "@/lib/newsletter/campaign";
import { bearerAuthorized, parseSendRequest } from "@/lib/newsletter/policy";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  if (!bearerAuthorized(request.headers.get("authorization"), process.env.NEWSLETTER_SEND_TOKEN)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > 300_000) return NextResponse.json({ error: "Request is too large." }, { status: 413, headers });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400, headers }); }
  const parsed = parseSendRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers });
  const result = await runNewsletterSend(parsed.value);
  return NextResponse.json(result.body, { status: result.status, headers });
}
