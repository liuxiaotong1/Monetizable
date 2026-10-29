import { NextResponse } from "next/server";
import { currentUser, sameOrigin } from "@/lib/account/auth";
import { database } from "@/lib/account/db";
import { ensureWebPushStore } from "@/lib/push/store";
import { setAccountLocale } from "@/lib/push/account-locale";
import { savedLocale } from "@/lib/push/locale";

export const dynamic = "force-dynamic";

function safeEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const endpoint = new URL(value);
    const host = endpoint.hostname.toLowerCase();
    const allowed = host === "fcm.googleapis.com" ||
      host === "web.push.apple.com" ||
      host.endsWith(".push.apple.com") ||
      host === "push.services.mozilla.com" ||
      host.endsWith(".push.services.mozilla.com") ||
      host === "notify.windows.com" ||
      host.endsWith(".notify.windows.com");
    return endpoint.protocol === "https:" && allowed;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  try {
    const body = await request.json() as { locale?: unknown; endpoint?: unknown };
    const locale = savedLocale(body.locale);
    if (!locale) return NextResponse.json({ error: "Choose English, French, or Chinese." }, { status: 400 });
    const user = await currentUser();
    await ensureWebPushStore();
    if (user) await setAccountLocale(user.id, locale);
    if (safeEndpoint(body.endpoint)) {
      await database().query(
        `UPDATE public.web_push_subscriptions SET locale = $2, updated_at = now()
         WHERE endpoint = $1 AND (user_id IS NULL OR user_id = $3)`,
        [body.endpoint, locale, user?.id ?? null],
      );
    }
    return NextResponse.json({ ok: true, locale }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Language could not be saved." }, { status: 503 });
  }
}
