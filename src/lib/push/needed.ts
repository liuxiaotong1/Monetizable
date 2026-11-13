import "server-only";
import { database } from "@/lib/account/db";
import { sessionFor } from "@/lib/quest/domain";
import { DAILY_CAP, knowledgeReminderOpen, marketReminderOpen, zonedParts } from "./schedule";
import { normalizeCategories } from "./prefs";

interface SubscriptionClock {
  id: string;
  user_id: string | null;
  time_zone: string | null;
  categories: unknown;
  knowledge_time: string | null;
}

const idle = { ok: true as const, sent: 0, expired: 0, failed: 0, skipped: 0 };
export const idleDispatch = idle;

/**
 * True when at least one subscription could receive a reminder right now.
 * One indexed read, then the delivery counts only if a clock is actually open.
 * A storage failure returns true so the full path can still try.
 */
export async function subscriptionsNeedDispatch(now = new Date()) {
  let rows: SubscriptionClock[];
  try {
    const result = await database().query(
      `SELECT id::text, user_id::text, time_zone, categories, knowledge_time
       FROM public.web_push_subscriptions`,
    );
    rows = result.rows as SubscriptionClock[];
  } catch {
    return true;
  }
  if (!rows.length) return false;
  const market = marketReminderOpen(now);
  const open = rows.filter((row) => {
    const categories = normalizeCategories(row.categories);
    if (categories.knowledge && knowledgeReminderOpen(now, row.time_zone, row.knowledge_time)) return true;
    if (!market.trading) return false;
    return (categories.premarket && market.premarket) || (categories.review && market.review) || (categories.event && market.event);
  });
  if (!open.length) return false;
  let counts = new Map<string, number>();
  let slots = new Map<string, Set<string>>();
  try {
    const usage = await database().query(
      `SELECT COALESCE(user_id::text, 'guest:' || subscription_id::text) AS owner,
              to_char(sent_on, 'YYYY-MM-DD') AS sent_on,
              count(DISTINCT slot) FILTER (WHERE slot NOT LIKE 'test:%')::int AS sent
       FROM public.web_push_deliveries
       WHERE sent_on BETWEEN (CURRENT_DATE - 2) AND (CURRENT_DATE + 2)
       GROUP BY 1, 2`,
    );
    counts = new Map(usage.rows.map((row) => [`${row.owner}:${row.sent_on}`, Number(row.sent)]));
    const sent = await database().query(
      `SELECT COALESCE(user_id::text, 'guest:' || subscription_id::text) AS owner, slot
       FROM public.web_push_deliveries
       WHERE sent_on BETWEEN (CURRENT_DATE - 2) AND (CURRENT_DATE + 2) AND slot NOT LIKE 'test:%'`,
    );
    slots = new Map();
    for (const row of sent.rows) {
      const set = slots.get(row.owner) || new Set<string>();
      set.add(row.slot);
      slots.set(row.owner, set);
    }
  } catch {
    return true;
  }
  const sessionDate = sessionFor(now).date;
  for (const row of open) {
    const categories = normalizeCategories(row.categories);
    const owner = row.user_id || `guest:${row.id}`;
    const localDate = zonedParts(now, row.time_zone || "Europe/Paris").date;
    if ((counts.get(`${owner}:${localDate}`) || 0) >= DAILY_CAP) continue;
    const known = slots.get(owner) || new Set<string>();
    if (categories.knowledge && knowledgeReminderOpen(now, row.time_zone, row.knowledge_time) && !known.has(`knowledge:${localDate}`)) return true;
    if (!market.trading) continue;
    if (categories.premarket && market.premarket && !known.has(`premarket:${sessionDate}`)) return true;
    if (categories.review && market.review && !known.has(`review:${sessionDate}`)) return true;
    if (categories.event && market.event) return true;
  }
  return false;
}

/** Collapse overlapping cron ticks. A pass that already started this interval does the sending. */
export async function claimDispatchPass() {
  try {
    const claimed = await database().query(
      `INSERT INTO quest_shared_data(key, body)
       VALUES ('push-dispatch-pass', jsonb_build_object('at', to_jsonb(now())))
       ON CONFLICT (key) DO UPDATE
         SET body = jsonb_build_object('at', to_jsonb(now())), updated_at = now()
         WHERE quest_shared_data.updated_at < now() - interval '10 minutes'
       RETURNING key`,
    );
    return claimed.rows.length > 0;
  } catch {
    return true;
  }
}
