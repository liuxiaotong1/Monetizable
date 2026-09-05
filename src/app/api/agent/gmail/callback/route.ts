import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { openAgentAccessGrant } from "@/lib/analysis-token";
import { OAUTH_STATE_COOKIE, verifyLoginOAuthState } from "@/lib/auth-flow";
import { currentUser } from "@/lib/auth";
import { claimAnalysisForUser } from "@/lib/storage";
import { config } from "@/lib/config";
import { encryptToken, exchangeGmailCode, gmailProfile, startGmailWatch, verifyOAuthState } from "@/lib/opportunity-agent/gmail";
import { gmailConnectionForUser, resetAgentOnboardingForCandidate, upsertAgentSubscription, upsertGmailConnection } from "@/lib/opportunity-agent/storage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const rawState = request.nextUrl.searchParams.get("state") ?? "";
  const code = request.nextUrl.searchParams.get("code");
  const oauthCookies = await cookies();
  const expectedState = oauthCookies.get(OAUTH_STATE_COOKIE)?.value;
  oauthCookies.delete(OAUTH_STATE_COOKIE);
  if (!rawState || !expectedState || rawState !== expectedState) return NextResponse.redirect(`${config.appUrl}/auth?error=google`);
  const loginState = verifyLoginOAuthState(rawState);
  if (loginState && code) {
    try {
      const tokens = await exchangeGmailCode(code);
      const client = await createServerSupabaseClient();
      if (!tokens.id_token || !client) throw new Error("Google sign-in is not configured");
      const { data, error } = await client.auth.signInWithIdToken({ provider: "google", token: tokens.id_token });
      if (error || !data.user) throw error ?? new Error("Google sign-in failed");
      const cookieStore = await cookies();
      const grant = cookieStore.get("monetizable_agent_grant")?.value;
      cookieStore.delete("monetizable_agent_grant");
      if (grant && data.user.email) {
        const analysisId = openAgentAccessGrant(grant);
        if (analysisId && await claimAnalysisForUser(analysisId, data.user.id)) {
          const subscription = await upsertAgentSubscription({ analysisId, email: data.user.email, status: "trialing" });
          if (subscription?.candidate_profile_id) await resetAgentOnboardingForCandidate(subscription.candidate_profile_id);
          return NextResponse.redirect(`${config.appUrl}/agent?setup=intent`);
        }
      }
      return NextResponse.redirect(new URL(loginState.next, config.appUrl));
    } catch {
      return NextResponse.redirect(`${config.appUrl}/auth?error=google`);
    }
  }
  const state = verifyOAuthState(rawState);
  if (!state || !code) return NextResponse.redirect(`${config.appUrl}/agent?gmail=failed`);
  const user = await currentUser();
  if (!user || user.id !== state.userId) return NextResponse.redirect(`${config.appUrl}/agent?gmail=failed`);
  try {
    const tokens = await exchangeGmailCode(code); const profile = await gmailProfile(tokens.access_token); const existing = await gmailConnectionForUser(state.userId);
    const refreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : existing?.encrypted_refresh_token;
    if (!refreshToken) throw new Error("Google did not return a refresh token");
    let watch: { historyId: string; expiration: string } | null = null;
    try { watch = await startGmailWatch(tokens.access_token); } catch { watch = null; }
    await upsertGmailConnection(state.userId, { gmail_address: profile.emailAddress.toLowerCase(), encrypted_refresh_token: refreshToken, encrypted_access_token: encryptToken(tokens.access_token), access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(), scopes: tokens.scope.split(" "), watch_expiration: watch ? new Date(Number(watch.expiration)).toISOString() : null, history_id: watch?.historyId ?? profile.historyId, status: "active", connected_at: new Date().toISOString() });
    return NextResponse.redirect(`${config.appUrl}/agent?gmail=connected`);
  } catch { return NextResponse.redirect(`${config.appUrl}/agent?gmail=failed`); }
}
