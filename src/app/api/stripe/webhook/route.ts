import { NextResponse } from "next/server";
import { verifyStripeSignature } from "@/lib/stripe";
import { markAnalysisPaid } from "@/lib/storage";
import { markActivationEmailSent, updateSubscriptionByStripeId, upsertAgentSubscription } from "@/lib/opportunity-agent/storage";
import { retrieveSubscription } from "@/lib/stripe";
import { sendAccountSetupEmail } from "@/lib/account-email";
import { trackServer } from "@/lib/analytics";

function periodEnd(value: number | undefined) {
  return value ? new Date(value * 1000).toISOString() : undefined;
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  if (!verifyStripeSignature(payload, signature)) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  const event = JSON.parse(payload);
  const object = event.data.object;
  if (event.type === "checkout.session.completed" && object.mode === "subscription" && object.subscription) {
    const analysisId = object.metadata?.analysis_id ?? object.client_reference_id;
    const email = object.customer_details?.email ?? object.customer_email;
    if (analysisId && email) {
      const subscription = await retrieveSubscription(String(object.subscription));
      const row = await upsertAgentSubscription({
        analysisId,
        email,
        stripeCustomerId: String(object.customer),
        stripeSubscriptionId: String(subscription.id),
        status: subscription.status,
        currentPeriodEnd: periodEnd(subscription.current_period_end),
      });
      if (!row?.activation_email_sent_at) {
        await sendAccountSetupEmail(email);
        await markActivationEmailSent(row.id);
      }
      await trackServer("purchase_completed", { analysisId, product: "opportunity_agent", stripeEventId: event.id });
    }
  } else if (event.type === "checkout.session.completed" && object.mode === "payment" && object.payment_status === "paid") {
    const id = object.metadata?.analysis_id ?? object.client_reference_id;
    if (id) await markAnalysisPaid(id, object.id);
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    // Events can arrive out of order: read Stripe's current state so an older
    // update cannot restore access after cancellation.
    const subscription = await retrieveSubscription(String(object.id));
    await updateSubscriptionByStripeId(String(object.id), { status: subscription.status, currentPeriodEnd: periodEnd(subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end) });
  } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const subscriptionId = object.subscription ?? object.parent?.subscription_details?.subscription;
    if (subscriptionId) {
      const subscription = await retrieveSubscription(String(subscriptionId));
      await updateSubscriptionByStripeId(String(subscriptionId), { status: subscription.status, currentPeriodEnd: periodEnd(subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end) });
    }
  }
  return NextResponse.json({ received: true });
}
