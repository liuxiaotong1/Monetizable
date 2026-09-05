import { createHash } from "node:crypto";
import type { AnalysisResult } from "@/lib/types";

export const CANDIDATE_CONSENT_VERSION = "candidate-profile-v2-2026-08-25";

function unique(values: Array<string | undefined>, limit = 20) {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const clean = value?.trim();
    if (!clean || seen.has(clean.toLowerCase()) || seen.size >= limit) return [];
    seen.add(clean.toLowerCase());
    return [clean];
  });
}

export function buildCandidateProfile(result: AnalysisResult) {
  const topSkills = unique([
    ...result.combinations.flatMap((combination) => combination.elements),
    ...result.skillGraph.domainExpertise,
    ...result.skillGraph.commercialSkills,
    ...result.skillGraph.hardSkills,
    ...result.skillGraph.languages,
    ...result.skillGraph.tools,
  ], 8);
  const adjacentRoles = unique([
    result.positioning.serviceTitle,
    ...result.combinations.flatMap((combination) => combination.services.map((service) => service.name)),
    ...result.combinations.map((combination) => combination.careerProspect.roleModelTitle),
  ], 12);
  const destinationMarkets = unique([
    ...result.skillGraph.industries,
    ...result.skillGraph.geographicContext,
    result.context.country,
    ...result.opportunities.map((opportunity) => opportunity.location),
    result.positioning.targetClient,
  ], 16);
  const identityBasis = JSON.stringify({
    name: result.profile.name?.trim().toLowerCase(),
    headline: result.profile.headline?.trim().toLowerCase(),
    roles: result.profile.roles.map(({ title, company }) => [title?.trim().toLowerCase(), company?.trim().toLowerCase()]),
    education: result.profile.education.map((item) => item.trim().toLowerCase()),
    topSkills: [...topSkills].sort((a, b) => a.localeCompare(b)),
  });

  return {
    profileFingerprint: createHash("sha256").update(identityBasis).digest("hex"),
    displayName: result.profile.name,
    headline: result.profile.headline,
    profileLocation: result.profile.location,
    sourceTypes: result.profile.sources,
    topSkills,
    languages: unique(result.skillGraph.languages, 12),
    constraints: {
      country: result.context.country,
      city: result.context.city,
      workMode: result.context.workMode,
      exclusions: result.context.exclusions,
      locationDependencies: unique(result.combinations.flatMap((combination) => combination.services.map((service) => service.location_dependency)), 3),
    },
    skillCombinations: result.combinations.slice(0, 5).map((combination) => ({
      elements: combination.elements,
      demandLevel: combination.demandLevel,
      noveltyReason: combination.noveltyReason,
      services: combination.services.map((service) => service.name),
    })),
    adjacentRoles,
    destinationMarkets,
    potential: {
      strongestPath: result.combinations[0]?.elements,
      demandLevels: result.combinations.map((combination) => combination.demandLevel),
      speedToMonetize: unique(result.combinations.flatMap((combination) => combination.services.map((service) => service.speed_to_monetize)), 3),
      estimatedEarningRange: result.positioning.estimatedEarningRange,
      weakProfile: result.weakProfile,
    },
  };
}
