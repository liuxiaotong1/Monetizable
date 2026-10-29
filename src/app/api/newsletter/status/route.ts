import { NextResponse } from "next/server";
import { providerHealth } from "@/lib/newsletter/health";
import { postalLine } from "@/lib/newsletter/messages";
import { bearerAuthorized } from "@/lib/newsletter/policy";
import { NewsletterStorageError, recentCampaigns, subscribedCounts } from "@/lib/newsletter/store";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (!bearerAuthorized(request.headers.get("authorization"), process.env.NEWSLETTER_SEND_TOKEN)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  }
  const provider = await providerHealth();
  const postal_address_configured = postalLine(process.env.NEWSLETTER_POSTAL_ADDRESS).configured;
  try {
    const [subscribers, campaigns] = await Promise.all([subscribedCounts(), recentCampaigns()]);
    return NextResponse.json({
      ok: true,
      storage_ready: true,
      subscribers,
      campaigns,
      provider,
      postal_address_configured,
    }, { headers });
  } catch (error) {
    const storage = error instanceof NewsletterStorageError;
    return NextResponse.json({
      ok: false,
      storage_ready: false,
      error: storage ? "Newsletter storage is not ready." : "Newsletter status is temporarily unavailable.",
      provider,
      postal_address_configured,
    }, { status: 503, headers });
  }
}
