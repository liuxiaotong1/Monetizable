import { getRequestLocale } from "@/lib/request-locale";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { supabaseRest } from "@/lib/storage";
import { createCustomerPortalSession } from "@/lib/stripe";

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Billing management must remain available to existing paying customers.
  const rows = await supabaseRest(`agent_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&stripe_customer_id=not.is.null&select=stripe_customer_id&order=updated_at.desc&limit=1`);
  const subscription = rows?.[0];
  if (!subscription?.stripe_customer_id) return NextResponse.json({ error: "Active subscription not found" }, { status: 404 });
  const portal = await createCustomerPortalSession(subscription.stripe_customer_id, `${config.appUrl}/agent`, await getRequestLocale());
  return NextResponse.json({ url: portal.url });
}
