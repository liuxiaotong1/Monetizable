import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { database, rateLimit } from "@/lib/account/db";
import { sameOrigin } from "@/lib/account/auth";
import { ensureWebPushStore } from "@/lib/push/store";

export const dynamic = "force-dynamic";

function safeEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const endpoint = new URL(value);
    const host = endpoint.hostname.toLowerCase();
    const allowed = host === "fcm.googleapis.com" ||
      host === "web.push.apple.com" ||
      host === "push.services.mozilla.com" ||
      host.endsWith(".push.services.mozilla.com") ||
      host === "notify.windows.com" ||
      host.endsWith(".notify.windows.com");
    return endpoint.protocol === "https:" && allowed;
  } catch {
    return false;
  }
}
function validKey(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,200}$/.test(value);
}
function getClientKey(request: Request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(address).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 12_000) return NextResponse.json({ error: "Subscription is too large." }, { status: 413 });
    const body = JSON.parse(raw);
    const subscription = body?.subscription;
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    const language = body?.locale;
    const locale = language === "fr" || language === "zh" ? language : "en";
    if (!safeEndpoint(endpoint) || !validKey(p256dh) || !validKey(auth)) {
      return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    }
    if (!(await rateLimit("web-push:" + getClientKey(request), 8, 60))) {
      return NextResponse.json({ error: "Please try again shortly." }, { status: 429 });
    }
    await ensureWebPushStore();
    await database().query(
      `INSERT INTO public.web_push_subscriptions(endpoint, p256dh, auth, locale)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE
       SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
           locale = EXCLUDED.locale, created_at = now(),
           last_sent_on = NULL, last_attempt_on = NULL`,
      [endpoint, p256dh, auth, locale]
    );
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Reminder setup is temporarily unavailable." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  try {
    const body = await request.json();
    if (!safeEndpoint(body?.endpoint)) return NextResponse.json({ error: "Invalid endpoint." }, { status: 400 });
    await ensureWebPushStore();
    await database().query("DELETE FROM public.web_push_subscriptions WHERE endpoint = $1", [body.endpoint]);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Reminder setup is temporarily unavailable." }, { status: 503 });
  }
}
