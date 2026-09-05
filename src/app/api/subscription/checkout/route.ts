import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { trackServer } from "@/lib/analytics";
import { createSubscriptionCheckout, createSubscriptionPaymentLinkCheckout } from "@/lib/stripe";
import { analysisBelongsToUser, getAnalysis } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import { z } from "zod";
import { stripeAgentPaymentLinkUrl, stripeAgentPriceId } from "@/lib/config";

const checkoutSchema = z.object({
  analysisId: z.string().uuid(),
  billingInterval: z.enum(["week", "month"]),
});

export async function POST(request: Request) {
  try {
    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid subscription selection." }, { status: 400 });
    const { analysisId: id, billingInterval } = parsed.data;
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in is required" }, { status: 401 });
    if (!await analysisBelongsToUser(id, user.id)) return NextResponse.json({ error: "Analysis not found for this account" }, { status: 403 });
    const analysis = await getAnalysis(id);
    if (!analysis) return NextResponse.json({ error: "Analysis expired. Please run a new one." }, { status: 404 });
    const paymentLink = stripeAgentPaymentLinkUrl(billingInterval);
    const session = paymentLink
      ? createSubscriptionPaymentLinkCheckout(id, paymentLink)
      : await createSubscriptionCheckout(id, stripeAgentPriceId(billingInterval), config.appUrl, config.agentTrialDays, billingInterval);
    await trackServer("subscription_checkout_started", { analysisId: id, billingInterval });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Subscription checkout failed", error);
    return NextResponse.json({ error: "Subscription checkout could not be started." }, { status: 500 });
  }
}
