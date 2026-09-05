import { after, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { runOpportunityScan } from "@/lib/opportunity-agent/pipeline";
import { agentRadarStats, subscriptionForUser } from "@/lib/opportunity-agent/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

async function context() {
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const subscription = await subscriptionForUser(user.id);
  if (!subscription?.candidate_profile_id) return { error: NextResponse.json({ error: "Active subscription required" }, { status: 403 }) };
  return { user, subscription };
}

export async function GET() {
  const value = await context();
  if (value.error) return value.error;
  return NextResponse.json(await agentRadarStats(value.user!.id, value.subscription!.candidate_profile_id));
}

export async function POST(request: Request) {
  if (!config.opportunityAgentEnabled) return NextResponse.json({ error: "SuperCharlie is disabled" }, { status: 503 });
  const value = await context();
  if (value.error) return value.error;
  const before = await agentRadarStats(value.user!.id, value.subscription!.candidate_profile_id);
  if (before.scanning) return NextResponse.json(before, { status: 202 });
  const force = new URL(request.url).searchParams.get("force") === "1";
  if (!force && before.hasScanned && before.lastCompletedAt && Date.now() - new Date(before.lastCompletedAt).getTime() < 15 * 60_000) return NextResponse.json(before);
  after(async () => {
    try { await runOpportunityScan({ force: true, userId: value.user!.id }); }
    catch (error) { console.error("Background opportunity scan failed", error); }
  });
  return NextResponse.json({ ...before, scanning: true }, { status: 202 });
}
