import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { consumeExecutionQueue } from "@/lib/opportunity-agent/execution";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!config.opportunityAgentEnabled || !config.opportunityAgentExecutionEnabled) {
    return NextResponse.json({ error: "SuperCharlie execution is disabled" }, { status: 503 });
  }
  const authorization = request.headers.get("authorization");
  const explicitSecret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || (authorization !== `Bearer ${process.env.CRON_SECRET}` && explicitSecret !== process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await consumeExecutionQueue(), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Agent execution failed", error);
    return NextResponse.json({ error: "Agent execution failed" }, { status: 500 });
  }
}
