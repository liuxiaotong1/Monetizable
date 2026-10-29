import { NextResponse } from "next/server";
import { normalizeEmail, webhookEffect } from "@/lib/newsletter/policy";
import { applyDeliveryEvent, NewsletterStorageError } from "@/lib/newsletter/store";
import { verifyWebhookSignature } from "@/lib/newsletter/webhook";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: true, applied: false }, { headers });
  const payload = await request.text();
  const verified = verifyWebhookSignature(payload, {
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
  }, secret);
  if (!verified) return NextResponse.json({ error: "Invalid signature." }, { status: 401, headers });
  let event: { type?: unknown; data?: { email_id?: unknown; to?: unknown } };
  try { event = JSON.parse(payload) as typeof event; } catch { return NextResponse.json({ ok: true, applied: false }, { headers }); }
  const effect = webhookEffect(event.type);
  if (!effect) return NextResponse.json({ ok: true, applied: false }, { headers });
  const messageId = typeof event.data?.email_id === "string" ? event.data.email_id.slice(0, 120) : null;
  const emails = Array.isArray(event.data?.to) ? event.data.to.flatMap((value) => { const email = normalizeEmail(value); return email ? [email] : []; }) : [];
  try {
    const applied = await applyDeliveryEvent(messageId, emails, effect);
    return NextResponse.json({ ok: true, applied }, { headers });
  } catch (error) {
    const status = error instanceof NewsletterStorageError ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? "Newsletter storage is not ready." : "Webhook could not be stored." }, { status, headers });
  }
}
