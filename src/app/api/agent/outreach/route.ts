import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createOutreachDraft, matchForUser } from "@/lib/opportunity-agent/storage";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { matchId } = await request.json();
  const match = await matchForUser(user.id, String(matchId ?? ""));
  if (!match) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  const opportunity = Array.isArray(match.market_opportunities) ? match.market_opportunities[0] : match.market_opportunities;
  if (!opportunity) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  const buyer = opportunity.buyer || opportunity.source || "your team";
  const offer = opportunity.suggested_offer || "a focused paid pilot";
  const signature = Array.isArray(opportunity.opportunity_signatures) ? opportunity.opportunity_signatures[0] : opportunity.opportunity_signatures;
  if (signature?.contact_method !== "public_email" || !signature.contact_value) {
    return NextResponse.json({ error: "This opportunity does not have a verified direct-email contact" }, { status: 422 });
  }
  const draft = await createOutreachDraft(user.id, match.id, {
    recipient: signature.contact_value,
    subject: `Idea for ${opportunity.title}`,
    body: `Hi ${buyer},\n\nI noticed ${opportunity.title} and the market signal behind it. ${match.fit_reason}\n\nI could help with ${offer} as a small, clearly scoped paid pilot. Would it be useful if I sent a one-page outline?\n\nBest,`,
  });
  return NextResponse.json({ draft });
}
