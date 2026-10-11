import { createHash } from "node:crypto";
import { canonicalUrl } from "@/lib/url";
import { config } from "@/lib/config";
import { evaluateOpportunity, searchRawMarket, type RawResult } from "@/lib/search";
import { cosineSimilarity, embedTexts } from "@/lib/opportunity-agent/embeddings";
import { canAutoExecuteOpportunity, opportunityTitleSupportsIntent } from "@/lib/opportunity-execution-guard";
import { enrichDirectOutreachContact, resolveOpportunityDestination } from "@/lib/opportunity-agent/destinations";
import { renewGmailWatches } from "@/lib/opportunity-agent/gmail-events";
import { screenOpportunityMatches } from "@/lib/opportunity-agent/screening";
import { buildCapacitySignature, buildOpportunitySignature } from "@/lib/opportunity-agent/signatures";
import { decideExecutionChannel } from "@/lib/opportunity-agent/channel-router";
import { cachedOpportunityMatches, capacitySignatureRow, createScanRun, dailyAgentActionStats, finishScanRun, getActiveAgentProfiles, linkMarketTopicOpportunity, linkMarketTopicProfile, markMarketTopicScanned, opportunitiesForMarketTopic, opportunityFingerprint, opportunitySignatureRows, saveScanFunnelSnapshot, upsertCapacitySignature, upsertMarketOpportunities, upsertMarketTopic, upsertOpportunityMatch, upsertOpportunitySignatures, type ActiveAgentProfile } from "@/lib/opportunity-agent/storage";
import type { OpportunityKind } from "@/lib/types";
import type { Opportunity } from "@/lib/types";
import type { SkillCombination } from "@/lib/types";
import { validCustomIntent } from "@/lib/agent-intents";
import { generateBuyerProblems, buyerProblemTopics, buyerProblemSupported, buyerProblemRecoveryQueries } from "@/lib/opportunity-agent/buyer-problems";
import type { BuyerProblem } from "@/lib/types";
import { recoverBuyerMatches } from "@/lib/opportunity-agent/semantic-recovery";

const GLOBAL_QUERY_LIMIT = Number(process.env.MAX_AGENT_SEARCH_QUERIES ?? 72);

export async function buildAgentQueries(profile: ActiveAgentProfile) {
  return buyerProblemTopics(profile, await generateBuyerProblems(profile)).map((topic) => topic.query);
}

function rawKey(result: RawResult) { try { return canonicalUrl(result.url); } catch { return result.url; } }
function rawFromStored(value: Opportunity): RawResult { return { title: value.title, url: value.url, content: value.listingEvidence ?? value.summary, publishedDate: value.postedDate, source: value.source, buyer: value.buyer, employmentType: value.employmentType, eligibleLocations: value.eligibleLocations }; }
function parseVector(value: unknown): number[] | undefined {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === "string") return value.replace(/^\[|\]$/g, "").split(",").map(Number).filter(Number.isFinite);
  return undefined;
}

function estimatedCost(inputTokens: number, outputTokens: number) {
  const inputPerMillion = Number(process.env.AGENT_INPUT_COST_PER_MILLION_USD ?? 0.15);
  const outputPerMillion = Number(process.env.AGENT_OUTPUT_COST_PER_MILLION_USD ?? 0.6);
  return (inputTokens * inputPerMillion + outputTokens * outputPerMillion) / 1_000_000;
}

function errorCategories(errors: string[]) {
  return errors.reduce<Record<string, number>>((counts, message) => {
    const category = /search|provider|fetch/i.test(message) ? "market_search" : /gmail|oauth/i.test(message) ? "gmail" : /openai|model|embedding/i.test(message) ? "model" : "other";
    counts[category] = (counts[category] ?? 0) + 1;
    return counts;
  }, {});
}

function analysisCacheKey(graphVersion: number, fingerprint: string, context: unknown, intentCapabilities: string[]) {
  const intent = [...intentCapabilities].map((value) => value.trim().toLocaleLowerCase()).sort();
  return createHash("sha256").update(`${graphVersion}:${fingerprint}:${JSON.stringify(context)}:${JSON.stringify(intent)}:screen-v7-buyer-problems`).digest("hex");
}

async function mapWithConcurrency<T, R>(values: T[], limit: number, mapper: (value: T) => Promise<R>) {
  const output = new Array<R>(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(values[index]);
    }
  }));
  return output;
}

export function matchingCombinations(profile: ActiveAgentProfile): SkillCombination[] {
  const hasSelectedStack = Boolean(profile.intentCapabilities?.length);
  const custom = hasSelectedStack
    ? validCustomIntent(profile.graph, profile.intentCapabilities ?? []) ?? []
    : [];
  if (hasSelectedStack && !custom.length) return [];
  if (!custom.length) {
    const selected = typeof profile.intentCombinationIndex === "number" && profile.intentCombinationIndex >= 0
      ? profile.graph.combinations[profile.intentCombinationIndex]
      : undefined;
    // A subscribed Agent scans the direction the user approved. Mixing every
    // other graph combination into the same run created attractive-looking but
    // irrelevant matches and spent execution capacity on the wrong roles.
    return selected ? [selected] : profile.graph.combinations;
  }
  const template: SkillCombination = profile.graph.combinations[0] ?? {
    elements: [], evidence: [], differentiation: "", alreadyPerformedTogether: false,
    noveltyReason: "", demandLevel: "Low",
    careerProspect: { name: "", roleModelTitle: "", wikipediaTitle: "", whatTheyBuilt: "", whyRelevant: "", whatTheyDidDifferently: "", stealThisMove: "" },
    services: [{ name: "Selected skill stack", description: "User-selected capabilities", projectStructure: "Confirm scope with the buyer", searchQueries: [], location_dependency: "low", speed_to_monetize: "Moderate" }],
  };
  const evidence = profile.graph.nodes
    .filter((node) => custom.some((label) => label.toLocaleLowerCase() === node.label.toLocaleLowerCase()))
    .flatMap((node) => node.evidence)
    .slice(0, 6);
  return [{
    ...template,
    elements: custom,
    evidence,
    differentiation: `A focused combination of ${custom.join(", ")}.`,
    noveltyReason: "Selected by the user from evidenced capabilities in their Capacity Graph.",
    services: template.services.map((service) => ({
      ...service,
      name: `${custom.join(" × ")} independent service`,
      description: `A focused independent service using ${custom.join(", ")}.`,
      searchQueries: [`${custom.join(" ")} freelance consulting project vendor buyer`],
    })),
  }];
}

export async function runOpportunityScan(options: { force?: boolean; userId?: string } = {}) {
  const startedAt = Date.now();
  const scanId = await createScanRun();
  const errors: string[] = [];
  let rawResultCount = 0; let opportunityCount = 0; let matchCount = 0; let lightModelCalls = 0; let deepModelCalls = 0;
  let inputTokens = 0; let outputTokens = 0; let searchCalls = 0; let cacheHits = 0;
  try {
    let profiles = (await getActiveAgentProfiles()).filter((profile) => !options.userId || profile.userId === options.userId);
    const actionStats = new Map(await Promise.all(profiles.map(async (profile) => [profile.userId, await dailyAgentActionStats(profile.userId, profile.candidateProfileId)] as const)));
    const needsSupply = new Set(profiles.filter((profile) => {
      const stats = actionStats.get(profile.userId);
      return (stats?.completedToday ?? 0) + (stats?.pending ?? 0) < config.agentDailyOutreachTarget;
    }).map((profile) => profile.candidateProfileId));
    // Build buyer outcomes before retrieving any listing. Each outcome has its
    // own query themes and source-evidence criteria; never revert to skill/jobs.
    const buyerPlans = new Map<string,BuyerProblem[]>();
    for (const profile of profiles) {
      profile.context = { ...profile.context, workMode:"global_remote", targetRoles:[], targetLocations:[], contractTypes:["Freelance / contract","Consulting","Fractional","Productized service","Buyer demand"] };
      try { buyerPlans.set(profile.candidateProfileId,await generateBuyerProblems(profile)); }
      catch(error) { errors.push(`Buyer planning: ${error instanceof Error ? error.message : String(error)}`); }
    }
    if (profiles.length && !buyerPlans.size) throw new Error(errors.join("; "));
    profiles=profiles.filter(profile=>buyerPlans.has(profile.candidateProfileId));
    const topicGroups = profiles.flatMap(profile=>buyerProblemTopics(profile,buyerPlans.get(profile.candidateProfileId)!).map(topic=>({topic,profiles:[{profile,combinationIndex:topic.combinationIndex}]}))).slice(0,GLOBAL_QUERY_LIMIT);
    const rawByProfile = new Map<string, Map<string, RawResult>>();
    const scannedByProfile = new Map<string, number>();
    const topicUrls = new Map<string, Set<string>>();

    await mapWithConcurrency(topicGroups, 4, async (group) => {
      const topicRow = await upsertMarketTopic(group.topic);
      if (!topicRow) return;
      await Promise.all(group.profiles.map(({ profile, combinationIndex }) => linkMarketTopicProfile(topicRow.id, profile.candidateProfileId, combinationIndex)));
      const due = options.force || group.profiles.some(({ profile }) => needsSupply.has(profile.candidateProfileId)) || !topicRow.next_scan_at || new Date(topicRow.next_scan_at).getTime() <= Date.now();
      let results: RawResult[] = [];
      if (due) {
        const search = await searchRawMarket(group.topic.query, group.profiles[0].profile.context); searchCalls += 1;
        results = search.results; rawResultCount += results.length;
        errors.push(...search.errors.map((error) => `${group.topic.label.slice(0, 80)}: ${error}`));
        const {profile,combinationIndex}=group.profiles[0];
        const problem=buyerPlans.get(profile.candidateProfileId)![combinationIndex];
        const base=matchingCombinations(profile)[0];
        const recoveryCombo=base ? [{...base,elements:problem.capabilities}] : [];
        const hasMatch=()=>results.some(raw=>evaluateOpportunity(raw,recoveryCombo,profile.context,[problem]).opportunity);
        // Raw volume is not success: retry when all fetched briefs were rejected.
        if (!hasMatch()) {
          for (const broadQuery of buyerProblemRecoveryQueries(problem)) {
            const fallback = await searchRawMarket(broadQuery, profile.context); searchCalls += 1;
            results.push(...fallback.results); rawResultCount += fallback.results.length;
            errors.push(...fallback.errors.map((error) => `${group.topic.label.slice(0, 80)} fallback: ${error}`));
            if (hasMatch()) break;
          }
        }
        await markMarketTopicScanned(topicRow.id);
      } else {
        const cached = await opportunitiesForMarketTopic(topicRow.id); cacheHits += 1;
        results = (cached ?? []).flatMap((row: { market_opportunities?: { raw_payload?: Opportunity } | Array<{ raw_payload?: Opportunity }> }) => {
          const opportunity = Array.isArray(row.market_opportunities) ? row.market_opportunities[0]?.raw_payload : row.market_opportunities?.raw_payload;
          return opportunity ? [rawFromStored(opportunity)] : [];
        });
      }
      const urls = topicUrls.get(topicRow.id) ?? new Set<string>(); results.forEach((result) => urls.add(rawKey(result))); topicUrls.set(topicRow.id, urls);
      group.profiles.forEach(({ profile }) => {
        const bucket = rawByProfile.get(profile.candidateProfileId) ?? new Map<string, RawResult>();
        scannedByProfile.set(profile.candidateProfileId, (scannedByProfile.get(profile.candidateProfileId) ?? 0) + results.length);
        results.forEach((result) => bucket.set(rawKey(result), result)); rawByProfile.set(profile.candidateProfileId, bucket);
      });
    });

    const capacityEmbeddings = new Map<string, number[]>();
    const staleCapacity: Array<{ profile: ActiveAgentProfile; signature: ReturnType<typeof buildCapacitySignature> }> = [];
    for (const profile of profiles) {
      const existing = await capacitySignatureRow(profile.candidateProfileId);
      const signature = buildCapacitySignature(profile);
      const vector = parseVector(existing?.embedding);
      if (existing && Number(existing.graph_version) === profile.graph.version && existing.signature_text === signature.signatureText && vector?.length) { capacityEmbeddings.set(profile.candidateProfileId, vector); cacheHits += 1; }
      else staleCapacity.push({ profile, signature });
    }
    if (staleCapacity.length) {
      const batch = await embedTexts(staleCapacity.map((item) => item.signature.signatureText));
      if (batch) {
        inputTokens += batch.usage.inputTokens;
        await Promise.all(staleCapacity.map(({ profile, signature }, index) => { signature.embedding = batch.embeddings[index]; capacityEmbeddings.set(profile.candidateProfileId, batch.embeddings[index]); return upsertCapacitySignature(profile.candidateProfileId, signature, batch.model); }));
      }
    }

    const rankedByProfile = new Map<string, Opportunity[]>();
    const funnelByProfile = new Map<string, { scanned: number; eligible: number; duplicates: number; location: number; expired: number; lowFit: number }>();
    const unique = new Map<string, Opportunity>();
    for (const profile of profiles) {
      const rawUnique = [...(rawByProfile.get(profile.candidateProfileId)?.values() ?? [])];
      const problems=buyerPlans.get(profile.candidateProfileId)!;
      const base=matchingCombinations(profile)[0];
      if (!base) continue;
      const combinations=problems.map(problem=>({...base,elements:problem.capabilities,services:[{name:problem.outcome,description:problem.problem,projectStructure:problem.outcome,searchQueries:problem.searchThemes,location_dependency:"low" as const,speed_to_monetize:"Moderate" as const}]}));
      const evaluated = rawUnique.map((raw) => evaluateOpportunity(raw, combinations, profile.context,problems));
      evaluated.forEach(({opportunity})=>{if(opportunity){const problem=problems[opportunity.combinationIndex];opportunity.buyerProblemMatch={version:1,selectedStack:profile.intentCapabilities??base.elements,problem};opportunity.suggestedOffer=problem.outcome;opportunity.fitReason=`Buyer problem: ${problem.problem} Offer: ${problem.outcome}. Uses ${problem.capabilities.join(", ")} from your stack; other selected skills are additional strengths, not asserted listing requirements.`;}});
      const eligibleRanked:Opportunity[] = [];
      {
        // Every published match needs source-grounded review, not only recovery.
        const candidates=rawUnique.filter((_,i)=>evaluated[i].eligibleAfterHardFilters)
          .sort((a,b)=>Number(Boolean(evaluated[rawUnique.indexOf(b)].opportunity))-Number(Boolean(evaluated[rawUnique.indexOf(a)].opportunity)));
        try {
          const recovered=await recoverBuyerMatches(profile,problems,candidates);
          for(const {raw,problem} of recovered) {
            const result=evaluateOpportunity(raw,[{...base,elements:problem.capabilities}],profile.context,[problem]);
            if(!result.opportunity) continue;
            result.opportunity.buyerProblemMatch={version:2,selectedStack:profile.intentCapabilities??base.elements,problem};
            result.opportunity.suggestedOffer=problem.outcome;
            eligibleRanked.push(result.opportunity);
            const index=rawUnique.indexOf(raw);if(index>=0)evaluated[index]=result;
          }
          console.info('[opportunity-scan] buyer recovery',{candidateProfileId:profile.candidateProfileId,reviewed:Math.min(80,candidates.length),recovered:recovered.length});
        } catch(error) {errors.push(`Buyer recovery: ${error instanceof Error?error.message:String(error)}`);}
      }
      // Resolve and verify a public professional contact before execution.
      // Search-result URLs are discovery evidence, never email destinations.
      const contactCandidates = eligibleRanked
        .sort((left, right) => right.score - left.score)
        .slice(0, Math.max(200, config.agentLightCandidateLimit, config.agentDailyOutreachTarget * 4));
      const ranked = await mapWithConcurrency(contactCandidates, 6, async (opportunity) =>
        enrichDirectOutreachContact(await resolveOpportunityDestination(opportunity)),
      );
      const scannedWithDuplicates = scannedByProfile.get(profile.candidateProfileId) ?? rawUnique.length;
      funnelByProfile.set(profile.candidateProfileId, {
        scanned: rawUnique.length,
        eligible: evaluated.filter((value) => value.eligibleAfterHardFilters).length,
        duplicates: Math.max(0, scannedWithDuplicates - rawUnique.length),
        location: evaluated.filter((value) => value.filterReason === "location").length,
        expired: evaluated.filter((value) => value.filterReason === "expired").length,
        lowFit: evaluated.filter((value) => value.filterReason === "low_fit").length,
      });
      ranked.forEach((opportunity) => unique.set(opportunityFingerprint(opportunity), opportunity)); rankedByProfile.set(profile.candidateProfileId, ranked);
    }
    const marketRows = await upsertMarketOpportunities([...unique.values()]); opportunityCount = marketRows?.length ?? 0;
    const rowByFingerprint = new Map<string, { id: string; fingerprint: string; source_url?: string }>((marketRows ?? []).map((row: { id: string; fingerprint: string; source_url?: string }) => [row.fingerprint, row]));
    for (const [topicId, urls] of topicUrls) for (const opportunity of unique.values()) if (urls.has(opportunity.url) || (opportunity.evidenceUrls ?? []).some((url) => urls.has(url))) { const row = rowByFingerprint.get(opportunityFingerprint(opportunity)); if (row) await linkMarketTopicOpportunity(topicId, row.id); }

    const storedSignatures = await opportunitySignatureRows([...rowByFingerprint.values()].map((row) => row.id));
    const storedById = new Map<string, number[]>((storedSignatures ?? []).flatMap((row: { opportunity_id: string; embedding?: unknown }) => { const value = parseVector(row.embedding); return value ? [[row.opportunity_id, value] as [string, number[]]] : []; }));
    const signatureByFingerprint = new Map<string, ReturnType<typeof buildOpportunitySignature>>();
    const missing: Array<{ fingerprint: string; rowId: string; signature: ReturnType<typeof buildOpportunitySignature> }> = [];
    const signaturesToStore: Array<{ opportunityId: string; signature: ReturnType<typeof buildOpportunitySignature>; embeddingModel?: string }> = [];
    for (const [fingerprint, opportunity] of unique) {
      const row = rowByFingerprint.get(fingerprint); if (!row) continue;
      const signature = buildOpportunitySignature(opportunity); signatureByFingerprint.set(fingerprint, signature);
      const storedVector = storedById.get(row.id);
      if (!storedVector) missing.push({ fingerprint, rowId: row.id, signature });
      else { signature.embedding = storedVector; cacheHits += 1; }
      signaturesToStore.push({ opportunityId: row.id, signature });
    }
    if (missing.length) {
      const batch = await embedTexts(missing.map((item) => item.signature.signatureText));
      if (batch) { inputTokens += batch.usage.inputTokens; missing.forEach((item, index) => { item.signature.embedding = batch.embeddings[index]; storedById.set(item.rowId, batch.embeddings[index]); }); signaturesToStore.forEach((item) => { item.embeddingModel = batch.model; }); }
    }
    // Contact discovery can turn a previously stored application link into a
    // verified public email. Persist that change on every scan while reusing
    // the existing embedding so executable leads never remain stale.
    await upsertOpportunitySignatures(signaturesToStore);

    for (const profile of profiles) {
      const capacityVector = capacityEmbeddings.get(profile.candidateProfileId);
      const ranked = (rankedByProfile.get(profile.candidateProfileId) ?? []).map((opportunity) => {
        const row = rowByFingerprint.get(opportunityFingerprint(opportunity)); const similarity = row ? cosineSimilarity(capacityVector, storedById.get(row.id)) : 0;
        const score = Math.max(0, Math.min(96, opportunity.score + (similarity >= 0.2 ? Math.round(similarity * 10) : similarity > 0 && similarity < 0.05 ? -10 : 0)));
        return { ...opportunity, score, fitLabel: score >= 78 ? "Strong fit" as const : score >= 62 ? "Good fit" as const : "Moderate fit" as const };
      }).sort((a, b) => b.score - a.score).slice(0, Math.max(200, config.agentLightCandidateLimit, config.agentDailyOutreachTarget * 3));
      const opportunityIds = ranked.flatMap((opportunity) => { const row = rowByFingerprint.get(opportunityFingerprint(opportunity)); return row ? [row.id] : []; });
      const cachedRows = await cachedOpportunityMatches(profile.candidateProfileId, opportunityIds);
      const cacheByOpportunity = new Map<string, { key?: string; fitLabel?: Opportunity["fitLabel"]; fitReason?: string; score?: number; analysis?: Record<string, unknown> }>((cachedRows ?? []).map((row: { opportunity_id: string; analysis_cache_key?: string; fit_label?: Opportunity["fitLabel"]; fit_reason?: string; score?: number; deep_analysis?: Record<string, unknown> }) => [row.opportunity_id, { key: row.analysis_cache_key, fitLabel: row.fit_label, fitReason: row.fit_reason, score: row.score, analysis: row.deep_analysis }]));
      const cachedMatches: Array<{ opportunity: Opportunity; deepAnalysis?: Record<string, unknown> }> = [];
      const uncached: Opportunity[] = [];
      ranked.forEach((opportunity) => { const fingerprint = opportunityFingerprint(opportunity); const row = rowByFingerprint.get(fingerprint); const cached = row ? cacheByOpportunity.get(row.id) : undefined; const cacheKey = analysisCacheKey(profile.graph.version, fingerprint, profile.context, profile.intentCapabilities ?? []); if (cached?.key === cacheKey && cached.fitLabel && cached.fitReason && typeof cached.score === "number") { cachedMatches.push({ opportunity: { ...opportunity, fitLabel: cached.fitLabel, fitReason: cached.fitReason, score: cached.score }, deepAnalysis: cached.analysis }); cacheHits += 1; } else uncached.push(opportunity); });
      const screeningGraph = { ...profile.graph, combinations: matchingCombinations(profile) };
      const screening = await screenOpportunityMatches(screeningGraph, uncached);
      screening.matches.unshift(...cachedMatches);
      // The model is a precision layer, not the sole gatekeeper. A valid,
      // evidence-backed candidate must not disappear just because a light
      // screening batch omitted it. Deterministic Good/Strong candidates are
      // restored here, then still pass the execution guard (intent, geography,
      // language, direct destination and authorization) before any action.
      const screenedUrls = new Set(screening.matches.map(({ opportunity }) => opportunity.url));
      for (const opportunity of ranked) {
        if (opportunity.score >= 62 && !screenedUrls.has(opportunity.url)) {
          screening.matches.push({ opportunity });
          screenedUrls.add(opportunity.url);
        }
      }
      screening.matches.sort((left, right) => right.opportunity.score - left.opportunity.score);
      lightModelCalls += screening.lightModelCalls; deepModelCalls += screening.deepModelCalls; inputTokens += screening.usage.inputTokens; outputTokens += screening.usage.outputTokens;
      let strongOpportunities = 0;
      let hotLeads = 0;
      for (const match of screening.matches) {
        const selectedStack = screeningGraph.combinations[match.opportunity.combinationIndex]?.elements ?? profile.intentCapabilities ?? [];
        const buyerMatch=match.opportunity.buyerProblemMatch;
        if (buyerMatch ? !buyerProblemSupported(buyerMatch.problem,match.opportunity.title,match.opportunity.listingEvidence??match.opportunity.summary) : !opportunityTitleSupportsIntent(match.opportunity.title, selectedStack, match.opportunity.listingEvidence ?? match.opportunity.summary)) continue;
        if (buyerMatch) {match.deepAnalysis={...match.deepAnalysis,buyerProblemMatch:buyerMatch};match.opportunity.fitReason=`Buyer problem: ${buyerMatch.problem.problem} Deliverable: ${buyerMatch.problem.outcome}. Relevant capabilities: ${buyerMatch.problem.capabilities.join(", ")}. Additional stack skills are not claimed as buyer requirements.`;}
        // Semantic relevance is not proof of every professional prerequisite.
        if(buyerMatch?.version===2){match.opportunity.score=Math.min(77,match.opportunity.score);match.opportunity.fitLabel="Good fit";}
        const fingerprint = opportunityFingerprint(match.opportunity); const row = rowByFingerprint.get(fingerprint); if (!row) continue;
        const nextCacheKey = analysisCacheKey(profile.graph.version, fingerprint, profile.context, profile.intentCapabilities ?? []);
        const previousCacheKey = cacheByOpportunity.get(row.id)?.key;
        const persistedCombinationIndex = typeof profile.intentCombinationIndex === "number" ? profile.intentCombinationIndex : match.opportunity.combinationIndex;
        const persistedOpportunity = { ...match.opportunity, combinationIndex: persistedCombinationIndex };
        const savedMatch = await upsertOpportunityMatch(profile, row.id, persistedOpportunity, match.deepAnalysis, nextCacheKey, Boolean(previousCacheKey && previousCacheKey !== nextCacheKey)); matchCount += 1;
        const signature = signatureByFingerprint.get(fingerprint);
        const channel = decideExecutionChannel(match.opportunity);
        if (match.opportunity.fitLabel === "Strong fit") strongOpportunities += 1;
        const executionCombinations = matchingCombinations(profile);
        const actionableFit = match.opportunity.fitLabel === "Strong fit"
          || (match.opportunity.fitLabel === "Good fit" && match.opportunity.score >= 62);
        const routedMethod = channel.channel === "email_outreach" ? "public_email" : "skip";
        const isExecutableAction = actionableFit
          && channel.channel !== "skip"
          && Boolean(signature)
          && canAutoExecuteOpportunity({ opportunity: match.opportunity, method: routedMethod, combinations: executionCombinations, context: profile.context });
        if (isExecutableAction) hotLeads += 1;
        void savedMatch;
      }
      const funnel = funnelByProfile.get(profile.candidateProfileId) ?? { scanned: 0, eligible: 0, duplicates: 0, location: 0, expired: 0, lowFit: 0 };
      const typeBreakdown = (rankedByProfile.get(profile.candidateProfileId) ?? []).reduce<Partial<Record<OpportunityKind, number>>>((counts, opportunity) => {
        const kind = opportunity.kind ?? "consulting";
        counts[kind] = (counts[kind] ?? 0) + 1;
        return counts;
      }, {});
      await saveScanFunnelSnapshot(scanId, profile, {
        marketSignalsScanned: funnel.scanned,
        eligibleAfterHardFilters: funnel.eligible,
        capacityMatches: (rankedByProfile.get(profile.candidateProfileId) ?? []).length,
        strongOpportunities,
        hotLeads,
        opportunityTypeBreakdown: typeBreakdown,
        filteredOutReasons: { location: funnel.location, expired: funnel.expired, duplicate: funnel.duplicates, low_fit: funnel.lowFit },
      });
    }

    const watches = options.userId ? null : await renewGmailWatches();
    const execution = { sent: 0, submitted: 0, failed: 0, browserbaseSessions: 0 };
    const notificationsSent = 0;
    const status = errors.length ? "partial" : "complete";
    await finishScanRun(scanId, { status, query_count: topicGroups.length, raw_result_count: rawResultCount, opportunity_count: opportunityCount, match_count: matchCount, light_model_calls: lightModelCalls, deep_model_calls: deepModelCalls, input_tokens: inputTokens, output_tokens: outputTokens, estimated_model_cost_usd: estimatedCost(inputTokens, outputTokens), browserbase_session_count: execution.browserbaseSessions, search_calls: searchCalls, cache_hits: cacheHits, execution_success_count: execution.sent + execution.submitted, execution_failure_count: execution.failed, error_categories: errorCategories(errors), duration_ms: Date.now() - startedAt, errors: errors.slice(0, 50) });
    return { scanId, status, profiles: profiles.length, topics: topicGroups.length, searchCalls, cacheHits, rawResultCount, opportunityCount, matchCount, notificationsSent, watches, execution, lightModelCalls, deepModelCalls, inputTokens, outputTokens, errors: errors.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishScanRun(scanId, { status: "failed", query_count: 0, raw_result_count: rawResultCount, opportunity_count: opportunityCount, match_count: matchCount, light_model_calls: lightModelCalls, deep_model_calls: deepModelCalls, input_tokens: inputTokens, output_tokens: outputTokens, estimated_model_cost_usd: estimatedCost(inputTokens, outputTokens), search_calls: searchCalls, cache_hits: cacheHits, error_categories: errorCategories([...errors, message]), duration_ms: Date.now() - startedAt, errors: [...errors, message].slice(0, 50) });
    throw error;
  }
}
