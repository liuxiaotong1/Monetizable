import "server-only";
import { database, rateLimit } from "@/lib/account/db";
import {
  CONSENT_TEXT_VERSION,
  emptyStatusCounts,
  hashToken,
  isMissingRelation,
  newToken,
  optInDecision,
  type ConsentSource,
  type NewsletterLocale,
  type NewsletterStatus,
} from "./policy";

export class NewsletterStorageError extends Error {
  constructor() {
    super("Newsletter storage is not ready.");
    this.name = "NewsletterStorageError";
  }
}

type SubscriberRow = {
  id: string;
  user_id: string | null;
  email: string;
  status: NewsletterStatus;
  locale: NewsletterLocale;
  unsubscribe_token: string;
};

async function query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
  try {
    return await database().query<T>(sql, params);
  } catch (error) {
    if (isMissingRelation(error)) throw new NewsletterStorageError();
    throw error;
  }
}

export async function allowNewsletterAttempt(emailHash: string, ipHash: string) {
  try {
    return (await rateLimit(`newsletter-email:${emailHash}`, 3, 3600)) && (await rateLimit(`newsletter-ip:${ipHash}`, 10, 3600));
  } catch (error) {
    if (isMissingRelation(error)) throw new NewsletterStorageError();
    return false;
  }
}

export async function findOwnSubscription(userId: string, email: string) {
  const { rows } = await query<SubscriberRow>(
    `SELECT id, user_id, email, status, locale, unsubscribe_token
     FROM public.newsletter_subscribers
     WHERE user_id = $1 OR email = $2
     ORDER BY (user_id = $1) DESC
     LIMIT 1`,
    [userId, email],
  );
  return rows[0] ?? null;
}

export async function attachNewsletterAccount(userId: string, email: string) {
  try {
    await query(
      `UPDATE public.newsletter_subscribers
       SET user_id = $1, updated_at = now()
       WHERE email = $2 AND (user_id IS NULL OR user_id = $1)`,
      [userId, email],
    );
  } catch (error) {
    if (error instanceof NewsletterStorageError) return;
    const code = (error as { code?: string }).code;
    if (code === "23505") return;
    throw error;
  }
}

export async function saveOptIn(input: {
  email: string;
  userId: string | null;
  locale: NewsletterLocale;
  source: ConsentSource;
}, attempt = 0): Promise<{ decision: "confirm" | "already" | "blocked"; token: string | null; unsubscribeToken: string | null; locale: NewsletterLocale }> {
  const existing = await query<SubscriberRow>(
    `SELECT id, user_id, email, status, locale, unsubscribe_token
     FROM public.newsletter_subscribers
     WHERE email = $1 OR ($2::uuid IS NOT NULL AND user_id = $2)
     ORDER BY (email = $1) DESC
     LIMIT 1`,
    [input.email, input.userId],
  );
  const current = existing.rows[0] ?? null;
  const decision = optInDecision(current?.status ?? null);
  if (decision === "blocked") return { decision, token: null, unsubscribeToken: null, locale: current?.locale || input.locale };
  if (decision === "already" && current) {
    await query(
      `UPDATE public.newsletter_subscribers
       SET locale = $2,
           user_id = COALESCE(user_id, $3),
           email = CASE WHEN user_id IS NULL OR user_id = $3 THEN $4 ELSE email END,
           updated_at = now()
       WHERE id = $1 AND status = 'subscribed'`,
      [current.id, input.locale, input.userId, input.email],
    );
    return { decision, token: null, unsubscribeToken: null, locale: input.locale };
  }
  const token = newToken();
  const unsubscribeToken = current?.unsubscribe_token || newToken();
  const hash = hashToken(token);
  if (!current) {
    try {
      await query(
        `INSERT INTO public.newsletter_subscribers
          (user_id, email, status, locale, consent_source, consent_text_version, requested_at, unsubscribe_token, confirm_token_hash)
         VALUES ($1, $2, 'pending', $3, $4, $5, now(), $6, $7)`,
        [input.userId, input.email, input.locale, input.source, CONSENT_TEXT_VERSION, unsubscribeToken, hash],
      );
    } catch (error) {
      if ((error as { code?: string }).code !== "23505" || attempt > 0) throw error;
      return saveOptIn(input, attempt + 1);
    }
    return { decision: "confirm", token, unsubscribeToken, locale: input.locale };
  }
  const updated = await query<{ id: string }>(
    `UPDATE public.newsletter_subscribers
     SET status = 'pending',
         locale = $2,
         user_id = COALESCE(user_id, $3),
         email = $4,
         consent_source = $5,
         consent_text_version = $6,
         requested_at = now(),
         confirm_token_hash = $7,
         consent_at = NULL,
         confirmed_at = NULL,
         updated_at = now()
     WHERE id = $1 AND status IN ('pending', 'unsubscribed')
     RETURNING id`,
    [current.id, input.locale, input.userId, input.email, input.source, CONSENT_TEXT_VERSION, hash],
  );
  if (!updated.rows[0]) return { decision: "already", token: null, unsubscribeToken: null, locale: current.locale };
  return { decision: "confirm", token, unsubscribeToken, locale: input.locale };
}

export async function unsubscribeOwned(userId: string, email: string) {
  const { rowCount } = await query(
    `UPDATE public.newsletter_subscribers
     SET status = 'unsubscribed', unsubscribed_at = now(), confirm_token_hash = NULL, updated_at = now()
     WHERE (user_id = $1 OR email = $2) AND status IN ('pending', 'subscribed')`,
    [userId, email],
  );
  return (rowCount ?? 0) > 0;
}

export async function confirmToken(token: string): Promise<{ ok: boolean; locale: NewsletterLocale }> {
  const { rows } = await query<{ locale: NewsletterLocale }>(
    `UPDATE public.newsletter_subscribers
     SET status = 'subscribed', consent_at = now(), confirmed_at = now(), confirm_token_hash = NULL, updated_at = now()
     WHERE confirm_token_hash = $1 AND status = 'pending'
     RETURNING locale`,
    [hashToken(token)],
  );
  if (rows[0]) return { ok: true, locale: rows[0].locale };
  const existing = await query<{ locale: NewsletterLocale }>(
    `SELECT locale FROM public.newsletter_subscribers WHERE confirm_token_hash = $1 LIMIT 1`,
    [hashToken(token)],
  );
  return { ok: false, locale: existing.rows[0]?.locale || "en" };
}

export async function unsubscribeToken(token: string): Promise<NewsletterLocale> {
  const { rows } = await query<{ locale: NewsletterLocale }>(
    `UPDATE public.newsletter_subscribers
     SET status = 'unsubscribed', unsubscribed_at = now(), confirm_token_hash = NULL, updated_at = now()
     WHERE unsubscribe_token = $1 AND status IN ('pending', 'subscribed')
     RETURNING locale`,
    [token],
  );
  if (rows[0]) return rows[0].locale;
  const existing = await query<{ locale: NewsletterLocale }>(
    `SELECT locale FROM public.newsletter_subscribers WHERE unsubscribe_token = $1 LIMIT 1`,
    [token],
  );
  return existing.rows[0]?.locale || "en";
}

export async function localeForToken(kind: "confirm" | "unsubscribe", token: string): Promise<NewsletterLocale> {
  const column = kind === "confirm" ? "confirm_token_hash" : "unsubscribe_token";
  const value = kind === "confirm" ? hashToken(token) : token;
  const { rows } = await query<{ locale: NewsletterLocale }>(
    `SELECT locale FROM public.newsletter_subscribers WHERE ${column} = $1 LIMIT 1`,
    [value],
  );
  return rows[0]?.locale || "en";
}

export async function subscriberTokenForEmail(email: string): Promise<string | null> {
  const { rows } = await query<{ unsubscribe_token: string }>(
    `SELECT unsubscribe_token FROM public.newsletter_subscribers WHERE email = $1 LIMIT 1`,
    [email],
  );
  return rows[0]?.unsubscribe_token ?? null;
}

export async function subscribedCounts() {
  const counts = emptyStatusCounts();
  const { rows } = await query<{ locale: NewsletterLocale; status: NewsletterStatus; count: number }>(
    `SELECT locale, status, count(*)::int AS count
     FROM public.newsletter_subscribers
     GROUP BY locale, status`,
  );
  for (const row of rows) {
    if (counts[row.locale] && row.status in counts[row.locale]) counts[row.locale][row.status] = Number(row.count);
  }
  return counts;
}

export async function subscribedTotals() {
  const totals = { en: 0, fr: 0, zh: 0 };
  const { rows } = await query<{ locale: NewsletterLocale; count: number }>(
    `SELECT locale, count(*)::int AS count
     FROM public.newsletter_subscribers
     WHERE status = 'subscribed'
     GROUP BY locale`,
  );
  for (const row of rows) if (row.locale in totals) totals[row.locale] = Number(row.count);
  return totals;
}

export type CampaignRecord = {
  id: string;
  slug: string;
  subject: Record<NewsletterLocale, string>;
  html: Record<NewsletterLocale, string>;
  text: Record<NewsletterLocale, string>;
};

export async function loadCampaign(key: { id: string } | { slug: string }): Promise<CampaignRecord | null> {
  const column = "id" in key ? "id" : "slug";
  const { rows } = await query<{ id: string; slug: string; subject: CampaignRecord["subject"]; html: CampaignRecord["html"]; text_body: CampaignRecord["text"] }>(
    `SELECT id, slug, subject, html, text_body FROM public.newsletter_campaigns WHERE ${column} = $1 LIMIT 1`,
    ["id" in key ? key.id : key.slug],
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, slug: row.slug, subject: row.subject, html: row.html, text: row.text_body };
}

export async function createCampaign(input: { slug: string; subject: CampaignRecord["subject"]; html: CampaignRecord["html"]; text: CampaignRecord["text"] }) {
  const { rows } = await query<{ id: string; slug: string }>(
    `INSERT INTO public.newsletter_campaigns (slug, subject, html, text_body)
     VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb)
     RETURNING id, slug`,
    [input.slug, JSON.stringify(input.subject), JSON.stringify(input.html), JSON.stringify(input.text)],
  );
  return rows[0];
}

export async function markCampaignSent(id: string) {
  await query(`UPDATE public.newsletter_campaigns SET sent_at = COALESCE(sent_at, now()) WHERE id = $1`, [id]);
}

export type ClaimedSend = { send_id: string; locale: NewsletterLocale; email: string; unsubscribe_token: string };

export async function claimCampaignSends(campaignId: string, limit: number): Promise<ClaimedSend[]> {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`newsletter-send:${campaignId}`]);
    const { rows } = await client.query<ClaimedSend>(
      `WITH targets AS (
         SELECT s.id, s.locale
         FROM public.newsletter_subscribers s
         WHERE s.status = 'subscribed'
           AND NOT EXISTS (
             SELECT 1 FROM public.newsletter_sends n
             WHERE n.campaign_id = $1 AND n.subscriber_id = s.id AND n.status = 'sent'
           )
         ORDER BY s.id
         LIMIT $2
       ),
       upserted AS (
         INSERT INTO public.newsletter_sends (campaign_id, subscriber_id, locale, status)
         SELECT $1, id, locale, 'queued' FROM targets
         ON CONFLICT (campaign_id, subscriber_id) DO UPDATE
           SET status = 'queued', error = NULL, updated_at = now()
           WHERE newsletter_sends.status <> 'sent'
         RETURNING id, subscriber_id, locale
       )
       SELECT u.id AS send_id, u.locale, s.email, s.unsubscribe_token
       FROM upserted u
       JOIN public.newsletter_subscribers s ON s.id = u.subscriber_id
       WHERE s.status = 'subscribed'`,
      [campaignId, limit],
    );
    await client.query("COMMIT");
    return rows;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* The connection may already be closed. */ }
    if (isMissingRelation(error)) throw new NewsletterStorageError();
    throw error;
  } finally {
    client.release();
  }
}

export async function remainingCampaignSends(campaignId: string) {
  const { rows } = await query<{ count: number }>(
    `SELECT count(*)::int AS count
     FROM public.newsletter_subscribers s
     WHERE s.status = 'subscribed'
       AND NOT EXISTS (
         SELECT 1 FROM public.newsletter_sends n
         WHERE n.campaign_id = $1 AND n.subscriber_id = s.id AND n.status = 'sent'
       )`,
    [campaignId],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function finishSends(updates: { id: string; status: "sent" | "failed"; messageId: string | null; error: string | null }[]) {
  if (!updates.length) return;
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    for (const update of updates) {
      await client.query(
        `UPDATE public.newsletter_sends
         SET status = $2, resend_message_id = $3, error = $4, updated_at = now()
         WHERE id = $1 AND status <> 'sent'`,
        [update.id, update.status, update.messageId, update.error],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function recordTestSend(campaignId: string, locale: NewsletterLocale, messageId: string | null, error: string | null) {
  await query(
    `INSERT INTO public.newsletter_sends (campaign_id, subscriber_id, locale, status, resend_message_id, error, test_send)
     VALUES ($1, NULL, $2, $3, $4, $5, true)`,
    [campaignId, locale, messageId ? "sent" : "failed", messageId, error],
  );
}

export async function recentCampaigns() {
  const { rows } = await query<{ id: string; slug: string; created_at: Date; sent_at: Date | null; sent: number; failed: number; skipped: number }>(
    `SELECT c.id, c.slug, c.created_at, c.sent_at,
            count(s.id) FILTER (WHERE s.test_send = false AND s.status = 'sent')::int AS sent,
            count(s.id) FILTER (WHERE s.test_send = false AND s.status = 'failed')::int AS failed,
            count(s.id) FILTER (WHERE s.test_send = false AND s.status = 'skipped')::int AS skipped
     FROM public.newsletter_campaigns c
     LEFT JOIN public.newsletter_sends s ON s.campaign_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at DESC
     LIMIT 10`,
  );
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    created_at: new Date(row.created_at).toISOString(),
    sent_at: row.sent_at ? new Date(row.sent_at).toISOString() : null,
    sent: Number(row.sent),
    failed: Number(row.failed),
    skipped: Number(row.skipped),
  }));
}

export async function applyDeliveryEvent(messageId: string | null, emails: string[], event: "bounced" | "complained") {
  const status = event;
  if (messageId) {
    const byMessage = await query(
      `UPDATE public.newsletter_subscribers n
       SET status = CASE WHEN n.status = 'complained' OR $2 = 'complained' THEN 'complained' ELSE 'bounced' END,
           updated_at = now()
       FROM public.newsletter_sends s
       WHERE s.resend_message_id = $1 AND s.subscriber_id = n.id`,
      [messageId, status],
    );
    if ((byMessage.rowCount ?? 0) > 0) return true;
  }
  if (!emails.length) return false;
  const byEmail = await query(
    `UPDATE public.newsletter_subscribers
     SET status = CASE WHEN status = 'complained' OR $2 = 'complained' THEN 'complained' ELSE 'bounced' END,
         updated_at = now()
     WHERE email = ANY($1::text[])`,
    [emails, status],
  );
  return (byEmail.rowCount ?? 0) > 0;
}
