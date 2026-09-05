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

export async function createCheckoutSession(analysisId: string, priceCents: number, currency: string, appUrl: string) {
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/preview/${analysisId}`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": currency,
    "line_items[0][price_data][unit_amount]": String(priceCents),
    "line_items[0][price_data][product_data][name]": "Monetizable — Monetization Map",
    "line_items[0][price_data][product_data][description]": "Top skill combinations, sellable services, demand evidence, and 10 live opportunities.",
    "metadata[analysis_id]": analysisId,
    "payment_intent_data[metadata][analysis_id]": analysisId,
  });
  return stripeRequest("checkout/sessions", { method: "POST", body });
}

export async function createSubscriptionCheckout(analysisId: string, priceId: string, appUrl: string, trialDays = 2, interval?: "week" | "month") {
  if (!/^price_[A-Za-z0-9]+$/.test(priceId)) throw new Error("Stripe subscription price is not configured");
  if (!Number.isInteger(trialDays) || trialDays < 1) throw new Error("Stripe trial period is invalid");
  const body = new URLSearchParams({
    mode: "subscription",
    success_url: `${appUrl}/agent/activate?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/preview/${analysisId}`,
    "line_items[0][quantity]": "1",
    "line_items[0][price]": priceId,
    "metadata[analysis_id]": analysisId,
    "subscription_data[metadata][analysis_id]": analysisId,
    "subscription_data[trial_period_days]": String(trialDays),
    ...(interval ? { "metadata[billing_interval]": interval, "subscription_data[metadata][billing_interval]": interval } : {}),
    allow_promotion_codes: "true",
  });
  return stripeRequest("checkout/sessions", { method: "POST", body });
}

export function createSubscriptionPaymentLinkCheckout(analysisId: string, paymentLinkUrl: string) {
  const url = new URL(paymentLinkUrl);
  if (url.protocol !== "https:" || url.hostname !== "buy.stripe.com") throw new Error("Invalid Stripe subscription Payment Link");
  url.searchParams.set("client_reference_id", analysisId);
  return { url: url.toString() };
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  const body = new URLSearchParams({ customer: customerId, return_url: returnUrl });
  return stripeRequest("billing_portal/sessions", { method: "POST", body });
}

export async function retrieveSubscription(id: string) {
  return stripeRequest(`subscriptions/${encodeURIComponent(id)}`);
}

export function createPaymentLinkCheckout(analysisId: string, paymentLinkUrl: string) {
  const url = new URL(paymentLinkUrl);
  if (url.protocol !== "https:" || url.hostname !== "buy.stripe.com") {
    throw new Error("Invalid Stripe Payment Link");
  }
  url.searchParams.set("client_reference_id", analysisId);
  return { url: url.toString() };
}

export async function retrieveCheckoutSession(id: string) {
  return stripeRequest(`checkout/sessions/${encodeURIComponent(id)}`);
}

export function verifyStripeSignature(payload: string, header: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return false;
  const entries = Object.fromEntries(header.split(",").map((part) => part.split("=", 2)));
  const timestamp = entries.t;
  const signature = entries.v1;
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(expected); const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
