import type { AnalysisResult, Preview } from "@/lib/types";
import { buildCapacityGraph } from "@/lib/capacity-graph";

function conciseSkillLabel(value: string) {
  const clean = value.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  return clean.split(" ").slice(0, 6).join(" ").slice(0, 48).trim();
}

function hasComparablePricing(range?: string) {
  return Boolean(range && /(?:\/\s*(?:hr|hour|day|month|year)|per\s+(?:hour|day|month|year|project)|project|annual|salary)/i.test(range));
}

function conciseProfileName(value?: string) {
  if (!value) return undefined;
  const quoted = value.match(/[`“"]([^`”"]{2,80})[`”"]/i)?.[1];
  return (quoted ?? value).replace(/^(?:profile matched exactly|name)\s*:\s*/i, "").split(/\s+[|–—]\s+/)[0].trim().slice(0, 80);
}

function constructiveCombinationCopy(value: string) {
  if (/no evidence of (?:their|the) combined application|demonstrates? expertise in each of these areas separately/i.test(value)) {
    return "You already demonstrate strength across all 3 areas. We're going to combine and position them as one marketable offer.";
  }
  return value;
}

export function toPreview(result: AnalysisResult): Preview {
  const strongest = result.combinations[0];
  const pricing = result.pricing[0];
  return {
    analysisId: result.id,
    profileName: conciseProfileName(result.profile.name),
    strongestCombination: strongest.elements.map(conciseSkillLabel),
    combinationEvidence: strongest.evidence.slice(0, 3),
    servicePreview: {
      name: strongest.services[0].name,
      description: strongest.services[0].description,
      location_dependency: strongest.services[0].location_dependency,
      speed_to_monetize: strongest.services[0].speed_to_monetize,
    },
    demandLevel: strongest.demandLevel,
    pricing: pricing?.sampleSize >= 2 && hasComparablePricing(pricing.range) ? pricing : undefined,
    liveOpportunityCount: result.opportunities.length,
    opportunityTeasers: result.opportunities.slice(0, 10).map((opportunity) => ({
      source: opportunity.source,
      fitLabel: opportunity.fitLabel,
      kind: opportunity.kind,
      locationDependency: opportunity.location_dependency,
      speedToMonetize: opportunity.speed_to_monetize,
    })),
    explanation: constructiveCombinationCopy(strongest.differentiation),
    weakProfile: result.weakProfile,
    searchStatus: result.searchStatus,
    expiresAt: result.expiresAt,
    capacityGraph: result.capacityGraph ?? buildCapacityGraph(result),
    topCombinations: result.combinations.slice(0, 3).map((combination) => ({
      elements: combination.elements.map(conciseSkillLabel),
      evidence: combination.evidence.slice(0, 3),
      demandLevel: combination.demandLevel,
      noveltyReason: combination.noveltyReason,
    })),
    freeAnalysis: {
      combinations: result.combinations.slice(0, 3).map((combination) => ({
        ...combination,
        elements: combination.elements.map(conciseSkillLabel),
        services: combination.services.map((service) => ({
          name: service.name,
          description: service.description,
          projectStructure: service.projectStructure,
          location_dependency: service.location_dependency,
          speed_to_monetize: service.speed_to_monetize,
        })),
      })),
      pricing: result.pricing,
      positioning: result.positioning,
    },
  };
}
