import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { subscriptionForUser } from "@/lib/opportunity-agent/storage";
import { createCustomerPortalSession } from "@/lib/stripe";

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subscription = await subscriptionForUser(user.id);
  if (!subscription?.stripe_customer_id) return NextResponse.json({ error: "Active subscription not found" }, { status: 404 });
  const portal = await createCustomerPortalSession(subscription.stripe_customer_id, `${config.appUrl}/agent`);
  return NextResponse.json({ url: portal.url });
}
