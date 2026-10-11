import { supabaseRest } from "@/lib/storage";
import { listCustomerSubscriptions } from "@/lib/stripe";

export interface BillingUser { id: string; email?: string; email_confirmed_at?: string }
export interface BillingSubscription { id: string; status: string; cancelAtPeriodEnd: boolean; endsAt: string | null; canCancel: boolean }

// Billing must not depend on Agent access, analysis ownership, or an active entitlement.
async function billingRecords(user: BillingUser): Promise<Array<{ stripe_customer_id: string; stripe_subscription_id?: string }>> {
  const fields = "stripe_customer_id,stripe_subscription_id";
  const owned = await supabaseRest(`agent_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&stripe_customer_id=not.is.null&select=${fields}`);
  // Older checkout records may predate the user's first sign-in. Only a verified
  // email can claim an unlinked record; never use a client-supplied email or ID.
  const unlinked = user.email && user.email_confirmed_at
    ? await supabaseRest(`agent_subscriptions?user_id=is.null&email=eq.${encodeURIComponent(user.email.trim().toLowerCase())}&stripe_customer_id=not.is.null&select=${fields}`)
    : [];
  return [...(owned ?? []), ...(unlinked ?? [])];
}

export async function billingCustomers(user: BillingUser): Promise<string[]> {
  return [...new Set((await billingRecords(user)).map(row => row.stripe_customer_id).filter(Boolean))];
}

export async function billingSubscriptions(user: BillingUser): Promise<BillingSubscription[]> {
  const records = await billingRecords(user);
  const customers = [...new Set(records.map(row => row.stripe_customer_id).filter(Boolean))];
  const linkedIds = new Set(records.map(row => row.stripe_subscription_id).filter(Boolean));
  const prices = new Set([process.env.STRIPE_AGENT_WEEKLY_PRICE_ID, process.env.STRIPE_AGENT_MONTHLY_PRICE_ID, process.env.STRIPE_AGENT_PRICE_ID].filter(Boolean));
  const groups = await Promise.all(customers.map(listCustomerSubscriptions));
  // A Stripe merchant may also sell other products. Never expose or cancel
  // unrelated subscriptions that happen to share the same customer record.
  const relevant = groups.flat().filter(subscription => linkedIds.has(subscription.id) || subscription.items?.data.some(item => item.price && prices.has(item.price.id)));
  return [...new Map(relevant.map(subscription => [subscription.id, subscription])).values()].map(subscription => {
    const ends = subscription.cancel_at ?? subscription.current_period_end ?? Math.max(0, ...(subscription.items?.data ?? []).map(item => item.current_period_end ?? 0));
    return {
      id: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || Boolean(subscription.cancel_at),
      endsAt: ends ? new Date(ends * 1000).toISOString() : null,
      canCancel: !["canceled", "incomplete_expired"].includes(subscription.status) && !subscription.cancel_at_period_end && !subscription.cancel_at,
    };
  });
}
