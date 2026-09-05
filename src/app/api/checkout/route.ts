import { NextResponse } from "next/server";
import { trackServer } from "@/lib/analytics";
import { config } from "@/lib/config";
import { createCheckoutSession, createPaymentLinkCheckout } from "@/lib/stripe";
import { analysisBelongsToUser, getAnalysis } from "@/lib/storage";
import { currentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { analysisId } = await request.json();
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in is required" }, { status: 401 });
    if (!await analysisBelongsToUser(String(analysisId), user.id)) return NextResponse.json({ error: "Analysis not found for this account" }, { status: 403 });
    const analysis = await getAnalysis(String(analysisId));
    if (!analysis && !config.stripePaymentLinkUrl) return NextResponse.json({ error: "Analysis expired. Please run a new one." }, { status: 404 });
    const id = analysis?.id ?? String(analysisId);
    const session = config.stripePaymentLinkUrl
      ? createPaymentLinkCheckout(id, config.stripePaymentLinkUrl)
      : await createCheckoutSession(id, config.priceCents, config.currency, config.appUrl);
    await trackServer("checkout_started", { analysisId: id });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout start failed", error);
    return NextResponse.json({ error: "Checkout could not be started." }, { status: 500 });
  }
}
