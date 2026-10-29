import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/account/auth";
import { requestOptIn } from "@/lib/newsletter/opt-in";
import { normalizeEmail, normalizeLocale } from "@/lib/newsletter/policy";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  let body: { optIn?: unknown; email?: unknown; locale?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400, headers }); }
  if (body.optIn !== true) return NextResponse.json({ error: "Newsletter consent must be explicit." }, { status: 400, headers });
  const email = normalizeEmail(body.email);
  const locale = normalizeLocale(body.locale);
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400, headers });
  if (!locale) return NextResponse.json({ error: "Choose English, French, or Chinese." }, { status: 400, headers });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = await requestOptIn({ email, userId: null, locale, source: "signup", ip });
  return NextResponse.json(result.body, { status: result.status, headers });
}
