import { createHash } from "node:crypto";
import { analysisBelongsToUser, supabaseConfig, supabaseRest } from "@/lib/storage";
import { config } from "@/lib/config";
import { PAYWALL_ENABLED } from "@/lib/access-policy";
import { isAccountAdmin } from "@/lib/admin";
import { isRemoteOnlyOpportunity } from "@/lib/remote-only";
import { SubscriptionRequired } from "@/lib/account-usage";
import { ensureCapacityGraph, sanitizeCapacityGraph } from "@/lib/capacity-graph";
import { isCapabilityLabel } from "@/lib/capability-label";
import { storedBuyerProblemMatches } from "@/lib/opportunity-agent/buyer-problems";
import { opportunityTitleSupportsIntent } from "@/lib/opportunity-execution-guard";
import { opportunityEvidence } from "@/lib/capability-evidence";
import { remoteLocationAllows, permitsEmployment } from "@/lib/remote-eligibility";
import type { CapacityGraph, Opportunity, UserContext } from "@/lib/types";
import type { CapacitySignature, MarketTopic, OpportunitySignature, AgentJobKind, ScanFunnelSnapshot } from "@/lib/opportunity-agent/types";

export interface ActiveAgentProfile {
  userId: string;
  email: string;
  candidateProfileId: string;
  graph: CapacityGraph;
  context: UserContext;
  intentCombinationIndex?: number;
  intentCapabilities?: string[];
}

const CURRENT_MATCHING_RELEASE_AT = "2026-09-02T19:48:00.000Z";

function safeDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export async function candidateProfileIdForAnalysis(analysisId: string) {
  const rows = await supabaseRest(`candidate_scans?analysis_id=eq.${encodeURIComponent(analysisId)}&select=candidate_profile_id&limit=1`);
  return rows?.[0]?.candidate_profile_id as string | undefined;
}

export async function upsertAgentSubscription(input: {
  analysisId: string;
  email: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status: string;
  currentPeriodEnd?: string;
}) {
  const candidateProfileId = await candidateProfileIdForAnalysis(input.analysisId);
  if (!candidateProfileId) throw new Error("Candidate profile not found for subscription");
  const rows = await supabaseRest("agent_subscriptions?on_conflict=candidate_profile_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      candidate_profile_id: candidateProfileId,
      email: input.email.trim().toLowerCase(),
      stripe_customer_id: input.stripeCustomerId,
      stripe_subscription_id: input.stripeSubscriptionId,
      status: input.status,
      current_period_end: input.currentPeriodEnd,
      updated_at: new Date().toISOString(),
    }),
  });
  return rows?.[0];
}

export async function updateSubscriptionByStripeId(stripeSubscriptionId: string, input: { status: string; currentPeriodEnd?: string }) {
  return supabaseRest(`agent_subscriptions?stripe_subscription_id=eq.${encodeURIComponent(stripeSubscriptionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: input.status, current_period_end: input.currentPeriodEnd, updated_at: new Date().toISOString() }),
  });
}

export async function markActivationEmailSent(subscriptionId: string) {
  return supabaseRest(`agent_subscriptions?id=eq.${encodeURIComponent(subscriptionId)}&activation_email_sent_at=is.null`, {
    method: "PATCH",
    body: JSON.stringify({ activation_email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
}

export async function linkSubscriptionUser(email: string, userId: string) {
  const normalized = email.trim().toLowerCase();
  const ownerFilter = `&or=(user_id.is.null,user_id.eq.${encodeURIComponent(userId)})`;
  const subscriptions = await supabaseRest(`agent_subscriptions?email=eq.${encodeURIComponent(normalized)}${ownerFilter}&status=in.(active,trialing)&select=id,candidate_profile_id`);
  if (!subscriptions?.length) return null;
  await supabaseRest(`agent_subscriptions?email=eq.${encodeURIComponent(normalized)}${ownerFilter}&status=in.(active,trialing)`, {
    method: "PATCH",
    body: JSON.stringify({ user_id: userId, updated_at: new Date().toISOString() }),
  });
  const profileIds = subscriptions.flatMap((row: { candidate_profile_id?: string | null }) => row.candidate_profile_id ? [row.candidate_profile_id] : []);
  await Promise.all(profileIds.map((profileId: string) => supabaseRest(`candidate_profiles?id=eq.${encodeURIComponent(profileId)}${ownerFilter}`, {
    method: "PATCH",
    body: JSON.stringify({ user_id: userId, updated_at: new Date().toISOString() }),
  })));
  return (subscriptions[0].candidate_profile_id as string | null) ?? null;
}

export async function getActiveAgentProfiles(): Promise<ActiveAgentProfile[]> {
  if (!supabaseConfig()) return [];
  const subscriptions = await supabaseRest(PAYWALL_ENABLED
    ? "agent_subscriptions?status=in.(active,trialing)&user_id=not.is.null&candidate_profile_id=not.is.null&select=id,user_id,email,candidate_profile_id,updated_at,created_at&order=updated_at.desc,created_at.desc"
    : "agent_onboarding?completed_at=not.is.null&candidate_profile_id=not.is.null&select=user_id,candidate_profile_id,updated_at&order=updated_at.desc") as Array<{ id: string; user_id: string; email: string; candidate_profile_id: string; updated_at?: string; created_at?: string }> | null;
  const byUser = new Map<string, Array<{ id: string; user_id: string; email: string; candidate_profile_id: string; updated_at?: string; created_at?: string }>>();
  if (PAYWALL_ENABLED) {
    const onboarded = await supabaseRest("agent_onboarding?completed_at=not.is.null&candidate_profile_id=not.is.null&select=user_id,candidate_profile_id,updated_at&order=updated_at.desc");
    for (const row of onboarded ?? []) {
      if (await isAccountAdmin(row.user_id)) {
        byUser.set(row.user_id, [{ ...row, id: row.candidate_profile_id, email: "" }]);
      }
    }
  }
  for (const subscription of subscriptions ?? []) {
    const userId = String(subscription.user_id);
    byUser.set(userId, [...(byUser.get(userId) ?? []), subscription]);
  }
  const canonicalSubscriptions: Array<{ id: string; user_id: string; email: string; candidate_profile_id: string; updated_at?: string; created_at?: string }> = [];
  for (const candidates of byUser.values()) canonicalSubscriptions.push(candidates[0]);
  const profiles: ActiveAgentProfile[] = [];
  for (const subscription of canonicalSubscriptions) {
    const [graph, profileRows, onboardingRows, authorizationRows, applicationRows] = await Promise.all([
      capacityGraphForCandidate(subscription.candidate_profile_id),
      supabaseRest(`candidate_profiles?id=eq.${encodeURIComponent(subscription.candidate_profile_id)}&user_id=eq.${encodeURIComponent(subscription.user_id)}&select=constraints&limit=1`),
      supabaseRest(`agent_onboarding?user_id=eq.${encodeURIComponent(subscription.user_id)}&candidate_profile_id=eq.${encodeURIComponent(subscription.candidate_profile_id)}&completed_at=not.is.null&select=intent_combination_index,intent_capabilities&limit=1`),
      supabaseRest(`agent_authorizations?user_id=eq.${encodeURIComponent(subscription.user_id)}&candidate_profile_id=eq.${encodeURIComponent(subscription.candidate_profile_id)}&status=eq.active&select=id,allow_ats_application,allow_email_outreach&limit=1`),
      supabaseRest(`application_profiles?user_id=eq.${encodeURIComponent(subscription.user_id)}&select=target_roles,target_locations,remote_preference,relocation_preference,work_authorization,contract_types,available_from&limit=1`),
    ]);
    const constraints = profileRows?.[0]?.constraints ?? {};
    const onboarding = onboardingRows?.[0];
    const application = applicationRows?.[0] ?? {};
    if (!graph || !profileRows?.[0] || !onboarding || !authorizationRows?.[0]) continue;
    const remotePreference = String(application.remote_preference ?? "");
    const targetLocations = Array.isArray(application.target_locations) ? application.target_locations.filter(Boolean) : [];
    const targetRoles = Array.isArray(application.target_roles) ? application.target_roles.filter(Boolean) : [];
    const contractTypes = Array.isArray(application.contract_types) ? application.contract_types.filter(Boolean) : [];
    const workAuthorization = typeof application.work_authorization?.summary === "string" ? application.work_authorization.summary : "";
    const globalRemote = remotePreference === "global_remote";
    profiles.push({
      userId: subscription.user_id,
      email: subscription.email ?? "",
      candidateProfileId: subscription.candidate_profile_id,
      graph,
      context: {
        // Remote describes the working arrangement, not the right to work
        // everywhere. Retain country eligibility for source-side filtering.
        country: constraints.country ?? targetLocations[0],
        city: globalRemote ? undefined : targetLocations[0] ?? constraints.city,
        workMode: globalRemote ? "global_remote" : remotePreference === "regional_remote" ? "regional_remote" : constraints.workMode ?? "global_remote",
        exclusions: constraints.exclusions,
        targetRoles,
        targetLocations,
        relocationPreference: String(application.relocation_preference ?? ""),
        workAuthorization,
        contractTypes,
        availableFrom: String(application.available_from ?? ""),
      },
      intentCombinationIndex: onboarding.intent_combination_index == null ? -1 : Number(onboarding.intent_combination_index),
      intentCapabilities: (onboarding.intent_capabilities ?? []).filter((value: string) => isCapabilityLabel(value)),
    });
  }
  return profiles;
}

export async function agentOnboardingForUser(userId: string) {
  const rows = await supabaseRest(`agent_onboarding?user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc&limit=1`);
  return rows?.[0] ?? null;
}

export async function resetAgentOnboardingForCandidate(candidateProfileId: string) {
  return supabaseRest(`agent_onboarding?candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      intent_combination_index: null,
      intent_label: null,
      intent_capabilities: [],
      cv_confirmed_at: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function saveAgentIntent(userId: string, candidateProfileId: string, input: { combinationIndex: number | null; label: string; capabilities: string[] }) {
  const capabilities = input.capabilities.filter(isCapabilityLabel);
  const data = await supabaseRest("rpc/save_account_direction", {
    method: "POST", body: JSON.stringify({ p_user: userId, p_candidate: candidateProfileId, p_index: input.combinationIndex, p_capabilities: capabilities }),
  });
  if (data.error === "payment_required") throw new SubscriptionRequired();
  if (data.error) throw new Error("Could not save this direction for your account");
  return data.onboarding;
}

export async function completeAgentOnboarding(userId: string, subscriptionId: string, analysisId: string, executionConsent: boolean) {
  if (!await analysisBelongsToUser(analysisId, userId)) throw new Error("This analysis is not attached to your account");
  const candidateProfileId = await candidateProfileIdForAnalysis(analysisId);
  if (!candidateProfileId) throw new Error("Candidate profile not found for uploaded CV");
  const current = await agentOnboardingForUser(userId);
  if (!current?.intent_capabilities?.length) throw new Error("Select an intent before uploading your CV");
  if (current.candidate_profile_id !== candidateProfileId) throw new Error("Choose a direction from this analysis before starting SuperCharlie");
  const now = new Date().toISOString();
  if (PAYWALL_ENABLED) await supabaseRest(`agent_subscriptions?id=eq.${encodeURIComponent(subscriptionId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ candidate_profile_id: candidateProfileId, updated_at: now }),
  });
  await supabaseRest(`candidate_profiles?id=eq.${encodeURIComponent(candidateProfileId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ user_id: userId, updated_at: now }),
  });
  const graph = await capacityGraphForCandidate(candidateProfileId);
  const customIntent = current.intent_combination_index == null;
  const selectedIndex = Number(current.intent_combination_index ?? 0);
  const selected = graph?.combinations[selectedIndex];
  const availableLabels = new Map(graph?.nodes.map((node) => [node.label.toLocaleLowerCase(), node.label]) ?? []);
  const retainedCustomCapabilities = customIntent
    ? current.intent_capabilities.map((value: string) => availableLabels.get(value.toLocaleLowerCase())).filter(Boolean)
    : [];
  const rows = await supabaseRest(`agent_onboarding?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      candidate_profile_id: candidateProfileId,
      intent_combination_index: customIntent ? null : selectedIndex,
      intent_label: retainedCustomCapabilities.length ? retainedCustomCapabilities.join(" × ") : selected?.elements.join(" × ") ?? current.intent_label,
      intent_capabilities: retainedCustomCapabilities.length ? retainedCustomCapabilities : selected?.elements ?? current.intent_capabilities,
      cv_confirmed_at: now,
      execution_consent_version: executionConsent ? "agent-execution-v2" : null,
      execution_consented_at: executionConsent ? now : null,
      completed_at: now,
      updated_at: now,
    }),
  });
  return { onboarding: rows?.[0] ?? null, candidateProfileId };
}

function bestIntentIndex(graph: CapacityGraph, capabilities: string[]) {
  const wanted = new Set(capabilities.map((value) => value.toLowerCase()));
  let bestIndex = 0;
  let bestScore = -1;
  graph.combinations.forEach((combination, index) => {
    const score = combination.elements.filter((value) => wanted.has(value.toLowerCase())).length;
    if (score > bestScore) { bestScore = score; bestIndex = index; }
  });
  return bestIndex;
}

export async function saveScanFunnelSnapshot(scanRunId: string, profile: ActiveAgentProfile, snapshot: ScanFunnelSnapshot) {
  return supabaseRest("scan_funnel_snapshots?on_conflict=scan_run_id,candidate_profile_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      scan_run_id: scanRunId,
      user_id: profile.userId,
      candidate_profile_id: profile.candidateProfileId,
      market_signals_scanned: snapshot.marketSignalsScanned,
      eligible_after_hard_filters: snapshot.eligibleAfterHardFilters,
      capacity_matches: snapshot.capacityMatches,
      strong_opportunities: snapshot.strongOpportunities,
      hot_leads: snapshot.hotLeads,
      opportunity_type_breakdown: snapshot.opportunityTypeBreakdown,
      filtered_out_reasons: snapshot.filteredOutReasons,
    }),
  });
}

export async function createScanRun() {
  const rows = await supabaseRest("scan_runs", { method: "POST", body: JSON.stringify({ status: "running" }) });
  return rows?.[0]?.id as string;
}

export async function finishScanRun(id: string, input: Record<string, unknown>) {
  return supabaseRest(`scan_runs?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, completed_at: new Date().toISOString() }),
  });
}

function vectorLiteral(value?: number[]) {
  return value?.length ? `[${value.join(",")}]` : null;
}

export async function upsertMarketTopic(topic: MarketTopic) {
  const rows = await supabaseRest("market_topics?on_conflict=topic_key", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      topic_key: topic.key,
      label: topic.label,
      query: topic.query,
      opportunity_kinds: topic.opportunityKinds,
      regions: topic.regions,
      languages: topic.languages,
      status: "active",
      updated_at: new Date().toISOString(),
    }),
  });
  return rows?.[0] as { id: string; last_scanned_at?: string; next_scan_at?: string } | undefined;
}

export async function linkMarketTopicProfile(topicId: string, candidateProfileId: string, combinationIndex: number) {
  return supabaseRest("market_topic_profiles?on_conflict=topic_id,candidate_profile_id,combination_index", {
    method: "POST",
    headers: { prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ topic_id: topicId, candidate_profile_id: candidateProfileId, combination_index: Math.max(0, combinationIndex) }),
  });
}

export async function markMarketTopicScanned(topicId: string) {
  // Keep a one-hour guard so a daily cron never misses the due boundary by a
  // few seconds and accidentally turns a 24h radar into a 48h radar.
  const next = new Date(Date.now() + 23 * 3_600_000).toISOString();
  return supabaseRest(`market_topics?id=eq.${encodeURIComponent(topicId)}`, {
    method: "PATCH",
    body: JSON.stringify({ last_scanned_at: new Date().toISOString(), next_scan_at: next, updated_at: new Date().toISOString() }),
  });
}

export async function linkMarketTopicOpportunity(topicId: string, opportunityId: string) {
  return supabaseRest("market_topic_opportunities?on_conflict=topic_id,opportunity_id", {
    method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ topic_id: topicId, opportunity_id: opportunityId, last_seen_at: new Date().toISOString() }),
  });
}

export async function opportunitiesForMarketTopic(topicId: string) {
  const now = encodeURIComponent(new Date().toISOString());
  return supabaseRest(`market_topic_opportunities?topic_id=eq.${encodeURIComponent(topicId)}&select=market_opportunities!inner(id,raw_payload,expires_at)&market_opportunities.expires_at=gt.${now}&limit=300`);
}

export async function capacitySignatureRow(candidateProfileId: string) {
  const rows = await supabaseRest(`capacity_signatures?candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&select=graph_version,signature_text,embedding,embedding_model&limit=1`);
  return rows?.[0] ?? null;
}

export async function opportunitySignatureRow(opportunityId: string) {
  const rows = await supabaseRest(`opportunity_signatures?opportunity_id=eq.${encodeURIComponent(opportunityId)}&select=embedding,embedding_model&limit=1`);
  return rows?.[0] ?? null;
}

export async function opportunitySignatureRows(opportunityIds: string[]) {
  if (!opportunityIds.length) return [];
  return supabaseRest(`opportunity_signatures?opportunity_id=in.(${opportunityIds.map((id) => encodeURIComponent(id)).join(",")})&select=opportunity_id,embedding,embedding_model`);
}

export async function upsertOpportunitySignatures(rows: Array<{ opportunityId: string; signature: OpportunitySignature; embeddingModel?: string }>) {
  if (!rows.length) return [];
  return supabaseRest("opportunity_signatures?on_conflict=opportunity_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows.map(({ opportunityId, signature, embeddingModel }) => ({ opportunity_id: opportunityId, kind: signature.kind, capabilities: signature.capabilities, geography: signature.geography, requirements: signature.requirements, contact_method: signature.contactMethod, contact_value: signature.contactValue, signature_text: signature.signatureText, embedding: vectorLiteral(signature.embedding), embedding_model: embeddingModel, updated_at: new Date().toISOString() }))),
  });
}

export async function upsertCapacitySignature(candidateProfileId: string, signature: CapacitySignature, embeddingModel?: string) {
  return supabaseRest("capacity_signatures?on_conflict=candidate_profile_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      candidate_profile_id: candidateProfileId,
      graph_version: signature.graphVersion,
      top_capabilities: signature.topCapabilities,
      combinations: signature.combinations,
      languages: signature.languages,
      constraints: signature.constraints,
      target_markets: signature.targetMarkets,
      signature_text: signature.signatureText,
      embedding: vectorLiteral(signature.embedding),
      embedding_model: embeddingModel,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function upsertOpportunitySignature(opportunityId: string, signature: OpportunitySignature, embeddingModel?: string) {
  return supabaseRest("opportunity_signatures?on_conflict=opportunity_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      opportunity_id: opportunityId,
      kind: signature.kind,
      capabilities: signature.capabilities,
      geography: signature.geography,
      requirements: signature.requirements,
      contact_method: signature.contactMethod,
      contact_value: signature.contactValue,
      signature_text: signature.signatureText,
      embedding: vectorLiteral(signature.embedding),
      embedding_model: embeddingModel,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function authorizationForUser(userId: string) {
  const rows = await supabaseRest(`agent_authorizations?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  return rows?.[0] ?? null;
}

export async function isCurrentAgentExecutionTarget(userId: string, candidateProfileId: string, jobCreatedAt?: string) {
  const requiresSubscription = PAYWALL_ENABLED && !await isAccountAdmin(userId);
  const [subscriptions, onboarding, authorizations] = await Promise.all([
    requiresSubscription
      ? supabaseRest(`agent_subscriptions?user_id=eq.${encodeURIComponent(userId)}&candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&status=in.(active,trialing)&select=id&limit=1`)
      : supabaseRest(`candidate_profiles?user_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(candidateProfileId)}&select=id&limit=1`),
    supabaseRest(`agent_onboarding?user_id=eq.${encodeURIComponent(userId)}&candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&completed_at=not.is.null&select=user_id,updated_at&limit=1`),
    supabaseRest(`agent_authorizations?user_id=eq.${encodeURIComponent(userId)}&candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&status=eq.active&select=updated_at&limit=1`),
  ]);
  if (!subscriptions?.[0] || !onboarding?.[0] || !authorizations?.[0]) return false;
  if (!jobCreatedAt) return true;
  return new Date(jobCreatedAt).getTime() >= Math.max(new Date(onboarding[0].updated_at ?? 0).getTime(), new Date(authorizations[0].updated_at ?? 0).getTime());
}

export async function upsertAgentAuthorization(input: {
  userId: string; candidateProfileId: string; status: "active" | "paused" | "revoked"; allowAts: boolean; allowEmail: boolean; consentVersion: string;
}) {
  const now = new Date().toISOString();
  const rows = await supabaseRest("agent_authorizations?on_conflict=user_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      user_id: input.userId,
      candidate_profile_id: input.candidateProfileId,
      status: input.status,
      allow_ats_application: input.allowAts,
      allow_email_outreach: input.allowEmail,
      consent_version: input.consentVersion,
      consented_at: input.status === "active" ? now : undefined,
      paused_at: input.status === "paused" ? now : null,
      revoked_at: input.status === "revoked" ? now : null,
      updated_at: now,
    }),
  });
  return rows?.[0];
}

export async function applicationProfileForUser(userId: string) {
  const rows = await supabaseRest(`application_profiles?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  return rows?.[0] ?? null;
}

export async function upsertApplicationProfile(userId: string, input: Record<string, unknown>) {
  const rows = await supabaseRest("application_profiles?on_conflict=user_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ user_id: userId, ...input, updated_at: new Date().toISOString() }),
  });
  return rows?.[0];
}

export async function mergeConfirmedAnswers(userId: string, answers: Record<string, string>) {
  const current = await applicationProfileForUser(userId);
  return upsertApplicationProfile(userId, { confirmed_answers: { ...(current?.confirmed_answers ?? {}), ...answers } });
}

export async function enqueueAgentJob(input: {
  idempotencyKey: string; userId: string; candidateProfileId: string; matchId: string; kind: AgentJobKind; priority?: number; payload?: Record<string, unknown>;
}) {
  const rows = await supabaseRest("agent_jobs?on_conflict=idempotency_key", {
    method: "POST",
    headers: { prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({
      idempotency_key: input.idempotencyKey,
      user_id: input.userId,
      candidate_profile_id: input.candidateProfileId,
      opportunity_match_id: input.matchId,
      kind: input.kind,
      priority: input.priority ?? 0,
      input: input.payload ?? {},
    }),
  });
  if (rows?.[0]) return rows[0];
  const existing = await supabaseRest(`agent_jobs?idempotency_key=eq.${encodeURIComponent(input.idempotencyKey)}&user_id=eq.${encodeURIComponent(input.userId)}&select=*&limit=1`);
  const job = existing?.[0] ?? null;
  const retryableErrors = new Set(["ats_execution_failed", "execution_timeout", "submit_not_found", "gmail_send_failed", "draft_generation_failed"]);
  if (job?.status === "failed" && Number(job.attempts ?? 0) < 3 && retryableErrors.has(String(job.error_code ?? ""))) {
    const retried = await supabaseRest(`agent_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.failed`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        status: "queued",
        input: input.payload ?? job.input ?? {},
        priority: input.priority ?? job.priority ?? 0,
        run_after: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
        error_code: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      }),
    });
    return retried?.[0] ?? job;
  }
  return job;
}

export async function claimAgentJobForUser(userId: string, jobId: string, workerId = `direct-${Date.now()}`) {
  const current = await agentJobForUser(userId, jobId);
  if (!current || current.status !== "queued") return null;
  const rows = await supabaseRest(`agent_jobs?id=eq.${encodeURIComponent(jobId)}&user_id=eq.${encodeURIComponent(userId)}&status=eq.queued&run_after=lte.${encodeURIComponent(new Date().toISOString())}`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ status: "running", attempts: Number(current.attempts ?? 0) + 1, locked_at: new Date().toISOString(), locked_by: workerId, updated_at: new Date().toISOString() }),
  });
  return rows?.[0] ?? null;
}

export async function claimQueuedJobs(limit = 10, workerId = `vercel-${Date.now()}`) {
  const staleBefore = new Date(Date.now() - 30 * 60_000).toISOString();
  await quarantineStaleEmailJobs(staleBefore);
  await supabaseRest(`agent_jobs?kind=neq.email_outreach&status=eq.running&locked_at=lt.${encodeURIComponent(staleBefore)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "queued", locked_at: null, locked_by: null, run_after: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
  const rows = await supabaseRest(`agent_jobs?status=eq.queued&run_after=lte.${encodeURIComponent(new Date().toISOString())}&select=*&order=priority.desc,created_at.asc&limit=${limit}`);
  const claimed = [];
  for (const row of rows ?? []) {
    const updated = await supabaseRest(`agent_jobs?id=eq.${encodeURIComponent(row.id)}&status=eq.queued`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ status: "running", locked_at: new Date().toISOString(), locked_by: workerId, attempts: Number(row.attempts ?? 0) + 1, updated_at: new Date().toISOString() }),
    });
    if (updated?.[0]) claimed.push(updated[0]);
  }
  return claimed;
}

async function claimQueuedJobsWithFilter(filter: string, limit: number, workerId: string) {
  const staleBefore = new Date(Date.now() - 30 * 60_000).toISOString();
  await quarantineStaleEmailJobs(staleBefore);
  await supabaseRest(`agent_jobs?kind=neq.email_outreach&status=eq.running&locked_at=lt.${encodeURIComponent(staleBefore)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "queued", locked_at: null, locked_by: null, run_after: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
  const rows = await supabaseRest(`agent_jobs?status=eq.queued&run_after=lte.${encodeURIComponent(new Date().toISOString())}${filter}&select=*&order=priority.desc,created_at.asc&limit=${limit}`);
  const claimed = [];
  for (const row of rows ?? []) {
    const updated = await supabaseRest(`agent_jobs?id=eq.${encodeURIComponent(row.id)}&status=eq.queued`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ status: "running", locked_at: new Date().toISOString(), locked_by: workerId, attempts: Number(row.attempts ?? 0) + 1, updated_at: new Date().toISOString() }),
    });
    if (updated?.[0]) claimed.push(updated[0]);
  }
  return claimed;
}

export async function claimQueuedJobsByKind(kind: AgentJobKind, limit = 10, workerId = `vercel-${Date.now()}`) {
  const startToday = new Date();
  startToday.setUTCHours(0, 0, 0, 0);
  return claimQueuedJobsWithFilter(`&kind=eq.${encodeURIComponent(kind)}&created_at=gte.${encodeURIComponent(startToday.toISOString())}`, limit, workerId);
}

export async function claimQueuedJobsForUserByKind(userId: string, kind: AgentJobKind, limit = 10, workerId = `direct-${Date.now()}`) {
  return claimQueuedJobsWithFilter(`&user_id=eq.${encodeURIComponent(userId)}&kind=eq.${encodeURIComponent(kind)}`, limit, workerId);
}

export async function claimQueuedJobsForProfileByKind(userId: string, candidateProfileId: string, kind: AgentJobKind, limit = 10, workerId = `profile-${Date.now()}`) {
  return claimQueuedJobsWithFilter(`&user_id=eq.${encodeURIComponent(userId)}&candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&kind=eq.${encodeURIComponent(kind)}`, limit, workerId);
}

export async function finishAgentJob(jobId: string, status: "awaiting_user_answer" | "submitted" | "sent" | "failed" | "skipped", input: { result?: Record<string, unknown>; requiredAnswers?: unknown[]; errorCode?: string; errorMessage?: string } = {}) {
  return supabaseRest(`agent_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      result: input.result ?? {},
      required_answers: input.requiredAnswers ?? [],
      error_code: input.errorCode,
      error_message: input.errorMessage,
      completed_at: ["submitted", "sent", "failed", "skipped"].includes(status) ? new Date().toISOString() : null,
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function retryAgentJob(jobId: string, errorCode: string, errorMessage: string, delayMs = 30_000) {
  return supabaseRest(`agent_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "queued",
      run_after: new Date(Date.now() + delayMs).toISOString(),
      error_code: errorCode,
      error_message: errorMessage,
      completed_at: null,
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function agentJobForUser(userId: string, jobId: string) {
  const rows = await supabaseRest(`agent_jobs?id=eq.${encodeURIComponent(jobId)}&user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  return rows?.[0] ?? null;
}

async function quarantineStaleEmailJobs(staleBefore: string) {
  await supabaseRest(`agent_jobs?kind=eq.email_outreach&status=eq.running&locked_at=lt.${encodeURIComponent(staleBefore)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "failed", error_code: "gmail_delivery_unconfirmed", error_message: "Delivery confirmation was interrupted. Check Gmail Sent before sending again.", completed_at: new Date().toISOString(), locked_at: null, locked_by: null, updated_at: new Date().toISOString() }),
  });
}

export async function recoverStaleAgentJobForUser(userId: string, jobId: string, staleAfterMs = 150_000) {
  const current = await agentJobForUser(userId, jobId);
  const staleBefore = new Date(Date.now() - staleAfterMs).toISOString();
  await supabaseRest(`agent_jobs?id=eq.${encodeURIComponent(jobId)}&user_id=eq.${encodeURIComponent(userId)}&status=eq.running&locked_at=lt.${encodeURIComponent(staleBefore)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "failed",
      error_code: current?.kind === "email_outreach" ? "gmail_delivery_unconfirmed" : "execution_timeout",
      error_message: current?.kind === "email_outreach" ? "Delivery confirmation was interrupted. Check Gmail Sent before sending again." : "The application session ended before submission was confirmed.",
      completed_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    }),
  });
  return agentJobForUser(userId, jobId);
}

export async function analysisIdForCandidateProfile(candidateProfileId: string) {
  const rows = await supabaseRest(`candidate_scans?candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&select=analysis_id&order=created_at.desc&limit=1`);
  return rows?.[0]?.analysis_id as string | undefined;
}

export async function requeueAnsweredAgentJob(userId: string, jobId: string) {
  const rows = await supabaseRest(`agent_jobs?id=eq.${encodeURIComponent(jobId)}&user_id=eq.${encodeURIComponent(userId)}&status=eq.awaiting_user_answer`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ status: "queued", required_answers: [], run_after: new Date().toISOString(), error_code: null, error_message: null, updated_at: new Date().toISOString() }),
  });
  return rows?.[0] ?? null;
}

export async function deferAgentJob(jobId: string, delayMs = 86_400_000) {
  return supabaseRest(`agent_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "queued", run_after: new Date(Date.now() + delayMs).toISOString(), locked_at: null, locked_by: null, updated_at: new Date().toISOString() }),
  });
}

export async function gmailConnectionForUser(userId: string) {
  const rows = await supabaseRest(`gmail_connections?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  return rows?.[0] ?? null;
}

export async function gmailConnectionForAddress(address: string) {
  const rows = await supabaseRest(`gmail_connections?gmail_address=eq.${encodeURIComponent(address.trim().toLowerCase())}&status=eq.active&select=*&limit=1`);
  return rows?.[0] ?? null;
}

export async function activeGmailConnections() {
  return supabaseRest("gmail_connections?status=eq.active&select=*");
}

export async function upsertGmailConnection(userId: string, input: Record<string, unknown>) {
  const rows = await supabaseRest("gmail_connections?on_conflict=user_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ user_id: userId, ...input, updated_at: new Date().toISOString() }),
  });
  return rows?.[0];
}

export async function updateGmailConnection(userId: string, input: Record<string, unknown>) {
  return supabaseRest(`gmail_connections?user_id=eq.${encodeURIComponent(userId)}`, { method: "PATCH", body: JSON.stringify({ ...input, updated_at: new Date().toISOString() }) });
}

export async function sentOutreachStats(userId: string) {
  const since72 = encodeURIComponent(new Date(Date.now() - 72 * 3_600_000).toISOString());
  const since7d = encodeURIComponent(new Date(Date.now() - 7 * 86_400_000).toISOString());
  const startToday = new Date(); startToday.setUTCHours(0, 0, 0, 0);
  const [today, last72, last7, bounced7] = await Promise.all([
    supabaseRest(`outreach_messages?user_id=eq.${encodeURIComponent(userId)}&sent_at=gte.${encodeURIComponent(startToday.toISOString())}&select=id`),
    supabaseRest(`outreach_messages?user_id=eq.${encodeURIComponent(userId)}&sent_at=gte.${since72}&select=id`),
    supabaseRest(`outreach_messages?user_id=eq.${encodeURIComponent(userId)}&sent_at=gte.${since7d}&select=id`),
    supabaseRest(`outreach_messages?user_id=eq.${encodeURIComponent(userId)}&hard_bounced_at=gte.${since7d}&select=id`),
  ]);
  return { sentToday: today?.length ?? 0, sentLast72Hours: last72?.length ?? 0, sentLast7Days: last7?.length ?? 0, hardBouncesLast7Days: bounced7?.length ?? 0 };
}

export async function dailyAgentActionStats(userId: string, candidateProfileId?: string) {
  const startToday = new Date();
  startToday.setUTCHours(0, 0, 0, 0);
  const onboardingRows = candidateProfileId ? await supabaseRest(`agent_onboarding?user_id=eq.${encodeURIComponent(userId)}&candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&select=updated_at&limit=1`) : [];
  const directionUpdatedAt = onboardingRows?.[0]?.updated_at ? new Date(onboardingRows[0].updated_at).getTime() : 0;
  const since = encodeURIComponent(new Date(Math.max(startToday.getTime(), directionUpdatedAt)).toISOString());
  const profileFilter = candidateProfileId ? `&candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}` : "";
  const [completed, pending] = await Promise.all([
    supabaseRest(`agent_jobs?user_id=eq.${encodeURIComponent(userId)}${profileFilter}&completed_at=gte.${since}&status=eq.sent&select=id,status,opportunity_match_id,kind,result,completed_at`),
    supabaseRest(`agent_jobs?user_id=eq.${encodeURIComponent(userId)}${profileFilter}&created_at=gte.${since}&status=in.(queued,running)&select=id,status,opportunity_match_id,kind,input`),
  ]);
  const uniqueCompleted = [...new Map((completed ?? []).map((row: { opportunity_match_id?: string; id: string }) => [row.opportunity_match_id ?? row.id, row])).values()] as Array<{ status?: string }>;
  const approvedPending = (pending ?? []).filter((row: { input?: Record<string, unknown> }) => row.input?.approvalVersion === "user-approved-v1" && row.input?.approvedByUserAt);
  const uniquePending = new Set(approvedPending.map((row: { opportunity_match_id?: string; id: string }) => row.opportunity_match_id ?? row.id));
  return {
    completedToday: uniqueCompleted.length,
    pending: uniquePending.size,
    sentToday: uniqueCompleted.filter((row) => row.status === "sent").length,
    submittedToday: 0,
  };
}

export async function isSuppressed(userId: string, addressHash: string, domain: string) {
  const filter = `(or(user_id.eq.${userId},user_id.is.null),or(address_hash.eq.${addressHash},domain.eq.${domain}))`;
  const rows = await supabaseRest(`suppression_list?and=${encodeURIComponent(filter)}&select=id&limit=1`);
  return Boolean(rows?.[0]);
}

export async function createOutreachMessage(input: Record<string, unknown>) {
  const rows = await supabaseRest("outreach_messages?on_conflict=agent_job_id", {
    method: "POST", headers: { prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(input),
  });
  return rows?.[0];
}

export async function outreachForThread(userId: string, threadId: string) {
  const rows = await supabaseRest(`outreach_messages?user_id=eq.${encodeURIComponent(userId)}&gmail_thread_id=eq.${encodeURIComponent(threadId)}&select=*&limit=1`);
  return rows?.[0] ?? null;
}

export async function markOutreachHardBounced(outreachId: string) {
  return supabaseRest(`outreach_messages?id=eq.${encodeURIComponent(outreachId)}&hard_bounced_at=is.null`, { method: "PATCH", body: JSON.stringify({ hard_bounced_at: new Date().toISOString() }) });
}

export async function createReplySignal(input: Record<string, unknown>) {
  const rows = await supabaseRest("reply_signals?on_conflict=user_id,gmail_message_id", {
    method: "POST", headers: { prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify(input),
  });
  return rows?.[0];
}

export async function positiveReplyForOutreach(outreachMessageId: string) {
  const rows = await supabaseRest(`reply_signals?outreach_message_id=eq.${encodeURIComponent(outreachMessageId)}&classification=eq.positive&select=id&limit=1`);
  return rows?.[0] ?? null;
}

export async function markReplyNotified(replyId: string) {
  return supabaseRest(`reply_signals?id=eq.${encodeURIComponent(replyId)}&notified_at=is.null`, {
    method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ notified_at: new Date().toISOString() }),
  });
}

export async function agentJobsForUser(userId: string, candidateProfileId?: string) {
  const profileFilter = candidateProfileId ? `&candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}` : "";
  const onboardingRows = candidateProfileId ? await supabaseRest(`agent_onboarding?user_id=eq.${encodeURIComponent(userId)}&candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&select=updated_at&limit=1`) : [];
  const since = onboardingRows?.[0]?.updated_at ? `&created_at=gte.${encodeURIComponent(onboardingRows[0].updated_at)}` : "";
  const rows = await supabaseRest(`agent_jobs?user_id=eq.${encodeURIComponent(userId)}${profileFilter}${since}&select=id,opportunity_match_id,kind,status,input,result,required_answers,error_code,error_message,created_at,updated_at,completed_at&order=created_at.desc&limit=100`);
  return (rows ?? []).filter((row: { kind?: string; input?: Record<string, unknown> }) => row.kind !== "email_outreach"
    || row.input?.approvalVersion === "user-approved-v1");
}

export async function createApplicationRun(input: Record<string, unknown>) {
  const rows = await supabaseRest("application_runs", { method: "POST", body: JSON.stringify(input) });
  return rows?.[0];
}

export async function addSuppression(input: { userId?: string | null; addressHash: string; domain?: string; reason: "opt_out" | "negative_reply" | "hard_bounce" | "manual" | "provider_limit" }) {
  return supabaseRest("suppression_list?on_conflict=user_id,address_hash", {
    method: "POST", headers: { prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ user_id: input.userId, address_hash: input.addressHash, domain: input.domain, reason: input.reason }),
  });
}

export function opportunityFingerprint(opportunity: Opportunity) {
  const basis = opportunity.url || `${opportunity.kind}:${opportunity.source}:${opportunity.title}:${opportunity.summary.slice(0, 160)}`;
  return createHash("sha256").update(basis.toLowerCase()).digest("hex");
}

export async function upsertMarketOpportunity(opportunity: Opportunity) {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + config.freshnessDays);
  const rows = await supabaseRest("market_opportunities?on_conflict=fingerprint", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      fingerprint: opportunityFingerprint(opportunity),
      kind: opportunity.kind ?? "employment",
      title: opportunity.title,
      source: opportunity.source,
      source_url: opportunity.url || null,
      buyer: opportunity.buyer ?? null,
      posted_at: safeDate(opportunity.postedDate) ?? null,
      compensation: opportunity.compensation ?? null,
      location: opportunity.location ?? null,
      remote_status: opportunity.remoteStatus ?? null,
      authorization: opportunity.authorization ?? null,
      summary: opportunity.summary,
      required_skills: opportunity.requiredSkills,
      public_signals: opportunity.publicSignals ?? [],
      evidence_urls: opportunity.evidenceUrls ?? (opportunity.url ? [opportunity.url] : []),
      suggested_offer: opportunity.suggestedOffer ?? null,
      raw_payload: opportunity,
      last_seen_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }),
  });
  return rows?.[0]?.id as string;
}

export async function upsertMarketOpportunities(opportunities: Opportunity[]) {
  if (!opportunities.length) return [];
  const expiresAt = new Date(); expiresAt.setUTCDate(expiresAt.getUTCDate() + config.freshnessDays);
  return supabaseRest("market_opportunities?on_conflict=fingerprint", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(opportunities.map((opportunity) => ({ fingerprint: opportunityFingerprint(opportunity), kind: opportunity.kind ?? "employment", title: opportunity.title, source: opportunity.source, source_url: opportunity.url || null, buyer: opportunity.buyer ?? null, posted_at: safeDate(opportunity.postedDate) ?? null, compensation: opportunity.compensation ?? null, location: opportunity.location ?? null, remote_status: opportunity.remoteStatus ?? null, authorization: opportunity.authorization ?? null, summary: opportunity.summary, required_skills: opportunity.requiredSkills, public_signals: opportunity.publicSignals ?? [], evidence_urls: opportunity.evidenceUrls ?? (opportunity.url ? [opportunity.url] : []), suggested_offer: opportunity.suggestedOffer ?? null, raw_payload: opportunity, last_seen_at: new Date().toISOString(), expires_at: expiresAt.toISOString() }))),
  });
}

export async function upsertOpportunityMatch(profile: ActiveAgentProfile, opportunityId: string, opportunity: Opportunity, deepAnalysis?: Record<string, unknown>, analysisCacheKey?: string, reactivateForNewDirection = false) {
  const rows = await supabaseRest("opportunity_matches?on_conflict=candidate_profile_id,opportunity_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      user_id: profile.userId,
      candidate_profile_id: profile.candidateProfileId,
      opportunity_id: opportunityId,
      combination_index: opportunity.combinationIndex,
      fit_label: opportunity.fitLabel,
      fit_reason: opportunity.fitReason,
      score: opportunity.score,
      deep_analysis: deepAnalysis,
      analysis_cache_key: analysisCacheKey,
      ...(reactivateForNewDirection ? { status: "new", notified_at: null } : {}),
      updated_at: new Date().toISOString(),
    }),
  });
  return rows?.[0];
}

export async function cachedOpportunityMatches(candidateProfileId: string, opportunityIds: string[]) {
  if (!opportunityIds.length) return [];
  return supabaseRest(`opportunity_matches?candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&opportunity_id=in.(${opportunityIds.map((id) => encodeURIComponent(id)).join(",")})&select=opportunity_id,analysis_cache_key,fit_label,fit_reason,score,deep_analysis`);
}

export async function pendingHotLeads() {
  const now = encodeURIComponent(new Date().toISOString());
  return supabaseRest(`opportunity_matches?fit_label=eq.Strong%20fit&notified_at=is.null&status=neq.dismissed&select=id,user_id,fit_reason,score,candidate_profile_id,market_opportunities!inner(title,source,source_url,kind,compensation,location,summary,suggested_offer),candidate_profiles(display_name)&market_opportunities.expires_at=gt.${now}&order=score.desc&limit=100`);
}

export async function claimHotLeadNotification(matchId: string) {
  return supabaseRest(`opportunity_matches?id=eq.${encodeURIComponent(matchId)}&notified_at=is.null`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ notified_at: new Date().toISOString() }),
  });
}

export async function releaseHotLeadNotification(matchId: string) {
  return supabaseRest(`opportunity_matches?id=eq.${encodeURIComponent(matchId)}`, {
    method: "PATCH",
    body: JSON.stringify({ notified_at: null }),
  });
}

async function allFeedRows(query: string) {
  const rows = [];
  for (let offset = 0; ; offset += 200) {
    const page = await supabaseRest(`${query}&offset=${offset}`);
    rows.push(...(page ?? []));
    if (!page || page.length < 200) return rows;
  }
}

async function marketContextForUser(userId: string, candidateProfileId?: string): Promise<UserContext> {
  const [applications, profiles] = await Promise.all([
    supabaseRest(`application_profiles?user_id=eq.${encodeURIComponent(userId)}&select=target_locations,contract_types&limit=1`),
    candidateProfileId ? supabaseRest(`candidate_profiles?id=eq.${encodeURIComponent(candidateProfileId)}&user_id=eq.${encodeURIComponent(userId)}&select=constraints&limit=1`) : Promise.resolve([]),
  ]);
  return { workMode: "global_remote", country: profiles?.[0]?.constraints?.country ?? applications?.[0]?.target_locations?.[0], contractTypes: applications?.[0]?.contract_types ?? [] };
}

export async function agentFeed(userId: string, candidateProfileId?: string) {
  const now = encodeURIComponent(new Date().toISOString());
  const profileFilter = candidateProfileId ? `&candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}` : "";
  const boundary = candidateProfileId ? await matchingBoundaryForUser(userId, candidateProfileId) : null;
  const since = boundary ? `&updated_at=gte.${encodeURIComponent(boundary)}` : "";
  const [rows, intentCapabilities, context] = await Promise.all([
    allFeedRows(`opportunity_matches?user_id=eq.${encodeURIComponent(userId)}${profileFilter}${since}&status=neq.dismissed&select=id,combination_index,fit_label,fit_reason,score,status,created_at,updated_at,notified_at,deep_analysis,market_opportunities!inner(id,title,source,source_url,kind,buyer,posted_at,compensation,location,remote_status,summary,raw_payload,required_skills,public_signals,evidence_urls,suggested_offer,opportunity_signatures(contact_method,contact_value))&market_opportunities.expires_at=gt.${now}&order=updated_at.desc,id.asc&limit=200`),
    candidateProfileId ? intentCapabilitiesForUser(userId, candidateProfileId) : Promise.resolve([] as string[]),
    marketContextForUser(userId, candidateProfileId),
  ]);
  const seenRoles = new Set<string>();
  return (rows ?? []).filter((match: { deep_analysis?: unknown; market_opportunities?: Record<string, unknown> | Array<Record<string, unknown>> }) => {
    const opportunity = Array.isArray(match.market_opportunities) ? match.market_opportunities[0] : match.market_opportunities;
    if (!opportunity || !isRemoteOnlyOpportunity(opportunity) || !remoteLocationAllows(opportunity, context) || !permitsEmployment(opportunity, { ...context, contractTypes: ["Freelance / contract"] }) || opportunity.kind === "employment" || !(storedBuyerProblemMatches(opportunity, intentCapabilities, match.deep_analysis) || opportunityTitleSupportsIntent(String(opportunity.title ?? ""), intentCapabilities, opportunityEvidence(opportunity)))) return false;
    const normalize = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const key = opportunity.buyer ? `${normalize(opportunity.buyer)}|${normalize(opportunity.title)}` : String(opportunity.source_url ?? opportunity.id);
    if (seenRoles.has(key)) return false;
    seenRoles.add(key);
    return true;
  });
}

async function intentCapabilitiesForUser(userId: string, candidateProfileId: string) {
  const rows = await supabaseRest(`agent_onboarding?user_id=eq.${encodeURIComponent(userId)}&candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&select=intent_combination_index,intent_capabilities&limit=1`);
  const onboarding = rows?.[0];
  const explicit = Array.isArray(onboarding?.intent_capabilities) ? onboarding.intent_capabilities.filter((value: unknown): value is string => typeof value === "string" && Boolean(value.trim())) : [];
  if (explicit.length) return explicit;
  const graph = await capacityGraphForCandidate(candidateProfileId);
  const index = Number(onboarding?.intent_combination_index ?? 0);
  return graph?.combinations[index]?.elements ?? graph?.combinations[0]?.elements ?? [];
}

async function matchingBoundaryForUser(userId: string, candidateProfileId: string) {
  const [onboardingRows, authorizationRows] = await Promise.all([
    supabaseRest(`agent_onboarding?user_id=eq.${encodeURIComponent(userId)}&candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&select=updated_at&limit=1`),
    supabaseRest(`agent_authorizations?user_id=eq.${encodeURIComponent(userId)}&candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&select=updated_at&limit=1`),
  ]);
  const directionUpdatedAt = new Date(onboardingRows?.[0]?.updated_at ?? 0).getTime();
  const settingsUpdatedAt = new Date(authorizationRows?.[0]?.updated_at ?? 0).getTime();
  return new Date(Math.max(directionUpdatedAt, settingsUpdatedAt, new Date(CURRENT_MATCHING_RELEASE_AT).getTime())).toISOString();
}

export async function agentRadarStats(userId: string, candidateProfileId: string) {
  const now = new Date().toISOString();
  const scanBoundary = await matchingBoundaryForUser(userId, candidateProfileId);
  const since = `&updated_at=gte.${encodeURIComponent(scanBoundary)}`;
  const snapshotSince = `&created_at=gte.${encodeURIComponent(scanBoundary)}`;
  const [runs, matches, snapshots] = await Promise.all([
    supabaseRest("scan_runs?select=status,started_at,completed_at,query_count,raw_result_count,opportunity_count,match_count&order=started_at.desc&limit=5"),
    agentFeed(userId, candidateProfileId),
    supabaseRest(`scan_funnel_snapshots?user_id=eq.${encodeURIComponent(userId)}&candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}${snapshotSince}&select=*&order=created_at.desc&limit=1`),
  ]);
  const latest = runs?.[0] ?? null;
  const startedAt = latest?.started_at ? new Date(latest.started_at).getTime() : 0;
  const scanning = latest?.status === "running" && Date.now() - startedAt < 10 * 60_000;
  const snapshot = snapshots?.[0] ?? null;
  // Radar and list must count the exact same current, eligible records.
  const relevantMatches = matches;
  const storedMatchCount = relevantMatches.length;
  const currentStrongCount = relevantMatches.filter((row: { fit_label?: string }) => row.fit_label === "Strong fit").length;
  const channelCounts = relevantMatches.reduce((counts: { platform: number; email: number }, row: {
    fit_label?: string;
    market_opportunities?: { source_url?: string; opportunity_signatures?: { contact_method?: string } | Array<{ contact_method?: string }> } | Array<{ source_url?: string; opportunity_signatures?: { contact_method?: string } | Array<{ contact_method?: string }> }>;
  }) => {
    if (!["Strong fit", "Good fit"].includes(row.fit_label ?? "")) return counts;
    const opportunity = Array.isArray(row.market_opportunities) ? row.market_opportunities[0] : row.market_opportunities;
    const signature = Array.isArray(opportunity?.opportunity_signatures) ? opportunity.opportunity_signatures[0] : opportunity?.opportunity_signatures;
    if (signature?.contact_method === "public_email") counts.email += 1;
    else if (signature?.contact_method === "application_link" && opportunity?.source_url) counts.platform += 1;
    return counts;
  }, { platform: 0, email: 0 });
  const snapshotSignals = Number(snapshot?.market_signals_scanned ?? 0);
  const snapshotEligible = Number(snapshot?.eligible_after_hard_filters ?? 0);
  return {
    scanning,
    // A direction change creates a new scan boundary. Shared topics may have
    // historical results, but they must not make the new direction look as if
    // its own scan has already completed.
    hasScanned: Boolean(snapshot),
    marketSignalsScanned: snapshot ? snapshotSignals : 0,
    eligibleAfterHardFilters: snapshot ? snapshotEligible : 0,
    // These three counters must map exactly to expandable, current feed rows.
    // Historical funnel snapshots are still used for scanned/eligible counts only.
    capacityMatches: storedMatchCount,
    strongOpportunities: currentStrongCount,
    platformLeads: channelCounts.platform,
    emailLeads: channelCounts.email,
    hotLeads: channelCounts.platform + channelCounts.email,
    opportunityTypeBreakdown: relevantMatches.reduce((counts: Record<string, number>, row: { market_opportunities?: Record<string, unknown> | Array<Record<string, unknown>> }) => {
      const opportunity = Array.isArray(row.market_opportunities) ? row.market_opportunities[0] : row.market_opportunities;
      const kind = String(opportunity?.kind ?? "employment");
      counts[kind] = (counts[kind] ?? 0) + 1;
      return counts;
    }, {}),
    filteredOutReasons: snapshot?.filtered_out_reasons ?? { location: 0, expired: 0, duplicate: 0, low_fit: 0 },
    lastCompletedAt: snapshot?.created_at ?? null,
  };
}

export async function capacityGraphForCandidate(candidateProfileId?: string | null) {
  if (!candidateProfileId) return null;
  const [rows, scans] = await Promise.all([
    supabaseRest(`capacity_graphs?candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&is_active=eq.true&select=graph&limit=1`),
    supabaseRest(`candidate_scans?candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&select=analysis_id&order=created_at.desc&limit=1`),
  ]);
  const rawStored = rows?.[0]?.graph as CapacityGraph | undefined;
  const stored = rawStored ? sanitizeCapacityGraph(rawStored) : undefined;
  const analysisId = scans?.[0]?.analysis_id as string | undefined;
  if (!analysisId) return stored ?? null;
  const analyses = await supabaseRest(`analyses?id=eq.${encodeURIComponent(analysisId)}&select=result&limit=1`);
  const result = analyses?.[0]?.result;
  if (!result) return stored ?? null;
  const rebuilt = ensureCapacityGraph({ ...result, capacityGraph: stored ?? result.capacityGraph }).capacityGraph;
  if (!rebuilt) return stored ?? null;
  return rebuilt;
}

export async function updateMatchStatus(userId: string, matchId: string, status: "saved" | "dismissed" | "new" | "drafted") {
  return supabaseRest(`opportunity_matches?id=eq.${encodeURIComponent(matchId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });
}

export async function matchForUser(userId: string, matchId: string) {
  const rows = await supabaseRest(`opportunity_matches?id=eq.${encodeURIComponent(matchId)}&user_id=eq.${encodeURIComponent(userId)}&status=neq.dismissed&select=id,user_id,candidate_profile_id,opportunity_id,combination_index,fit_reason,fit_label,score,updated_at,deep_analysis,market_opportunities!inner(id,title,source,buyer,source_url,kind,suggested_offer,summary,required_skills,location,remote_status,authorization,public_signals,raw_payload,expires_at,opportunity_signatures(contact_method,contact_value))&market_opportunities.expires_at=gt.${encodeURIComponent(new Date().toISOString())}&limit=1`);
  const match = rows?.[0] ?? null;
  if (!match?.candidate_profile_id) return null;
  const boundary = await matchingBoundaryForUser(userId, String(match.candidate_profile_id));
  if (new Date(match.updated_at ?? 0).getTime() < new Date(boundary).getTime()) return null;
  const opportunity = Array.isArray(match.market_opportunities) ? match.market_opportunities[0] : match.market_opportunities;
  const intentCapabilities = await intentCapabilitiesForUser(userId, String(match.candidate_profile_id));
  const context = await marketContextForUser(userId, String(match.candidate_profile_id));
  if (!opportunity || !isRemoteOnlyOpportunity(opportunity) || !remoteLocationAllows(opportunity, context) || !permitsEmployment(opportunity, { ...context, contractTypes: ["Freelance / contract"] }) || opportunity.kind === "employment" || !(storedBuyerProblemMatches(opportunity, intentCapabilities, match.deep_analysis) || opportunityTitleSupportsIntent(String(opportunity.title ?? ""), intentCapabilities, opportunityEvidence(opportunity)))) return null;
  return match;
}

export async function activeAgentJobForMatch(userId: string, matchId: string, kind: AgentJobKind) {
  const rows = await supabaseRest(`agent_jobs?user_id=eq.${encodeURIComponent(userId)}&opportunity_match_id=eq.${encodeURIComponent(matchId)}&kind=eq.${encodeURIComponent(kind)}&status=in.(queued,running,awaiting_user_answer,submitted,sent)&select=*&order=created_at.desc&limit=1`);
  return rows?.[0] ?? null;
}

export async function subscriptionForUser(userId: string) {
  const admin = await isAccountAdmin(userId);
  if (!PAYWALL_ENABLED || admin) {
    // Read-only free entitlement: keep Stripe records untouched so restoring
    // the paywall does not accidentally grant a permanent paid subscription.
    const onboarding = await agentOnboardingForUser(userId);
    const selected = onboarding?.candidate_profile_id
      ? await supabaseRest(`candidate_profiles?user_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(onboarding.candidate_profile_id)}&select=id&limit=1`)
      : null;
    const profiles = selected?.length ? selected : await supabaseRest(`candidate_profiles?user_id=eq.${encodeURIComponent(userId)}&select=id&order=updated_at.desc,id.desc&limit=1`);
    const profile = profiles?.[0];
    return profile ? { id: profile.id, user_id: userId, candidate_profile_id: profile.id, status: admin ? "admin" : "free", stripe_customer_id: null } : null;
  }
  const rows = await supabaseRest(`agent_subscriptions?user_id=eq.${encodeURIComponent(userId)}&status=in.(active,trialing)&select=*&order=updated_at.desc,created_at.desc&limit=1`);
  return rows?.[0] ?? null;
}

export async function createOutreachDraft(userId: string, matchId: string, input: { recipient?: string; subject: string; body: string }) {
  const matches = await supabaseRest(`opportunity_matches?id=eq.${encodeURIComponent(matchId)}&user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`);
  if (!matches?.[0]) throw new Error("Opportunity match not found");
  const rows = await supabaseRest("outreach_drafts", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, opportunity_match_id: matchId, recipient: input.recipient, subject: input.subject, body: input.body }),
  });
  await updateMatchStatus(userId, matchId, "drafted");
  return rows?.[0];
}

export async function updateOutreachDraft(userId: string, draftId: string, input: Record<string, unknown>) {
  return supabaseRest(`outreach_drafts?id=eq.${encodeURIComponent(draftId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ ...input, updated_at: new Date().toISOString() }),
  });
}

export async function outreachDraftForUser(userId: string, draftId: string) {
  const rows = await supabaseRest(`outreach_drafts?id=eq.${encodeURIComponent(draftId)}&user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  return rows?.[0] ?? null;
}
