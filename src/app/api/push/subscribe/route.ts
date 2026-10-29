import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { database, rateLimit } from "@/lib/account/db";
import { currentUser, sameOrigin } from "@/lib/account/auth";
import { ensureWebPushStore } from "@/lib/push/store";
import { normalizeCategories, normalizeCompanion, normalizeKnowledgeTime, normalizeLocale, safeTimeZone } from "@/lib/push/schedule";

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
      host.endsWith(".notify.windows.com") ||
      host === "updates.push.services.mozilla.com" ||
      host.endsWith(".push.apple.com");
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
function preferenceValues(body: Record<string, unknown>) {
  return {
    locale: normalizeLocale(body.locale),
    companion: normalizeCompanion(body.companion),
    timeZone: safeTimeZone(body.timeZone),
    categories: normalizeCategories(body.categories),
    knowledgeTime: normalizeKnowledgeTime(body.knowledgeTime),
  };
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to turn on reminders." }, { status: 401 });
  try {
    const raw = await request.text();
    if (raw.length > 12_000) return NextResponse.json({ error: "Subscription is too large." }, { status: 413 });
    const body = JSON.parse(raw) as Record<string, unknown>;
    const subscription = body.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    if (!safeEndpoint(endpoint) || !validKey(p256dh) || !validKey(auth)) {
      return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    }
    if (!(await rateLimit("web-push:" + getClientKey(request), 8, 60))) {
      return NextResponse.json({ error: "Please try again shortly." }, { status: 429 });
    }
    const prefs = preferenceValues(body);
    await ensureWebPushStore();
    await database().query(
      `INSERT INTO public.web_push_subscriptions(endpoint, p256dh, auth, locale, user_id, companion, time_zone, categories, knowledge_time, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, now())
       ON CONFLICT (endpoint) DO UPDATE
       SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, locale = EXCLUDED.locale,
           user_id = EXCLUDED.user_id, companion = EXCLUDED.companion, time_zone = EXCLUDED.time_zone,
           categories = EXCLUDED.categories, knowledge_time = EXCLUDED.knowledge_time, updated_at = now()`,
      [endpoint, p256dh, auth, prefs.locale, user.id, prefs.companion, prefs.timeZone, JSON.stringify(prefs.categories), prefs.knowledgeTime],
    );
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Reminder setup is temporarily unavailable." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    const body = await request.json();
    if (!safeEndpoint(body?.endpoint)) return NextResponse.json({ error: "Invalid endpoint." }, { status: 400 });
    await ensureWebPushStore();
    await database().query("DELETE FROM public.web_push_subscriptions WHERE endpoint = $1 AND (user_id = $2 OR user_id IS NULL)", [body.endpoint, user.id]);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Reminder setup is temporarily unavailable." }, { status: 503 });
  }
}
