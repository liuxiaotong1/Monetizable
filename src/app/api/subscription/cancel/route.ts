import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { billingSubscriptions } from "@/lib/account-billing";
import { cancelSubscriptionRenewal } from "@/lib/stripe";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (body?.confirm !== true || typeof body.subscriptionId !== "string") return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  try {
    const subscriptions = await billingSubscriptions(user);
    const subscription = subscriptions.find(item => item.id === body.subscriptionId);
    if (!subscription) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    // Repeated clicks are safe. Never restart an ended subscription.
    if (subscription.canCancel) await cancelSubscriptionRenewal(subscription.id);
    return NextResponse.json({ subscriptions: await billingSubscriptions(user) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Do not expose Stripe errors, which may include credentials or account data.
    return NextResponse.json({ error: "Cancellation could not be confirmed. Please reload to check your subscription or contact support." }, { status: 502 });
  }
}
