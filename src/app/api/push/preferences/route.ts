import { NextResponse } from "next/server";
import { currentUser, sameOrigin } from "@/lib/account/auth";
import { database } from "@/lib/account/db";
import { ensureWebPushStore } from "@/lib/push/store";
import { defaultCategories, normalizeCategories, normalizeCompanion, normalizeKnowledgeTime, normalizeLocale, safeTimeZone } from "@/lib/push/schedule";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null, subscribed: false, categories: defaultCategories(), knowledgeTime: "12:30" }, { headers });
  try {
    await ensureWebPushStore();
    const { rows } = await database().query(
      `SELECT locale, companion, time_zone, categories, knowledge_time, endpoint
       FROM public.web_push_subscriptions WHERE user_id = $1 ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
      [user.id],
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ user: { id: user.id }, subscribed: false, categories: defaultCategories(), knowledgeTime: "12:30" }, { headers });
    return NextResponse.json({
      user: { id: user.id },
      subscribed: true,
      endpoint: row.endpoint,
      locale: normalizeLocale(row.locale),
      companion: normalizeCompanion(row.companion),
      timeZone: row.time_zone,
      categories: normalizeCategories(row.categories),
      knowledgeTime: normalizeKnowledgeTime(row.knowledge_time),
    }, { headers });
  } catch {
    return NextResponse.json({ error: "Reminder settings are temporarily unavailable." }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const categories = normalizeCategories(body.categories);
    const knowledgeTime = normalizeKnowledgeTime(body.knowledgeTime);
    const companion = body.companion === undefined ? null : normalizeCompanion(body.companion);
    const locale = body.locale === undefined ? null : normalizeLocale(body.locale);
    const timeZone = body.timeZone === undefined ? null : safeTimeZone(body.timeZone);
    await ensureWebPushStore();
    const { rowCount } = await database().query(
      `UPDATE public.web_push_subscriptions
       SET categories = $2::jsonb, knowledge_time = $3,
           companion = COALESCE($4, companion), locale = COALESCE($5, locale),
           time_zone = COALESCE($6, time_zone), updated_at = now()
       WHERE user_id = $1`,
      [user.id, JSON.stringify(categories), knowledgeTime, companion, locale, timeZone],
    );
    return NextResponse.json({ ok: true, subscribed: (rowCount || 0) > 0, categories, knowledgeTime }, { headers });
  } catch {
    return NextResponse.json({ error: "Reminder settings are temporarily unavailable." }, { status: 503, headers });
  }
}
