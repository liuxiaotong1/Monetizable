import "server-only";
import { createHash } from "node:crypto";
import { confirmationMessage, withFooter } from "./messages";
import type { NewsletterLocale } from "./policy";

type Outbound = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
  idempotencyKey: string;
};

function configured() {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.OPPORTUNITY_EMAIL_FROM;
  return key && from ? { key, from } : null;
}

export async function sendConfirmation(email: string, locale: NewsletterLocale, confirmToken: string, unsubscribeToken: string) {
  const message = confirmationMessage(locale, confirmToken, unsubscribeToken);
  return sendOne({
    to: email,
    subject: message.subject,
    html: message.html,
    text: message.text,
    headers: message.headers,
    idempotencyKey: createHash("sha256").update(`confirm:${email}:${confirmToken}`).digest("hex"),
  });
}

export async function sendNewsletterBatch(messages: { to: string; subject: string; html: string; text: string; token: string; locale: NewsletterLocale; sendId: string }[]) {
  const config = configured();
  if (!config) return { ok: false as const, error: "email_not_configured", ids: messages.map(() => null) };
  const payload = messages.map((message) => {
    const composed = withFooter(message.locale, message.html, message.text, message.token);
    return {
      from: config.from,
      to: [message.to],
      subject: message.subject,
      html: composed.html,
      text: composed.text,
      headers: composed.headers,
    };
  });
  const idempotencyKey = createHash("sha256").update(messages.map((message) => message.sendId).sort().join(",")).digest("hex");
  try {
    const response = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return { ok: false as const, error: `resend_${response.status}`, ids: messages.map(() => null) };
    const body = await response.json().catch(() => null) as { data?: { id?: string }[] } | null;
    const data = Array.isArray(body?.data) ? body.data : [];
    if (data.length !== messages.length) return { ok: false as const, error: "resend_shape", ids: messages.map(() => null) };
    return { ok: true as const, error: null, ids: data.map((item) => (typeof item?.id === "string" ? item.id : null)) };
  } catch {
    return { ok: false as const, error: "resend_unreachable", ids: messages.map(() => null) };
  }
}

async function sendOne(message: Outbound) {
  const config = configured();
  if (!config) return { ok: false as const, error: "email_not_configured", id: null };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: config.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.headers,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { ok: false as const, error: `resend_${response.status}`, id: null };
    const body = await response.json().catch(() => null) as { id?: string } | null;
    return { ok: true as const, error: null, id: typeof body?.id === "string" ? body.id : null };
  } catch {
    return { ok: false as const, error: "resend_unreachable", id: null };
  }
}

export async function sendTestNewsletter(input: { to: string; subject: string; html: string; text: string; token: string; locale: NewsletterLocale }) {
  const composed = withFooter(input.locale, input.html, input.text, input.token);
  return sendOne({
    to: input.to,
    subject: input.subject,
    html: composed.html,
    text: composed.text,
    headers: composed.headers,
    idempotencyKey: createHash("sha256").update(`test:${input.to}:${input.subject}:${input.locale}`).digest("hex"),
  });
}
