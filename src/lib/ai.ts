import { aiAnalysisSchema } from "@/lib/schemas";
import type { NormalizedProfile, UserContext } from "@/lib/types";
import { ROLE_MODEL_TITLES } from "@/lib/role-model";
import { localeNames, type Locale } from "@/lib/i18n";

const skillGraphProperties = ["industries", "roles", "hardSkills", "commercialSkills", "tools", "languages", "education", "geographicContext", "crossCulturalExperience", "domainExpertise", "creativeAbilities", "salesAbilities", "operationalAbilities", "certifications", "strengths", "interests"];
const OPENAI_ATTEMPT_TIMEOUT_MS = 50_000;
const OPENAI_RETRY_TIMEOUT_MS = 30_000;

const schema = {
  type: "object", additionalProperties: false,
  required: ["skillGraph", "combinations", "positioning", "weakProfile"],
  properties: {
    skillGraph: {
      type: "object", additionalProperties: false,
      required: [...skillGraphProperties, "yearsExperience"],
      properties: Object.fromEntries([
        ...skillGraphProperties.map((key) => [key, { type: "array", items: { type: "string" } }]),
        ["yearsExperience", { type: ["number", "null"] }],
      ]),
    },
    combinations: {
      type: "array", minItems: 3, maxItems: 5,
      items: { type: "object", additionalProperties: false, required: ["elements", "evidence", "differentiation", "alreadyPerformedTogether", "noveltyReason", "careerProspect", "demandLevel", "services"], properties: {
        elements: { type: "array", minItems: 2, maxItems: 4, items: { type: "string", maxLength: 48 } },
        evidence: { type: "array", minItems: 1, items: { type: "string", maxLength: 180 } },
        differentiation: { type: "string" },
        alreadyPerformedTogether: { type: "boolean" },
        noveltyReason: { type: "string" },
        careerProspect: { type: "object", additionalProperties: false, required: ["name", "roleModelTitle", "wikipediaTitle", "whatTheyBuilt", "whyRelevant", "whatTheyDidDifferently", "stealThisMove"], properties: {
          name: { type: "string" }, roleModelTitle: { type: "string" }, wikipediaTitle: { type: "string", enum: [...ROLE_MODEL_TITLES] }, whatTheyBuilt: { type: "string" }, whyRelevant: { type: "string" },
          whatTheyDidDifferently: { type: "string" }, stealThisMove: { type: "string" },
        } },
        demandLevel: { type: "string", enum: ["Low", "Medium", "High"] },
        services: { type: "array", minItems: 1, maxItems: 2, items: { type: "object", additionalProperties: false, required: ["name", "description", "projectStructure", "searchQueries", "location_dependency", "speed_to_monetize"], properties: {
          name: { type: "string" }, description: { type: "string" }, projectStructure: { type: "string" },
          searchQueries: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } },
          location_dependency: { type: "string", enum: ["low", "medium", "high"] },
          speed_to_monetize: { type: "string", enum: ["Fast", "Moderate", "Slower"] },
        } } },
      } },
    },
    positioning: { type: "object", additionalProperties: false, required: ["sentence", "leadWithEdge", "serviceTitle", "targetClient", "outreachAngle", "estimatedEarningRange", "estimatedEarningBasis", "estimatedEarningSourceUrl", "estimatedEarningMarket"], properties: {
      sentence: { type: "string" }, leadWithEdge: { type: "string" }, serviceTitle: { type: "string" }, targetClient: { type: "string" }, outreachAngle: { type: "string" },
      estimatedEarningRange: { type: "string" }, estimatedEarningBasis: { type: "string" }, estimatedEarningSourceUrl: { type: "string" }, estimatedEarningMarket: { type: "string", enum: ["EU/US"] },
    } },
    weakProfile: { type: ["object", "null"], additionalProperties: false, required: ["message", "strongestAsset", "missingCapability", "closestPath"], properties: {
      message: { type: "string" }, strongestAsset: { type: "string" }, missingCapability: { type: "string" }, closestPath: { type: "string" },
    } },
  },
};

export function prioritizeBlindSpotCombinations<T extends { alreadyPerformedTogether: boolean }>(combinations: T[]) {
  return combinations
    .map((combination, originalIndex) => ({ combination, originalIndex }))
    .sort((a, b) => Number(a.combination.alreadyPerformedTogether) - Number(b.combination.alreadyPerformedTogether) || a.originalIndex - b.originalIndex)
    .map(({ combination }) => combination);
}

type ResponsesPayload = {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
};

export function parseStructuredResponse(data: ResponsesPayload) {
  const parts = data.output?.flatMap((item) => item.content ?? []).map((item) => item.text).filter((text): text is string => Boolean(text)) ?? [];
  const candidates = [data.output_text, parts.at(-1), parts.join(""), ...parts].filter((text, index, all): text is string => Boolean(text) && all.indexOf(text) === index);
  let parseError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      parseError = error;
    }
  }
  if (parseError) throw parseError;
  throw new Error("AI analysis returned no structured result");
}

function isRetryableAnalysisError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return error instanceof SyntaxError
    || error instanceof DOMException
    || /returned no structured result|did not produce two evidence-backed blind-spot combinations|AI analysis failed \((?:408|409|429|5\d\d)\)/i.test(message);
}

export async function analyzeProfile(profile: NormalizedProfile, context: UserContext, locale: Locale = "en") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not configured");
  const prompt = `You are Monetizable's evidence-led commercial analyst. Analyze the normalized professional profile below, then propose 3-5 differentiated combinations of 2-4 demonstrated skills. Every element must be supported by rawEvidence; never invent missing capability. Never treat liked, reposted, or third-party social content as the user's own capability, work, or achievement.

The first two ranked combinations MUST be genuine blind spots: the profile proves each component skill separately, but does not show the user already performing or selling those skills together in the same role, project, service, or achievement. Do not merely rename or restate an existing job. For example, if the profile already shows work as a financial content creator or finance presenter, Finance x Content, Finance x Video, and Finance x Presenting are existing work, not blind spots, and must not appear in Rank 1 or Rank 2. Cross a proven domain, language, tool, commercial ability, or delivery capability with a different proven asset that the person has not previously combined commercially. Surprise must come from recombination of evidence, never from inventing a capability.

AI may be proposed only when the profile proves a relevant AI capability or when a concrete service can credibly use AI as a delivery multiplier without pretending the user is an AI specialist. Never force AI into a combination. Rank combinations according to buyer usefulness and observed market evidence, even when a non-AI combination ranks first.

Evidence is not limited to formal employment. Inspect hobbies, interests, extracurricular activities, volunteer work, side projects, competitions, and training stated in rawEvidence. Treat one of these as a demonstrated skill only when the profile includes credible proof such as a named certificate, proficiency level, competitive rank, sustained practice, portfolio, published work, audience, measurable result, or completed project. A casual interest with no proof is not a skill and must never be promoted into a combination. When a proven non-work asset complements demonstrated marketing, advertising, audience-building, communication, sales, or creative skills, actively consider a specific creator-led, media, productized-service, or entrepreneurship path for Rank 1 or Rank 2. Prefer this path when it is a genuine new recombination, has credible buyer or audience demand, and is more differentiated than simply recommending the user's current job. Make the offer concrete (niche, audience, format, and buyer or revenue model); never output generic advice such as "become a creator" or "start a business."

Populate strengths only with repeated, evidence-backed ways the person performs well. Populate interests only with commercially relevant interests supported by a named activity, credential, sustained practice, project, audience, result, or competition. Leave either array empty when the profile does not prove it.

Set alreadyPerformedTogether to true whenever the raw evidence shows the elements were already used together, even under synonymous job wording. Set it to false only when the elements are individually evidenced but their joint commercial use is not. noveltyReason must state which separate evidence supports the components and why their combination is new. At least the first two returned combinations must have alreadyPerformedTogether=false. Existing-work combinations may only appear at Rank 3 or later when useful. For a blind-spot combination, differentiation should use this constructive framing rather than absence language: "You already demonstrate strength across all 3 areas. We're going to combine and position them as one marketable offer."

For every combination, use web search to select one concrete, real public role model whose documented career meaningfully overlaps the stack. Choose wikipediaTitle only from this verified portrait-bearing list: ${ROLE_MODEL_TITLES.join(", ")}. Every combination MUST use a different person; never repeat a wikipediaTitle or role-model name within one analysis. Use the person's actual name and a factual role title. Base whatTheyBuilt and whatTheyDidDifferently only on verifiable public facts, without invented employers, metrics, or achievements. whyRelevant must compare the role model with evidence actually present in this user's profile, while acknowledging that the paths are not identical. stealThisMove should give two concrete sentences connecting the similarity to a move the user can borrow, followed by one concise encouraging sentence. Do not promise outcomes. If no perfect match exists, choose the closest unused role model in the list and state the limitation honestly.

Each combination element must be a concise buyer-recognizable label of 1-5 words, never a sentence, parenthetical explanation, achievement, or list of channels. Put detail in evidence and differentiation instead. Frame credible strengths constructively so the user can see the commercial potential without exaggerating demand or promising income. Prioritize portable, remote-friendly, low-friction services that can be monetized quickly. For each service assign location_dependency (low/medium/high) and speed_to_monetize (Fast/Moderate/Slower), considering demand strength, portability, regulatory friction, proof required, competition, and pricing. Content, localization, research, design, coding, consulting, sales ops, and AI automation are normally low location dependency. Nursing, legal/tax, real estate, local photography, licensed, regulated, jurisdiction-specific, and in-person work are high. For each combination produce 1-2 services a buyer could purchase today and several public-web search queries. For positioning, sentence must be one concise sentence only: who the user is + who they serve + what outcome they help create. leadWithEdge must be a compact skill-stack phrase such as "Trilingual market development + digital content across China and Europe". targetClient must name a concrete buyer type or industry, and outreachAngle must be a short first-person message the user can copy and send directly, not advice about what the message should say.

Also research an optimistic but plausible estimated earning potential for the strongest recommended path. estimatedEarningRange must always be a numeric gross-revenue range with a timeframe, preferably annual, never "not enough data". Use ONLY EU or US creator sponsorship benchmarks, consultancy or freelance rate benchmarks, business revenue benchmarks, or a documented comparable entrepreneur model when ordinary listings understate the upside. Never use India, Asia-wide, or other lower-cost labor-market salary benchmarks as a proxy for EU/US earning potential. estimatedEarningMarket must be exactly "EU/US". estimatedEarningBasis must identify the EU or US commercial assumptions required to reach the range and distinguish revenue from take-home income. estimatedEarningSourceUrl must link to one directly relevant EU or US public benchmark source found through web search. This is scenario modeling, not an income promise; do not copy a celebrity's earnings as if the user will earn the same.

Avoid generic careers, motivational claims, and income promises. Use Low/Medium/High as an initial demand hypothesis only; live search will correct it. If direct monetization evidence is genuinely weak, include weakProfile and name the closest adjacent capability.

Write all user-facing prose in ${localeNames[locale]}. Keep searchQueries in English so live market search behavior is unchanged. Preserve schema enum values exactly as specified in English, including Low/Medium/High, low/medium/high, Fast/Moderate/Slower, and EU/US. Keep proper names and source URLs unchanged.\n\nUser context: ${JSON.stringify(context)}\n\nNormalized profile:\n${JSON.stringify(profile)}`;
  const body = {
    model: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-4.1-mini",
    input: prompt,
    tools: [{ type: "web_search", search_context_size: "medium" }],
    max_output_tokens: 10_000,
    text: { format: { type: "json_schema", name: "monetizable_analysis", strict: true, schema } },
  };
  const request = {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  } satisfies RequestInit;

  async function runAttempt(timeoutMs: number) {
    const response = await fetch("https://api.openai.com/v1/responses", { ...request, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`AI analysis failed (${response.status})`);
    const parsed = parseStructuredResponse(await response.json());
    if (parsed && typeof parsed === "object" && "weakProfile" in parsed && parsed.weakProfile === null) delete parsed.weakProfile;
    const result = aiAnalysisSchema.parse(parsed);
    result.combinations = prioritizeBlindSpotCombinations(result.combinations);
    if (result.combinations.slice(0, 2).some((combination) => combination.alreadyPerformedTogether)) {
      throw new Error("AI analysis did not produce two evidence-backed blind-spot combinations");
    }
    return result;
  }

  try {
    return await runAttempt(OPENAI_ATTEMPT_TIMEOUT_MS);
  } catch (error) {
    if (!isRetryableAnalysisError(error)) throw error;
    console.warn("Retrying incomplete AI analysis", { reason: error instanceof Error ? error.name : "unknown" });
    return runAttempt(OPENAI_RETRY_TIMEOUT_MS);
  }
}
