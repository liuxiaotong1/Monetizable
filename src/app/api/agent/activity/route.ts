import { getRequestLocale } from "@/lib/request-locale";
import { getDisplayTranslations } from "@/lib/display-translations";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { agentFeed, agentJobsForUser, agentRadarStats, dailyAgentActionStats, subscriptionForUser } from "@/lib/opportunity-agent/storage";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subscription = await subscriptionForUser(user.id);
  if (!subscription?.candidate_profile_id) return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  const [jobs, matches, radar, daily] = await Promise.all([
    agentJobsForUser(user.id, subscription.candidate_profile_id),
    agentFeed(user.id, subscription.candidate_profile_id),
    agentRadarStats(user.id, subscription.candidate_profile_id),
    dailyAgentActionStats(user.id, subscription.candidate_profile_id),
  ]);
  const locale = await getRequestLocale();
  const translations = locale === "fr" ? await getDisplayTranslations(matches, locale) : {};
  return NextResponse.json({
    translations,
    radar: {
      scanning: radar.scanning,
      marketSignalsScanned: radar.marketSignalsScanned,
      capacityMatches: radar.capacityMatches,
      hotLeads: radar.hotLeads,
      platformLeads: radar.platformLeads,
      emailLeads: radar.emailLeads,
      dailyCompleted: daily.completedToday,
      dailyPending: daily.pending,
      dailyTarget: config.agentDailyOutreachTarget,
    },
    matches: matches ?? [],
    jobs: (jobs ?? []).slice(0, 30).map((job: Record<string, unknown>) => ({
      id: job.id,
      opportunity_match_id: job.opportunity_match_id,
      kind: job.kind,
      status: job.status,
      errorCode: job.error_code,
      errorMessage: job.error_message,
      requiredAnswers: job.required_answers,
      input: safeActionData(job.input),
      result: safeActionData(job.result),
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      completedAt: job.completed_at,
    })),
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST() {
  return NextResponse.json({ error: "Direct email requires approval of a visible draft" }, { status: 405, headers: { "cache-control": "no-store" } });
}

function safeActionData(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const allowed = ["company", "buyer", "source", "title", "recipient", "subject", "body", "sourceUrl", "discoveryUrl", "targetUrl", "url", "provider", "screenshotUrls", "sentAt", "submittedAt", "gmailMessageId", "gmailThreadId", "executionChannel", "opportunityPath"];
  return Object.fromEntries(allowed.flatMap((key) => row[key] === undefined ? [] : [[key, row[key]]]));
}
