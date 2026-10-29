import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { CONSENT_TEXT_VERSION } from "./copy";

export { CONSENT_TEXT_VERSION };

export const LOCALES = ["en", "fr", "zh"] as const;
export type NewsletterLocale = (typeof LOCALES)[number];
export const NEWSLETTER_STATUSES = ["pending", "subscribed", "unsubscribed", "bounced", "complained"] as const;
export type NewsletterStatus = (typeof NEWSLETTER_STATUSES)[number];
export const CONSENT_SOURCES = ["account_settings", "signup"] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];
export const SUBJECT_LIMIT = 200;
export const HTML_LIMIT = 80_000;
export const TEXT_LIMIT = 20_000;

export type Localized = Record<NewsletterLocale, string>;
export type SendRequest = {
  dryRun: boolean;
  testTo: string | null;
  testLocale: NewsletterLocale;
  campaign: { id: string } | { slug: string } | null;
  slug: string | null;
  subject: Localized | null;
  html: Localized | null;
  text: Localized | null;
};

const emptyBucket = () => ({ subscribed: 0, unsubscribed: 0, bounced: 0, complained: 0, pending: 0 });
export type StatusBucket = ReturnType<typeof emptyBucket>;

export function emptyStatusCounts(): Record<NewsletterLocale, StatusBucket> {
  return { en: emptyBucket(), fr: emptyBucket(), zh: emptyBucket() };
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || /[\r\n]/.test(email)) return null;
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) return null;
  return email;
}

export function normalizeLocale(value: unknown): NewsletterLocale | null {
  return value === "en" || value === "fr" || value === "zh" ? value : null;
}

export function consentSource(value: unknown): ConsentSource | null {
  return value === "account_settings" || value === "signup" ? value : null;
}

/** Only an explicit boolean false starts a real send. */
export function parseDryRun(value: unknown): boolean | "invalid" {
  if (value === undefined) return true;
  if (value === true) return true;
  if (value === false) return false;
  return "invalid";
}

export function bearerAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  const supplied = Buffer.from(header ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (supplied.length !== expected.length) {
    timingSafeEqual(expected, expected);
    return false;
  }
  return timingSafeEqual(supplied, expected);
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function validToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43,128}$/.test(value);
}

/** Domain only. The local part of the From address stays on the server. */
export function fromDomain(from: string | undefined | null): string | null {
  if (!from) return null;
  const match = from.match(/@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)/i);
  return match ? match[1].toLowerCase() : null;
}

export function optInDecision(current: NewsletterStatus | null): "confirm" | "already" | "blocked" {
  if (current === "bounced" || current === "complained") return "blocked";
  if (current === "subscribed") return "already";
  return "confirm";
}

export function nextDeliveryStatus(current: NewsletterStatus, event: "bounced" | "complained"): NewsletterStatus {
  if (current === "complained") return "complained";
  return event;
}

export function webhookEffect(type: unknown): "bounced" | "complained" | null {
  if (type === "email.bounced") return "bounced";
  if (type === "email.complained") return "complained";
  return null;
}

export type ProviderHealth = {
  key_valid: boolean;
  from_domain: string | null;
  domain_status: string;
};

export function interpretDomains(status: number, body: unknown, from: string | null): ProviderHealth {
  if (status === 400 || status === 401) {
    return { key_valid: false, from_domain: from, domain_status: "unknown" };
  }
  if (status === 403) return { key_valid: true, from_domain: from, domain_status: "forbidden" };
  if (status < 200 || status >= 300) {
    return { key_valid: false, from_domain: from, domain_status: "unchecked" };
  }
  const list = domainList(body);
  const match = from ? list.find((item) => item.name?.toLowerCase() === from) : undefined;
  const domainStatus = typeof match?.status === "string" && match.status.length < 40
    ? match.status
    : from ? "not_found" : "unknown";
  return { key_valid: true, from_domain: from, domain_status: domainStatus };
}

function domainList(body: unknown): { name?: string; status?: string }[] {
  if (Array.isArray(body)) return body.filter((item) => item && typeof item === "object") as { name?: string; status?: string }[];
  if (!body || typeof body !== "object" || !("data" in body)) return [];
  const data = (body as { data?: unknown }).data;
  return Array.isArray(data) ? data.filter((item) => item && typeof item === "object") as { name?: string; status?: string }[] : [];
}

function readLocalized(value: unknown, max: number): Localized | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const out = {} as Localized;
  for (const locale of LOCALES) {
    const text = record[locale];
    if (typeof text !== "string") return null;
    const clean = text.replace(/\u0000/g, "");
    if (!clean.trim() || clean.length > max) return null;
    out[locale] = clean;
  }
  return out;
}

function cleanSubject(value: Localized): Localized | null {
  const out = {} as Localized;
  for (const locale of LOCALES) {
    const subject = value[locale].replace(/[\r\n]/g, " ").trim();
    if (!subject || subject.length > SUBJECT_LIMIT) return null;
    out[locale] = subject;
  }
  return out;
}

export function cleanSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return null;
  return slug;
}

export function parseCampaignKey(value: unknown): { id: string } | { slug: string } | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) return { id: text.toLowerCase() };
  const slug = cleanSlug(text);
  return slug ? { slug } : null;
}

export function parseSendRequest(body: unknown): { ok: true; value: SendRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid request." };
  const record = body as Record<string, unknown>;
  const dryRun = parseDryRun(record.dry_run);
  if (dryRun === "invalid") return { ok: false, error: "dry_run must be true or false." };
  let testTo: string | null = null;
  if (record.test_to !== undefined && record.test_to !== null && record.test_to !== "") {
    if (typeof record.test_to !== "string") return { ok: false, error: "test_to must be one email address." };
    testTo = normalizeEmail(record.test_to);
    if (!testTo) return { ok: false, error: "test_to must be one email address." };
  }
  const testLocale = record.test_locale === undefined ? "en" : normalizeLocale(record.test_locale);
  if (!testLocale) return { ok: false, error: "test_locale must be en, fr or zh." };
  const hasCampaign = record.campaign_id !== undefined && record.campaign_id !== null && record.campaign_id !== "";
  const campaign = hasCampaign ? parseCampaignKey(record.campaign_id) : null;
  if (hasCampaign && !campaign) return { ok: false, error: "campaign_id must be a campaign id or slug." };
  const slug = record.slug === undefined || record.slug === null || record.slug === "" ? null : cleanSlug(record.slug);
  if ((record.slug !== undefined && record.slug !== null && record.slug !== "") && !slug) {
    return { ok: false, error: "slug must use lowercase letters, numbers and hyphens." };
  }
  const subjectInput = record.subject === undefined ? null : readLocalized(record.subject, SUBJECT_LIMIT);
  if (record.subject !== undefined && !subjectInput) return { ok: false, error: "subject must include en, fr and zh." };
  const subject = subjectInput ? cleanSubject(subjectInput) : null;
  if (subjectInput && !subject) return { ok: false, error: "subject must include en, fr and zh." };
  const html = record.html === undefined ? null : readLocalized(record.html, HTML_LIMIT);
  if (record.html !== undefined && !html) return { ok: false, error: "html must include en, fr and zh." };
  const text = record.text === undefined ? null : readLocalized(record.text, TEXT_LIMIT);
  if (record.text !== undefined && !text) return { ok: false, error: "text must include en, fr and zh." };
  const pieces = [subject, html, text].filter(Boolean).length;
  if (pieces !== 0 && pieces !== 3) return { ok: false, error: "subject, html and text are required together." };
  if (!campaign && pieces !== 3) return { ok: false, error: "Provide campaign_id or subject, html and text." };
  return { ok: true, value: { dryRun, testTo, testLocale, campaign, slug, subject, html, text } };
}

export function publicSendBody(input: {
  dryRun: boolean;
  mode: "campaign" | "test";
  counts: unknown;
  postalConfigured: boolean;
  campaignId?: string;
  slug?: string;
  remaining?: number;
  ok?: boolean;
}) {
  return {
    ok: input.ok ?? true,
    dry_run: input.dryRun,
    mode: input.mode,
    counts: input.counts,
    postal_address_configured: input.postalConfigured,
    ...(input.campaignId ? { campaign_id: input.campaignId } : {}),
    ...(input.slug ? { slug: input.slug } : {}),
    ...(input.remaining === undefined ? {} : { remaining: input.remaining }),
  };
}

export function zeroLocaleCounts(): Record<NewsletterLocale, number> {
  return { en: 0, fr: 0, zh: 0 };
}

export function testLocaleCounts(locale: NewsletterLocale): Record<NewsletterLocale, number> {
  return { en: locale === "en" ? 1 : 0, fr: locale === "fr" ? 1 : 0, zh: locale === "zh" ? 1 : 0 };
}

export function publicError(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 180);
}

export function isMissingRelation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { code?: string }).code === "42P01");
}
