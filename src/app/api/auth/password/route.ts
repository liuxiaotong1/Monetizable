import { NextResponse } from "next/server";
import { sendSignupConfirmationEmail } from "@/lib/account-email";
import { openAgentAccessGrant } from "@/lib/analysis-token";
import { safeAuthRedirect } from "@/lib/auth-flow";
import { claimAnalysisForUser } from "@/lib/storage";
import { resetAgentOnboardingForCandidate, upsertAgentSubscription } from "@/lib/opportunity-agent/storage";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

async function attachAccessGrant(token: unknown, email: string, userId: string) {
  if (!token) return;
  const analysisId = openAgentAccessGrant(String(token));
  if (!analysisId) throw new Error("This access link has expired. Apply the code again.");
  if (!await claimAnalysisForUser(analysisId, userId)) throw new Error("This analysis is already attached to another account.");
  const subscription = await upsertAgentSubscription({ analysisId, email, status: "trialing" });
  if (subscription?.candidate_profile_id) await resetAgentOnboardingForCandidate(subscription.candidate_profile_id);
}

export async function POST(request: Request) {
  try {
    const { mode, email, password, redirectPath, agentAccessGrant } = await request.json();
    const value = String(email ?? "").trim().toLowerCase();
    const secret = String(password ?? "");
    const next = safeAuthRedirect(redirectPath);
    if (mode !== "signup" && mode !== "login") return NextResponse.json({ error: "Choose Log in or Sign up." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(value)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    if (secret.length < 8) return NextResponse.json({ error: "Use at least 8 characters for your password." }, { status: 400 });
    const client = await createServerSupabaseClient();
    if (!client) throw new Error("Authentication is not configured.");

    if (mode === "signup") {
      const admin = createAdminSupabaseClient();
      if (!admin) throw new Error("Authentication is not configured.");
      const { data, error } = await admin.auth.admin.generateLink({ type: "signup", email: value, password: secret });
      if (error) throw error;
      if (!data.properties?.hashed_token) throw new Error("Could not create the confirmation link.");
      await attachAccessGrant(agentAccessGrant, value, data.user.id);
      const signupNext = agentAccessGrant ? "/agent?setup=intent" : next === "/agent" ? "/?welcome=supercharlie#analyze" : next;
      await sendSignupConfirmationEmail(value, data.properties.hashed_token, signupNext);
      return NextResponse.json({ ok: true, message: "Account created. Confirm your email, then upload your CV to start with SuperCharlie." });
    }

    const { data, error } = await client.auth.signInWithPassword({ email: value, password: secret });
    if (error || !data.user) return NextResponse.json({ error: "Email or password is incorrect. If you are new, choose Sign up." }, { status: 401 });
    await attachAccessGrant(agentAccessGrant, value, data.user.id);
    return NextResponse.json({ ok: true, redirect: agentAccessGrant ? "/agent?setup=intent" : next });
  } catch (error) {
    console.error("Password authentication failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication failed." }, { status: 400 });
  }
}
