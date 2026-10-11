import { getRequestLocale } from "@/lib/request-locale";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { trackServer } from "@/lib/analytics";
import { createSubscriptionCheckout } from "@/lib/stripe";
import { analysisBelongsToUser, getAnalysis, supabaseRest } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import { z } from "zod";
import { stripeAgentPriceId } from "@/lib/config";

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
    if (await supabaseRest("rpc/account_has_subscription", {method:"POST",body:JSON.stringify({p_user:user.id})})) return NextResponse.json({url:"/agent"});
    const analysis = await getAnalysis(id);
    if (!analysis) return NextResponse.json({ error: "Analysis expired. Please run a new one." }, { status: 404 });
    const session = await createSubscriptionCheckout(id, stripeAgentPriceId(billingInterval), config.appUrl, 0, billingInterval, await getRequestLocale());
    await trackServer("subscription_checkout_started", { analysisId: id, billingInterval }).catch(() => {});
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof Error && /checkout_session_write|Checkout Sessions Write/i.test(error.message)) {
      console.error("Subscription checkout configuration: Checkout Sessions Write permission is missing");
      return NextResponse.json({error:"Subscription checkout is temporarily unavailable. Our payment configuration needs attention; you have not been charged.",code:"CHECKOUT_PERMISSION_MISSING"},{status:503});
    }
    console.error("Subscription checkout failed", error);
    return NextResponse.json({ error: "Subscription checkout could not be started." }, { status: 500 });
  }
}
