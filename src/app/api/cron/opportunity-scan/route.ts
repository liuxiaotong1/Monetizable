import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { runOpportunityScan } from "@/lib/opportunity-agent/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!config.opportunityAgentEnabled) return NextResponse.json({ error: "SuperCharlie is disabled" }, { status: 503 });
  const authorization = request.headers.get("authorization");
  const explicitSecret = request.headers.get("x-cron-secret");
  if (
    !process.env.CRON_SECRET ||
    (authorization !== `Bearer ${process.env.CRON_SECRET}` && explicitSecret !== process.env.CRON_SECRET)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runOpportunityScan());
  } catch (error) {
    console.error("Opportunity scan failed", error);
    return NextResponse.json({ error: "Opportunity scan failed" }, { status: 500 });
  }
}
