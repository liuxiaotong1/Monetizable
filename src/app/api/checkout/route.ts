import { getRequestLocale } from "@/lib/request-locale";
import { NextResponse } from "next/server";
import { trackServer } from "@/lib/analytics";
import { config } from "@/lib/config";
import { createCheckoutSession, createPaymentLinkCheckout } from "@/lib/stripe";
import { analysisBelongsToUser, getAnalysis } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import { canBuildSkillStack } from "@/lib/skill-stack-access";

export async function POST(request: Request) {
  try {
    const { analysisId } = await request.json();
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in is required" }, { status: 401 });
    if (!await analysisBelongsToUser(String(analysisId), user.id)) return NextResponse.json({ error: "Analysis not found for this account" }, { status: 403 });
    const analysis = await getAnalysis(String(analysisId));
    if (!analysis) return NextResponse.json({ error: "Analysis expired. Please run a new one." }, { status: 404 });
    const id = analysis?.id ?? String(analysisId);
    if (await canBuildSkillStack(user.id, id)) return NextResponse.json({ url: "/agent?setup=intent" });
    const session = config.stripePaymentLinkUrl
      ? createPaymentLinkCheckout(id, config.stripePaymentLinkUrl, await getRequestLocale())
      : await createCheckoutSession(id, config.priceCents, config.currency, config.appUrl, await getRequestLocale());
    await trackServer("checkout_started", { analysisId: id }).catch(() => {});
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout start failed", error);
    return NextResponse.json({ error: "Checkout could not be started." }, { status: 500 });
  }
}
