import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { openAgentAccessGrant } from "@/lib/analysis-token";
import { safeAuthRedirect } from "@/lib/auth-flow";
import { claimAnalysisForUser } from "@/lib/storage";
import { resetAgentOnboardingForCandidate, upsertAgentSubscription } from "@/lib/opportunity-agent/storage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeAuthRedirect(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tokenType = url.searchParams.get("type");
  const client = await createServerSupabaseClient();
  if ((!code && !tokenHash) || !client) return NextResponse.redirect(new URL("/auth?error=callback", url.origin));
  const result = tokenHash
    ? await client.auth.verifyOtp({ token_hash: tokenHash, type: tokenType === "email_change" ? "email_change" : tokenType === "recovery" ? "recovery" : "signup" })
    : await client.auth.exchangeCodeForSession(code as string);
  if (result.error || !result.data.user) return NextResponse.redirect(new URL("/auth?error=callback", url.origin));

  const cookieStore = await cookies();
  const grant = cookieStore.get("monetizable_agent_grant")?.value;
  cookieStore.delete("monetizable_agent_grant");
  if (grant && result.data.user.email) {
    const analysisId = openAgentAccessGrant(grant);
    if (analysisId && await claimAnalysisForUser(analysisId, result.data.user.id)) {
      const subscription = await upsertAgentSubscription({ analysisId, email: result.data.user.email, status: "trialing" });
      if (subscription?.candidate_profile_id) await resetAgentOnboardingForCandidate(subscription.candidate_profile_id);
      return NextResponse.redirect(new URL("/agent?setup=intent", url.origin));
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
