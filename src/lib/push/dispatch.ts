import "server-only";
import { database } from "@/lib/account/db";
import { foundationFeed } from "@/lib/quest/public-source";
import { refreshEventData } from "@/lib/quest/data-refresh";
import { ensureWebPushStore } from "./store";
import { vapidConfig } from "./vapid";
import { DAILY_CAP, normalizeCategories, normalizeCompanion, normalizeKnowledgeTime, normalizeLocale, planNotifications, safeTimeZone, type PushEvent, type PushJudgment, type PushPlan, type PushProgress } from "./schedule";
import { notificationBody, companionName, eventClock, eventName, PUSH_ICON, type PushCategory } from "./copy";

export interface DispatchResult {
  ok: true;
  sent: number;
  expired: number;
  failed: number;
  skipped: number;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  locale: string;
  companion: string | null;
  time_zone: string | null;
  categories: unknown;
  knowledge_time: string | null;
  user_id: string;
  record: unknown;
  updated_at: string | null;
}

interface WebPush {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string, options: { TTL: number }) => Promise<unknown>;
}

function recordParts(record: unknown) {
  const value = record && typeof record === "object" ? record as { judgments?: PushJudgment[]; progress?: PushProgress[] } : {};
  return {
    judgments: Array.isArray(value.judgments) ? value.judgments : [],
    progress: Array.isArray(value.progress) ? value.progress : [],
  };
}

export async function loadPushContext(now = new Date()) {
  const feed = foundationFeed();
  try { await refreshEventData(feed.state, now); } catch { /* Bundled event templates remain available. */ }
  try {
    const saved = (await database().query("SELECT body FROM quest_shared_data WHERE key = 'market-bars'")).rows[0]?.body as { bars?: { symbol: string; date: string }[] } | undefined;
    if (saved?.bars?.length) feed.state.bars = saved.bars as typeof feed.state.bars;
  } catch { /* Review waits until a verified bar is stored. */ }
  return {
    events: feed.state.events.map((event): PushEvent => ({ id: event.id, kind: event.kind, symbol: event.symbol, at: event.at, status: event.status })),
    bars: feed.state.bars.map((bar) => ({ symbol: bar.symbol, date: bar.date })),
  };
}

async function webPush(): Promise<WebPush | null> {
  const keys = vapidConfig();
  if (!keys.publicKey || !keys.privateKey) return null;
  const loaded = await import("web-push");
  const client = (loaded.default ?? loaded) as WebPush;
  client.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  return client;
}

function ttl(plan: PushPlan) {
  if (plan.category === "premarket" || plan.phase === "soon") return 60 * 60;
  if (plan.category === "knowledge") return 2 * 60 * 60;
  return 4 * 60 * 60;
}

async function deliver(client: WebPush, row: SubscriptionRow, plan: PushPlan, counts: Map<string, number>) {
  const db = database();
  const key = `${row.user_id}:${plan.sentOn}`;
  const claim = await db.query(
    `INSERT INTO public.web_push_deliveries(subscription_id, user_id, category, slot, sent_on)
     SELECT $1, $2, $3, $4, $5::date
     WHERE $4 LIKE 'test:%'
        OR EXISTS (SELECT 1 FROM public.web_push_deliveries WHERE user_id = $2 AND slot = $4)
        OR (SELECT count(DISTINCT slot) FROM public.web_push_deliveries WHERE user_id = $2 AND sent_on = $5::date AND slot NOT LIKE 'test:%') < $6
     ON CONFLICT (subscription_id, slot) DO NOTHING
     RETURNING id`,
    [row.id, row.user_id, plan.category, plan.slot, plan.sentOn, DAILY_CAP],
  );
  if (!claim.rows.length) return "skipped" as const;
  try {
    await client.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify({ title: plan.title, body: plan.body, href: plan.href, icon: plan.icon, badge: plan.badge, image: plan.image, id: plan.slot }),
      { TTL: ttl(plan) },
    );
    counts.set(key, (counts.get(key) || 0) + 1);
    return "sent" as const;
  } catch (error) {
    const status = Number((error as { statusCode?: number }).statusCode || 0);
    if (status === 404 || status === 410) {
      await db.query("DELETE FROM public.web_push_subscriptions WHERE id = $1", [row.id]);
      return "expired" as const;
    }
    await db.query("DELETE FROM public.web_push_deliveries WHERE id = $1", [claim.rows[0].id]);
    return "failed" as const;
  }
}

export async function dispatchPush(now = new Date()): Promise<DispatchResult | { ok: false; error: string }> {
  const client = await webPush();
  if (!client) return { ok: false, error: "Push signing is not configured." };
  await ensureWebPushStore();
  const db = database();
  const { rows } = await db.query(
    `SELECT s.id, s.endpoint, s.p256dh, s.auth, s.locale, s.companion, s.time_zone, s.categories, s.knowledge_time, s.user_id, s.updated_at, p.record
     FROM public.web_push_subscriptions s
     LEFT JOIN public.quest_profiles p ON p.user_id = s.user_id
     WHERE s.user_id IS NOT NULL
     ORDER BY s.updated_at DESC NULLS LAST, s.id`,
  );
  const subscriptions = rows as SubscriptionRow[];
  if (!subscriptions.length) return { ok: true, sent: 0, expired: 0, failed: 0, skipped: 0 };
  const context = await loadPushContext(now);
  const usage = await db.query(
    `SELECT user_id, to_char(sent_on, 'YYYY-MM-DD') AS sent_on, count(DISTINCT slot) FILTER (WHERE slot NOT LIKE 'test:%')::int AS sent
     FROM public.web_push_deliveries
     WHERE sent_on BETWEEN (CURRENT_DATE - 2) AND (CURRENT_DATE + 2)
     GROUP BY user_id, sent_on`,
  );
  const counts = new Map<string, number>();
  for (const row of usage.rows) counts.set(`${row.user_id}:${row.sent_on}`, Number(row.sent));
  const sentSlots = await db.query(
    `SELECT user_id, slot FROM public.web_push_deliveries WHERE sent_on BETWEEN (CURRENT_DATE - 2) AND (CURRENT_DATE + 2) AND slot NOT LIKE 'test:%'`,
  );
  const known = new Map<string, Set<string>>();
  for (const row of sentSlots.rows) {
    const set = known.get(row.user_id) || new Set<string>();
    set.add(row.slot);
    known.set(row.user_id, set);
  }

  const byUser = new Map<string, SubscriptionRow[]>();
  for (const row of subscriptions) {
    const list = byUser.get(row.user_id) || [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  const result: DispatchResult = { ok: true, sent: 0, expired: 0, failed: 0, skipped: 0 };
  for (const [userId, devices] of byUser) {
    const prefs = devices[0];
    const record = recordParts(prefs.record);
    const locale = normalizeLocale(prefs.locale);
    const zone = safeTimeZone(prefs.time_zone);
    const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const plans = planNotifications({
      now,
      events: context.events,
      bars: context.bars,
      judgments: record.judgments,
      progress: record.progress,
      categories: normalizeCategories(prefs.categories),
      timeZone: zone,
      knowledgeTime: normalizeKnowledgeTime(prefs.knowledge_time),
      locale,
      companion: normalizeCompanion(prefs.companion),
      sentToday: counts.get(`${userId}:${localDate}`) || 0,
      sentSlots: [...(known.get(userId) || [])],
    });
    const delivered = new Set<string>();
    for (const plan of plans) {
      for (const device of devices) {
        const outcome = await deliver(client, device, plan, counts);
        if (outcome === "sent") {
          result.sent += 1;
          delivered.add(plan.slot);
        } else if (outcome === "expired") result.expired += 1;
        else if (outcome === "failed") result.failed += 1;
        else result.skipped += 1;
      }
    }
    if (delivered.size) known.set(userId, new Set([...(known.get(userId) || []), ...delivered]));
  }
  return result;
}

export function testPlan(input: { category: PushCategory; phase?: "eve" | "soon"; locale: ReturnType<typeof normalizeLocale>; companion: ReturnType<typeof normalizeCompanion> }): PushPlan {
  const event = input.category === "event" ? { id: "test-cpi", kind: "CPI", at: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(), status: "scheduled" } : undefined;
  const icon = PUSH_ICON[input.companion];
  const phase = input.category === "event" ? input.phase || "eve" : undefined;
  const href = input.category === "premarket"
    ? (input.locale === "zh" ? "/?view=today#judgment" : "/?view=today#en-judgment")
    : input.category === "review"
      ? (input.locale === "zh" ? "/?view=today#hero-review-facts" : "/?view=today#fact-trail-review:test")
      : input.category === "knowledge"
        ? "/?view=learn"
        : "/?view=events&event=test-cpi";
  return {
    category: input.category,
    phase,
    slot: `test:${input.category}:${phase || "once"}:${Date.now()}`,
    sentOn: new Date().toISOString().slice(0, 10),
    title: companionName(input.companion, input.locale),
    body: notificationBody({
      locale: input.locale,
      companion: input.companion,
      category: input.category,
      phase,
      eventName: event ? eventName(event, input.locale) : undefined,
      eventTime: event ? eventClock(event.at, input.locale) : undefined,
    }),
    href,
    icon,
    badge: icon,
    image: icon,
  };
}

export async function sendTestPush(userId: string, category: PushCategory, phase?: "eve" | "soon") {
  const client = await webPush();
  if (!client) return { ok: false as const, error: "Push signing is not configured." };
  await ensureWebPushStore();
  const { rows } = await database().query(
    `SELECT id, endpoint, p256dh, auth, locale, companion, time_zone, categories, knowledge_time, user_id, updated_at, NULL::jsonb AS record
     FROM public.web_push_subscriptions WHERE user_id = $1 ORDER BY updated_at DESC NULLS LAST`,
    [userId],
  );
  const devices = rows as SubscriptionRow[];
  if (!devices.length) return { ok: false as const, error: "This account has no notification subscription yet." };
  const prefs = devices[0];
  const plan = testPlan({ category, phase, locale: normalizeLocale(prefs.locale), companion: normalizeCompanion(prefs.companion) });
  let sent = 0, expired = 0, failed = 0;
  for (const device of devices) {
    const outcome = await deliver(client, device, plan, new Map());
    if (outcome === "sent") sent += 1;
    else if (outcome === "expired") expired += 1;
    else if (outcome === "failed") failed += 1;
  }
  return { ok: true as const, sent, expired, failed };
}
