import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { analysisBelongsToUser } from "@/lib/storage";
import { linkSubscriptionUser, markActivationEmailSent, resetAgentOnboardingForCandidate, upsertAgentSubscription } from "@/lib/opportunity-agent/storage";
import { retrieveCheckoutSession, retrieveSubscription } from "@/lib/stripe";
import { sendAccountSetupEmail } from "@/lib/account-email";

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { sessionId } = await request.json();
    const session = await retrieveCheckoutSession(String(sessionId ?? ""));
    if (session.mode !== "subscription" || !session.subscription) return NextResponse.json({ error: "Subscription is not complete." }, { status: 402 });
    const analysisId = session.metadata?.analysis_id ?? session.client_reference_id;
    const email = session.customer_details?.email ?? session.customer_email;
    if (!analysisId || !email) throw new Error("Subscription is missing its analysis or email reference");
    if (!await analysisBelongsToUser(analysisId, user.id)) return NextResponse.json({ error: "Subscription not found for this account" }, { status: 403 });
    const subscription = await retrieveSubscription(String(session.subscription));
    const row = await upsertAgentSubscription({
      analysisId,
      email,
      stripeCustomerId: String(session.customer),
      stripeSubscriptionId: String(subscription.id),
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : undefined,
    });
    const signedIn = Boolean(user?.email && user.email.toLowerCase() === email.toLowerCase());
    if (signedIn && user) await linkSubscriptionUser(email, user.id);
    if (!row?.activation_email_sent_at) {
      if (row?.candidate_profile_id) await resetAgentOnboardingForCandidate(row.candidate_profile_id);
      if (!signedIn) await sendAccountSetupEmail(email);
      await markActivationEmailSent(row.id);
    }
    return NextResponse.json({ ok: true, email, signedIn });
  } catch (error) {
    console.error("Subscription activation failed", error);
    return NextResponse.json({ error: "We couldn’t activate this subscription." }, { status: 400 });
  }
}
