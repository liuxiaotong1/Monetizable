import { z } from "zod";

const stringArray = z.array(z.string()).default([]);

export const contextSchema = z.object({
  country: z.string().trim().max(80).optional(),
  city: z.string().trim().max(100).optional(),
  workMode: z.enum(["local", "regional_remote", "global_remote"]),
  exclusions: z.string().trim().max(500).optional(),
});

export const preservedEvidenceSchema = z.array(z.object({
  source: z.enum(["linkedin_public", "cv", "manual"]),
  text: z.string().max(50_000),
  url: z.string().url().optional(),
  retrievalSource: z.enum(["linkedin_public_page", "public_search", "uploaded_file", "manual_input"]).optional(),
})).max(20).default([]);

export const aiAnalysisSchema = z.object({
  skillGraph: z.object({
    industries: stringArray,
    roles: stringArray,
    yearsExperience: z.number().nullable(),
    hardSkills: stringArray,
    commercialSkills: stringArray,
    tools: stringArray,
    languages: stringArray,
    education: stringArray,
    geographicContext: stringArray,
    crossCulturalExperience: stringArray,
    domainExpertise: stringArray,
    creativeAbilities: stringArray,
    salesAbilities: stringArray,
    operationalAbilities: stringArray,
    certifications: stringArray,
    strengths: stringArray,
    interests: stringArray,
  }),
  combinations: z.array(z.object({
    elements: z.array(z.string()).min(2).max(4),
    evidence: z.array(z.string()).min(1),
    differentiation: z.string(),
    alreadyPerformedTogether: z.boolean(),
    noveltyReason: z.string(),
    careerProspect: z.object({
      name: z.string(),
      roleModelTitle: z.string(),
      wikipediaTitle: z.string(),
      imageUrl: z.string().url().optional(),
      profileUrl: z.string().url().optional(),
      whatTheyBuilt: z.string(),
      whyRelevant: z.string(),
      whatTheyDidDifferently: z.string(),
      stealThisMove: z.string(),
    }),
    demandLevel: z.enum(["Low", "Medium", "High"]),
    services: z.array(z.object({
      name: z.string(),
      description: z.string(),
      projectStructure: z.string(),
      searchQueries: z.array(z.string()).min(2).max(6),
      location_dependency: z.enum(["low", "medium", "high"]),
      speed_to_monetize: z.enum(["Fast", "Moderate", "Slower"]),
    })).min(1).max(2),
  })).min(3).max(5),
  positioning: z.object({
    sentence: z.string(),
    leadWithEdge: z.string(),
    serviceTitle: z.string(),
    targetClient: z.string(),
    outreachAngle: z.string(),
    estimatedEarningRange: z.string(),
    estimatedEarningBasis: z.string(),
    estimatedEarningSourceUrl: z.string().url(),
    estimatedEarningMarket: z.literal("EU/US"),
  }),
  weakProfile: z.object({
    message: z.string(),
    strongestAsset: z.string(),
    missingCapability: z.string(),
    closestPath: z.string(),
  }).optional(),
});
