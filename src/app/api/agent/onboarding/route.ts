import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import {
  capacityGraphForCandidate,
  authorizationForUser,
  completeAgentOnboarding,
  saveAgentIntent,
  subscriptionForUser,
  upsertAgentAuthorization,
  upsertApplicationProfile,
} from "@/lib/opportunity-agent/storage";
import { validCustomIntent } from "@/lib/agent-intents";
import { SubscriptionRequired } from "@/lib/account-usage";
import { analysisBelongsToUser } from "@/lib/storage";
import { candidateProfileIdForAnalysis, analysisIdForCandidateProfile } from "@/lib/opportunity-agent/storage";
import { canBuildSkillStack } from "@/lib/skill-stack-access";

export const runtime = "nodejs";

const payloadSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("intent"),
    analysisId: z.string().uuid().optional(),
    combinationIndex: z.number().int().nonnegative().optional(),
    capabilities: z.array(z.string().trim().min(1).max(80)).min(1).max(3).optional(),
  }).refine((value) => value.combinationIndex !== undefined || value.capabilities?.length, "Intent is required"),
  z.object({
    action: z.literal("complete"), analysisId: z.string().uuid(), executionConsent: z.boolean().optional(),
    profile: z.object({
      target_locations: z.array(z.string()).max(20),
      remote_preference: z.string().max(80),
      relocation_preference: z.string().max(80),
      work_authorization: z.record(z.string(), z.unknown()),
      contract_types: z.array(z.string()).min(1).max(12),
      available_from: z.string().max(80).optional(),
      confirmed_answers: z.record(z.string(), z.string()),
    }),
  }),
]);

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subscription = await subscriptionForUser(user.id);
  if (!subscription?.candidate_profile_id) return NextResponse.json({ error: "Active subscription required" }, { status: 403 });

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid onboarding request" }, { status: 400 });
  const unlockId = parsed.data.analysisId ?? await analysisIdForCandidateProfile(subscription.candidate_profile_id);
  if (!unlockId || !await canBuildSkillStack(user.id, unlockId)) return NextResponse.json({ error: "One-time unlock required", unlockUrl: unlockId ? `/unlock/${unlockId}` : undefined }, { status: 402 });

  try {
    if (parsed.data.action === "intent") {
      const analysisId = parsed.data.analysisId;
      if (analysisId && !await analysisBelongsToUser(analysisId,user.id)) return NextResponse.json({error:"Analysis not found for this account"},{status:403});
      const candidateId = analysisId ? await candidateProfileIdForAnalysis(analysisId) : subscription.candidate_profile_id;
      if (!candidateId) return NextResponse.json({error:"Profile not found"},{status:404});
      const graph = await capacityGraphForCandidate(candidateId);
      if (!graph) return NextResponse.json({ error: "Capacity Graph not found" }, { status: 404 });
      const combination = parsed.data.combinationIndex === undefined ? undefined : graph.combinations[parsed.data.combinationIndex];
      const capabilities = combination?.elements ?? validCustomIntent(graph, parsed.data.capabilities ?? []);
      if (!capabilities) return NextResponse.json({ error: "Choose 1–3 capabilities from your Capacity Graph" }, { status: 400 });
      const onboarding = await saveAgentIntent(user.id, candidateId, {
        combinationIndex: combination ? parsed.data.combinationIndex! : null,
        label: capabilities.join(" × "),
        capabilities,
      });
      return NextResponse.json({ onboarding });
    }

    const existingAuthorization = await authorizationForUser(user.id);
    const canReuseApproval = Boolean(existingAuthorization?.consent_version && existingAuthorization.status !== "revoked");
    if (parsed.data.executionConsent !== true && !canReuseApproval) {
      return NextResponse.json({ error: "Initial Agent approval is required" }, { status: 400 });
    }
    const completed = await completeAgentOnboarding(
      user.id,
      subscription.id,
      parsed.data.analysisId,
      parsed.data.executionConsent === true || canReuseApproval,
    );
    await upsertAgentAuthorization({
      userId: user.id,
      candidateProfileId: completed.candidateProfileId,
      status: canReuseApproval ? existingAuthorization.status : "active",
      allowAts: false,
      allowEmail: canReuseApproval ? Boolean(existingAuthorization.allow_email_outreach) : true,
      consentVersion: existingAuthorization?.consent_version ?? "agent-execution-v3",
    });
    await upsertApplicationProfile(user.id, {
      ...parsed.data.profile,
      target_roles: completed.onboarding?.intent_capabilities ?? [],
      salary_floor: null,
      excluded_industries: [],
      excluded_companies: [],
      excluded_work_types: [],
    });
    return NextResponse.json({ completed: true });
  } catch (error) {
    if (error instanceof SubscriptionRequired) return NextResponse.json({error:error.message,subscribeUrl:"/subscribe"},{status:402});
    console.error("Agent onboarding failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Onboarding failed" }, { status: 500 });
  }
}
