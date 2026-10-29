import "server-only";
import { randomBytes } from "node:crypto";
import { newToken, publicSendBody, testLocaleCounts, type Localized, type NewsletterLocale, type SendRequest } from "./policy";
import { postalLine } from "./messages";
import { sendNewsletterBatch, sendTestNewsletter } from "./mail";
import {
  claimCampaignSends,
  createCampaign,
  finishSends,
  loadCampaign,
  markCampaignSent,
  NewsletterStorageError,
  recordTestSend,
  remainingCampaignSends,
  subscribedTotals,
  subscriberTokenForEmail,
} from "./store";

const BATCH = 50;
const MAX_PER_REQUEST = 200;

type Content = { subject: Localized; html: Localized; text: Localized };

function contentFrom(request: SendRequest, loaded: Content | null): Content | null {
  if (loaded) return loaded;
  if (request.subject && request.html && request.text) return { subject: request.subject, html: request.html, text: request.text };
  return null;
}

function countsResponse(mode: "campaign" | "test", dryRun: boolean, counts: Record<NewsletterLocale, number> | Record<NewsletterLocale, { sent: number; failed: number; skipped: number }>, extra: { campaignId?: string; slug?: string; remaining?: number; ok?: boolean } = {}) {
  return publicSendBody({
    dryRun,
    mode,
    counts,
    postalConfigured: postalLine(process.env.NEWSLETTER_POSTAL_ADDRESS).configured,
    campaignId: extra.campaignId,
    slug: extra.slug,
    remaining: extra.remaining,
    ok: extra.ok,
  });
}

export async function runNewsletterSend(request: SendRequest) {
  try {
    const loaded = request.campaign ? await loadCampaign(request.campaign) : null;
    if (request.campaign && !loaded) return { status: 404 as const, body: { error: "Campaign not found." } };
    const content = contentFrom(request, loaded);
    if (!content) return { status: 400 as const, body: { error: "Provide campaign_id or subject, html and text." } };
    if (request.testTo) return sendTest(request, content, loaded);
    if (request.dryRun) return { status: 200 as const, body: countsResponse("campaign", true, await subscribedTotals()) };
    const campaign = loaded ?? await insertCampaign(request.slug, content);
    if (!campaign) return { status: 409 as const, body: { error: "Campaign slug already exists." } };
    const claimed = await claimCampaignSends(campaign.id, MAX_PER_REQUEST);
    const result = { en: { sent: 0, failed: 0, skipped: 0 }, fr: { sent: 0, failed: 0, skipped: 0 }, zh: { sent: 0, failed: 0, skipped: 0 } };
    for (let index = 0; index < claimed.length; index += BATCH) {
      const slice = claimed.slice(index, index + BATCH);
      const delivered = await sendNewsletterBatch(slice.map((row) => ({
        to: row.email,
        subject: content.subject[row.locale],
        html: content.html[row.locale],
        text: content.text[row.locale],
        token: row.unsubscribe_token,
        locale: row.locale,
        sendId: row.send_id,
      })));
      await finishSends(slice.map((row, offset) => ({
        id: row.send_id,
        status: delivered.ok && delivered.ids[offset] ? "sent" : "failed",
        messageId: delivered.ids[offset],
        error: delivered.ok && delivered.ids[offset] ? null : delivered.error,
      })));
      slice.forEach((row, offset) => {
        const bucket = result[row.locale];
        if (delivered.ok && delivered.ids[offset]) bucket.sent += 1;
        else bucket.failed += 1;
      });
    }
    await markCampaignSent(campaign.id);
    const remaining = await remainingCampaignSends(campaign.id);
    return {
      status: 200 as const,
      body: countsResponse("campaign", false, result, { campaignId: campaign.id, slug: campaign.slug, remaining }),
    };
  } catch (error) {
    if (error instanceof NewsletterStorageError) return { status: 503 as const, body: { error: "Newsletter storage is not ready." } };
    const code = (error as { code?: string }).code;
    if (code === "23505") return { status: 409 as const, body: { error: "Campaign slug already exists." } };
    return { status: 503 as const, body: { error: "Newsletter send is temporarily unavailable." } };
  }
}

async function insertCampaign(slug: string | null, content: Content) {
  const base = slug || `practice-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex")}`;
  try {
    return await createCampaign({ slug: base, ...content });
  } catch (error) {
    if ((error as { code?: string }).code !== "23505" || slug) throw error;
    return createCampaign({ slug: `${base}-${randomBytes(2).toString("hex")}`, ...content });
  }
}

async function sendTest(request: SendRequest, content: Content, existing: { id: string; slug: string } | null) {
  const locale = request.testLocale;
  if (!request.testTo) return { status: 400 as const, body: { error: "test_to must be one email address." } };
  if (request.dryRun) return { status: 200 as const, body: countsResponse("test", true, testLocaleCounts(locale)) };
  const campaign = existing ?? await insertCampaign(request.slug, content);
  if (!campaign) return { status: 409 as const, body: { error: "Campaign slug already exists." } };
  const token = await subscriberTokenForEmail(request.testTo);
  const sent = await sendTestNewsletter({
    to: request.testTo,
    subject: content.subject[locale],
    html: content.html[locale],
    text: content.text[locale],
    token: token || newToken(),
    locale,
  });
  await recordTestSend(campaign.id, locale, sent.id, sent.ok ? null : sent.error);
  const counts = { en: { sent: 0, failed: 0, skipped: 0 }, fr: { sent: 0, failed: 0, skipped: 0 }, zh: { sent: 0, failed: 0, skipped: 0 } };
  counts[locale][sent.ok ? "sent" : "failed"] = 1;
  return {
    status: sent.ok ? 200 as const : 503 as const,
    body: countsResponse("test", false, counts, { campaignId: campaign.id, slug: campaign.slug, ok: sent.ok }),
  };
}

