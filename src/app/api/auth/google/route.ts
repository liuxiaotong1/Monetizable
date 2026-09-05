import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { openAgentAccessGrant } from "@/lib/analysis-token";
import { createLoginOAuthState, OAUTH_STATE_COOKIE, safeAuthRedirect } from "@/lib/auth-flow";
import { config } from "@/lib/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeAuthRedirect(url.searchParams.get("next"));
  const grant = url.searchParams.get("grant");
  if (grant && !openAgentAccessGrant(grant)) return NextResponse.redirect(new URL("/auth?error=grant", url.origin));
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/auth?error=config", url.origin));
  const cookieStore = await cookies();
  const state = createLoginOAuthState(next);
  cookieStore.set(OAUTH_STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", maxAge: 10 * 60, path: "/" });
  if (grant) cookieStore.set("monetizable_agent_grant", grant, { httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", maxAge: 30 * 60, path: "/" });
  else cookieStore.delete("monetizable_agent_grant");
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${config.appUrl}/api/agent/gmail/callback`;
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", prompt: "select_account", scope: "openid email profile", state });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
