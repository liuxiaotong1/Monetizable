import { createHash } from "node:crypto";
import type { ActiveAgentProfile } from "@/lib/opportunity-agent/storage";
import type { MarketTopic } from "@/lib/opportunity-agent/types";
import type { OpportunityKind } from "@/lib/types";
import { validCustomIntent } from "@/lib/agent-intents";

const KINDS: OpportunityKind[] = ["freelance_contract", "consulting", "fractional", "productized_service", "latent_buyer_demand"];
const STOPWORDS = new Set(["and", "the", "for", "with", "management", "experience", "proficiency"]);

function normalizedTerms(values: string[]) {
  return [...new Set(values.flatMap((value) => value.toLowerCase().replace(/[^\p{L}\p{N}+#.]+/gu, " ").split(/\s+/)).filter((term) => term.length > 1 && !STOPWORDS.has(term)))].sort();
}

export function marketTopicKey(input: { elements: string[]; region?: string; workMode?: string; variant?: string }) {
  const terms = normalizedTerms(input.elements).slice(0, 12);
  const region = input.workMode === "global_remote" ? "global" : (input.region?.trim().toLowerCase() || "global");
  return createHash("sha256").update(`${terms.join("|")}:${region}:${input.variant ?? "core"}`).digest("hex");
}

export function buildMarketTopics(profile: ActiveAgentProfile): MarketTopic[] {
  const selectedCustomIntent = profile.intentCombinationIndex === -1
    ? [...new Set((profile.intentCapabilities ?? []).map((value) => value.trim()).filter(Boolean))].slice(0, 3)
    : [];
  const customIntent = selectedCustomIntent.length ? validCustomIntent(profile.graph, selectedCustomIntent) ?? [] : [];
  const targetRoles = [...new Set((profile.context.targetRoles ?? []).map((value) => value.trim()).filter(Boolean))].slice(0, 4);
  const targetFocus = targetRoles.join(" ");
  const withTargetFocus = (query: string) => `${targetFocus} ${query}`.replace(/\s+/g, " ").trim();
  const combinations = profile.graph.combinations
    .map((combination, combinationIndex) => ({ combination, combinationIndex }))
    .sort((left, right) => {
      const intent = profile.intentCombinationIndex;
      if (intent === undefined) return left.combinationIndex - right.combinationIndex;
      if (left.combinationIndex === intent) return -1;
      if (right.combinationIndex === intent) return 1;
      return left.combinationIndex - right.combinationIndex;
    })
    .filter(({ combinationIndex }) => profile.intentCombinationIndex === undefined || combinationIndex === profile.intentCombinationIndex)
    .slice(0, profile.intentCombinationIndex === undefined ? 5 : 1);

  const topics = combinations.flatMap(({ combination, combinationIndex }, rankedIndex) => {
    const elements = combination.elements.slice(0, 4);
    const region = profile.context.workMode === "global_remote" ? "global" : profile.context.country;
    const languageNodes = profile.graph.nodes.filter((node) => node.type === "language").map((node) => node.label);
    const service = combination.services[0]?.name;
    const base = { label: elements.join(" × "), opportunityKinds: KINDS, regions: region ? [region] : ["global"], languages: languageNodes.slice(0, 6), combinationIndex };
    const pairQueries = elements.flatMap((left, index) => elements.slice(index + 1).map((right, pairIndex) => ({
      id: `pair-${index}-${pairIndex}`,
      query: withTargetFocus(`${left} ${right} consultant project vendor needed`),
    })));
    const focusedQueries = elements.map((element, index) => ({
      id: `capability-${index}`,
      query: withTargetFocus(`${element} freelance consulting contract request for proposal`),
    }));
    const variants = [
      { id: "direct", query: withTargetFocus(`${elements.join(" ")} ${service ?? ""} consultant project needed`) },
      { id: "independent", query: withTargetFocus(`${elements.join(" ")} freelance consultant fractional advisor`) },
      { id: "projects", query: withTargetFocus(`${elements.join(" ")} contract project request for proposal`) },
      { id: "services", query: withTargetFocus(`${elements.join(" ")} implementation partner agency vendor needed`) },
      { id: "buyer-signal", query: withTargetFocus(`${elements.join(" ")} company expansion launch partnership support`) },
      ...(service ? [
        { id: "service-buyer", query: withTargetFocus(`${service} consultant vendor needed`) },
        { id: "service-project", query: withTargetFocus(`${service} freelance project contract`) },
      ] : []),
      ...pairQueries,
      ...focusedQueries,
    ];
    if (rankedIndex < 2) variants.push(
      { id: "buyer", query: withTargetFocus(`${elements.join(" ")} request for proposal consultant agency vendor`) },
      { id: "decision-maker", query: withTargetFocus(`${elements.join(" ")} company needs implementation partner contact`) },
    );
    return variants.map((variant) => ({
      ...base,
      key: marketTopicKey({ elements: [...elements, ...targetRoles], region, workMode: profile.context.workMode, variant: variant.id }),
      query: variant.query,
    }));
  });

  if (customIntent.length) {
    const region = profile.context.workMode === "global_remote" ? "global" : profile.context.country;
    const languageNodes = profile.graph.nodes.filter((node) => node.type === "language").map((node) => node.label);
    const pairs = customIntent.flatMap((left, index) => customIntent.slice(index + 1).map((right, pairIndex) => ({
      variant: `custom-pair-${index}-${pairIndex}`,
      query: withTargetFocus(`${left} ${right} freelance consulting project buyer`),
    })));
    const variants = [
      { variant: "custom", query: withTargetFocus(`${customIntent.join(" ")} freelance contract consultant needed`) },
      { variant: "custom-demand", query: withTargetFocus(`${customIntent.join(" ")} company needs specialist vendor`) },
      { variant: "custom-project", query: withTargetFocus(`${customIntent.join(" ")} freelance project consultant needed`) },
      { variant: "custom-rfp", query: withTargetFocus(`${customIntent.join(" ")} request for proposal agency partner`) },
      { variant: "custom-agency", query: withTargetFocus(`${customIntent.join(" ")} agency freelance specialist contact`) },
      { variant: "custom-services", query: withTargetFocus(`${customIntent.join(" ")} professional services company contact`) },
      { variant: "custom-vendor", query: withTargetFocus(`${customIntent.join(" ")} vendor partner contractor contact`) },
      { variant: "custom-buyer", query: withTargetFocus(`${customIntent.join(" ")} business expansion project support contact`) },
      ...pairs,
      ...customIntent.map((capability, index) => ({ variant: `custom-capability-${index}`, query: withTargetFocus(`${capability} agency freelance consultant contact`) })),
    ];
    topics.unshift(...variants.map((variant) => ({
      key: marketTopicKey({ elements: [...customIntent, ...targetRoles], region, workMode: profile.context.workMode, variant: variant.variant }),
      label: customIntent.join(" × "),
      query: variant.query,
      opportunityKinds: KINDS,
      regions: region ? [region] : ["global"],
      languages: languageNodes.slice(0, 6),
      combinationIndex: -1,
    })));
  }

  return topics.slice(0, Number(process.env.MAX_AGENT_PROFILE_QUERIES ?? 32));
}

export function aggregateMarketTopics(profiles: ActiveAgentProfile[]) {
  const topics = new Map<string, { topic: MarketTopic; profiles: Array<{ profile: ActiveAgentProfile; combinationIndex: number }> }>();
  profiles.forEach((profile) => buildMarketTopics(profile).forEach((topic) => {
    const current = topics.get(topic.key) ?? { topic, profiles: [] };
    current.profiles.push({ profile, combinationIndex: topic.combinationIndex });
    topics.set(topic.key, current);
  }));
  return [...topics.values()];
}
