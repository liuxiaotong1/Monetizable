import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { trackServer } from "@/lib/analytics";
import { analysisBelongsToUser, claimAnalysisForUser, getAnalysis, markAnalysisPaid } from "@/lib/storage";
import { issueAgentAccessGrant, openAnalysis } from "@/lib/analysis-token";
import { currentUser } from "@/lib/auth";
import { linkSubscriptionUser, resetAgentOnboardingForCandidate, upsertAgentSubscription } from "@/lib/opportunity-agent/storage";

function validCode(value: string) {
  const expected = process.env.MONETIZABLE_ACCESS_CODE;
  if (!expected) return false;
  const submitted = Buffer.from(value.trim());
  const configured = Buffer.from(expected);
  return submitted.length === configured.length && timingSafeEqual(submitted, configured);
}

export async function POST(request: Request) {
  try {
    const { analysisId, code, recoveryToken } = await request.json();
    const id = String(analysisId ?? "");
    if (!validCode(String(code ?? ""))) {
      return NextResponse.json({ error: "That pass or coupon code is not valid." }, { status: 401 });
    }
    const analysis = await getAnalysis(id) ?? openAnalysis(String(recoveryToken ?? ""));
    if (!analysis || analysis.id !== id) {
      return NextResponse.json({ error: "Analysis expired. Please run a new one." }, { status: 404 });
    }
    const user = await currentUser();
    if (!user || !await analysisBelongsToUser(id, user.id)) {
      const recovery = openAnalysis(String(recoveryToken ?? ""));
      if (recovery?.id !== id || (user && !await claimAnalysisForUser(id, user.id))) return NextResponse.json({ error: "Analysis not found for this account" }, { status: 403 });
    }
    await markAnalysisPaid(id, `access-pass:${Date.now()}`);
    await trackServer("purchase_completed", { analysisId: id, amount: 0, method: "access_pass" });
    if (user?.email) {
      const subscription = await upsertAgentSubscription({ analysisId: id, email: user.email, status: "trialing" });
      if (subscription?.candidate_profile_id) await resetAgentOnboardingForCandidate(subscription.candidate_profile_id);
      await linkSubscriptionUser(user.email, user.id);
      return NextResponse.json({ agentSetupUrl: "/agent?setup=intent" });
    }
    return NextResponse.json({ agentSetupUrl: "/agent?access=1", agentAccessGrant: issueAgentAccessGrant(id) });
  } catch {
    return NextResponse.json({ error: "The pass could not be applied." }, { status: 400 });
  }
}
