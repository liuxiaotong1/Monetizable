import "server-only";
import { createHash } from "node:crypto";
import { sendConfirmation } from "./mail";
import { normalizeEmail, type ConsentSource, type NewsletterLocale } from "./policy";
import { allowNewsletterAttempt, saveOptIn, unsubscribeOwned, NewsletterStorageError } from "./store";

export async function requestOptIn(input: {
  email: string;
  userId: string | null;
  locale: NewsletterLocale;
  source: ConsentSource;
  ip?: string;
}) {
  const email = normalizeEmail(input.email);
  if (!email) return { status: 400 as const, body: { error: "Enter a valid email address." } };
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  try {
    if (!(await allowNewsletterAttempt(hash(email), hash(input.ip || "unknown")))) {
      return { status: 429 as const, body: { error: "Please wait before requesting another confirmation." } };
    }
    const saved = await saveOptIn({ email, userId: input.userId, locale: input.locale, source: input.source });
    if (saved.decision === "blocked") {
      return { status: 409 as const, body: { error: "This address cannot receive the newsletter." } };
    }
    if (saved.decision === "already") return { status: 200 as const, body: { ok: true, status: "subscribed" as const, locale: saved.locale } };
    if (!saved.token || !saved.unsubscribeToken) return { status: 503 as const, body: { error: "Newsletter email is temporarily unavailable." } };
    const sent = await sendConfirmation(email, saved.locale, saved.token, saved.unsubscribeToken);
    if (!sent.ok) return { status: 503 as const, body: { ok: false, status: "pending" as const, error: "Newsletter email is temporarily unavailable." } };
    return { status: 200 as const, body: { ok: true, status: "pending" as const, locale: saved.locale } };
  } catch (error) {
    if (error instanceof NewsletterStorageError) return { status: 503 as const, body: { error: "Newsletter storage is not ready." } };
    return { status: 503 as const, body: { error: "Newsletter email is temporarily unavailable." } };
  }
}

export async function requestOptOut(userId: string, email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return { status: 400 as const, body: { error: "Enter a valid email address." } };
  try {
    await unsubscribeOwned(userId, normalized);
    return { status: 200 as const, body: { ok: true, status: "unsubscribed" as const } };
  } catch (error) {
    if (error instanceof NewsletterStorageError) return { status: 503 as const, body: { error: "Newsletter storage is not ready." } };
    return { status: 503 as const, body: { error: "Newsletter settings are temporarily unavailable." } };
  }
}
