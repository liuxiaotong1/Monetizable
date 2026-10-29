import { NextResponse } from "next/server";
import { currentUser, sameOrigin } from "@/lib/account/auth";
import { requestOptIn, requestOptOut } from "@/lib/newsletter/opt-in";
import { CONSENT_TEXT_VERSION, normalizeLocale } from "@/lib/newsletter/policy";
import { attachNewsletterAccount, findOwnSubscription, NewsletterStorageError } from "@/lib/newsletter/store";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET() {
  const user = await currentUser();
  const email = user?.email?.trim().toLowerCase();
  if (!user || !email) return NextResponse.json({ signedIn: false, status: null, locale: null, consentTextVersion: CONSENT_TEXT_VERSION }, { headers });
  try {
    await attachNewsletterAccount(user.id, email);
    const row = await findOwnSubscription(user.id, email);
    return NextResponse.json({
      signedIn: true,
      status: row?.status ?? null,
      locale: row?.locale ?? null,
      consentTextVersion: CONSENT_TEXT_VERSION,
    }, { headers });
  } catch (error) {
    const message = error instanceof NewsletterStorageError ? "Newsletter storage is not ready." : "Newsletter settings are temporarily unavailable.";
    return NextResponse.json({ signedIn: true, status: null, locale: null, error: message }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  const user = await currentUser();
  const email = user?.email?.trim().toLowerCase();
  if (!user || !email) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers });
  let body: { optIn?: unknown; locale?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400, headers }); }
  if (body.optIn === false) {
    const result = await requestOptOut(user.id, email);
    return NextResponse.json(result.body, { status: result.status, headers });
  }
  if (body.optIn !== true) return NextResponse.json({ error: "optIn must be true or false." }, { status: 400, headers });
  const locale = normalizeLocale(body.locale);
  if (!locale) return NextResponse.json({ error: "Choose English, French, or Chinese." }, { status: 400, headers });
  const result = await requestOptIn({ email, userId: user.id, locale, source: "account_settings", ip: clientIp(request) });
  return NextResponse.json(result.body, { status: result.status, headers });
}
