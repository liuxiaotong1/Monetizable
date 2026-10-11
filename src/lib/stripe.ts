import { createHmac, timingSafeEqual } from "node:crypto";

async function stripeRequest(path: string, init: RequestInit = {}) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    ...init,
    headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded", ...init.headers },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? `Stripe request failed (${response.status})`);
  return data;
}

export async function createCheckoutSession(analysisId: string, priceCents: number, currency: string, appUrl: string, locale: "en" | "fr" = "en") {
  const body = new URLSearchParams({
    mode: "payment",
    locale,
    success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/preview/${analysisId}`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": currency,
    "line_items[0][price_data][unit_amount]": String(priceCents),
    "line_items[0][price_data][product_data][name]": locale === "fr" ? "Monetizable — Carte de monétisation" : "Monetizable — Monetization Map",
    "line_items[0][price_data][product_data][description]": locale === "fr" ? "Déblocage unique de la sélection de compétences et de la préparation de prospection pour cette analyse. Limites d’utilisation applicables." : "One-time unlock of skill-stack selection and outreach preparation for this analysis. Usage limits apply.",
    "metadata[analysis_id]": analysisId,
    "payment_intent_data[metadata][analysis_id]": analysisId,
  });
  return stripeRequest("checkout/sessions", { method: "POST", body });
}

export async function createSubscriptionCheckout(analysisId: string, priceId: string, appUrl: string, trialDays = 0, interval?: "week" | "month", locale: "en" | "fr" = "en") {
  if (!/^price_[A-Za-z0-9]+$/.test(priceId)) throw new Error("Stripe subscription price is not configured");
  if (trialDays !== 0) throw new Error("Subscription trials are disabled");
  const body = new URLSearchParams({
    mode: "subscription",
    locale,
    success_url: `${appUrl}/agent/activate?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/preview/${analysisId}`,
    "line_items[0][quantity]": "1",
    "line_items[0][price]": priceId,
    "metadata[analysis_id]": analysisId,
    "subscription_data[metadata][analysis_id]": analysisId,
    ...(interval ? { "metadata[billing_interval]": interval, "subscription_data[metadata][billing_interval]": interval } : {}),
    allow_promotion_codes: "true",
  });
  return stripeRequest("checkout/sessions", { method: "POST", body });
}

export function createSubscriptionPaymentLinkCheckout(analysisId: string, paymentLinkUrl: string, locale: "en" | "fr" = "en") {
  const url = new URL(paymentLinkUrl);
  if (url.protocol !== "https:" || url.hostname !== "buy.stripe.com") throw new Error("Invalid Stripe subscription Payment Link");
  url.searchParams.set("client_reference_id", analysisId);
  url.searchParams.set("locale", locale);
  return { url: url.toString() };
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string, locale: "en" | "fr" = "en") {
  const body = new URLSearchParams({ customer: customerId, return_url: returnUrl, locale });
  return stripeRequest("billing_portal/sessions", { method: "POST", body });
}

export async function retrieveSubscription(id: string) {
  return stripeRequest(`subscriptions/${encodeURIComponent(id)}`);
}

export async function listCustomerSubscriptions(customerId: string) {
  const subscriptions: Array<{ id: string; customer: string; status: string; cancel_at_period_end: boolean; cancel_at?: number | null; current_period_end?: number; items?: { data: Array<{ current_period_end?: number; price?: { id: string } }> } }> = [];
  let cursor: string | undefined;
  do {
    const query = new URLSearchParams({ customer: customerId, status: "all", limit: "100", ...(cursor ? { starting_after: cursor } : {}) });
    const page = await stripeRequest(`subscriptions?${query}`);
    subscriptions.push(...page.data);
    cursor = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (cursor);
  return subscriptions;
}

export async function cancelSubscriptionRenewal(id: string) {
  return stripeRequest(`subscriptions/${encodeURIComponent(id)}`, {
    method: "POST",
    body: new URLSearchParams({ cancel_at_period_end: "true", proration_behavior: "none" }),
  });
}

export function createPaymentLinkCheckout(analysisId: string, paymentLinkUrl: string, locale: "en" | "fr" = "en") {
  const url = new URL(paymentLinkUrl);
  if (url.protocol !== "https:" || url.hostname !== "buy.stripe.com") {
    throw new Error("Invalid Stripe Payment Link");
  }
  url.searchParams.set("client_reference_id", analysisId);
  url.searchParams.set("locale", locale);
  return { url: url.toString() };
}

export async function retrieveCheckoutSession(id: string) {
  return stripeRequest(`checkout/sessions/${encodeURIComponent(id)}`);
}

export function verifyStripeSignature(payload: string, header: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const entries = header.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = entries.find(([key]) => key === "t")?.[1];
  const signatures = entries.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || !Number.isSafeInteger(Number(timestamp)) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest();
  // Stripe sends multiple v1 signatures while a signing secret is being rotated.
  return signatures.some((signature) => {
    if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
    return timingSafeEqual(expected, Buffer.from(signature, "hex"));
  });
}
