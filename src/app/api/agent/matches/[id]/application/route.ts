import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { matchForUser } from "@/lib/opportunity-agent/storage";
import { supabaseRest } from "@/lib/storage";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in is required" }, { status: 401 });
    const { id } = await params;
    const body = z.object({ requestId: z.string().uuid() }).safeParse(await request.json());
    if (!z.string().uuid().safeParse(id).success || !body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const match = await matchForUser(user.id, id);
    const opportunity = Array.isArray(match?.market_opportunities) ? match.market_opportunities[0] : match?.market_opportunities;
    const signature = Array.isArray(opportunity?.opportunity_signatures) ? opportunity.opportunity_signatures[0] : opportunity?.opportunity_signatures;
    if (!opportunity || signature?.contact_method !== "application_link" || !/^https?:\/\//i.test(opportunity.source_url ?? "")) {
      return NextResponse.json({ error: "Application unavailable" }, { status: 404 });
    }
    const result = await supabaseRest("rpc/consume_application_click", { method: "POST", body: JSON.stringify({ p_user: user.id, p_id: body.data.requestId, p_match: id }) });
    if (result === "payment_required") return NextResponse.json({ url: "/subscribe", error: "Subscribe to open more applications." }, { status: 402 });
    if (result !== "allowed") return NextResponse.json({ error: "Application access denied" }, { status: 403 });
    return NextResponse.json({ url: opportunity.source_url });
  } catch {
    return NextResponse.json({ error: "Could not open this application. Please try again." }, { status: 503 });
  }
}
