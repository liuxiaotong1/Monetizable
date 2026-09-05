import type { AnalysisResult, SkillCombination } from "@/lib/types";
import { canonicalUrl, isSafeExternalUrl } from "@/lib/url";

export const ROLE_MODEL_TITLES = [
  "Martin Lewis (financial journalist)", "Mellody Hobson", "Hans Rosling", "Fei-Fei Li", "Nate Silver",
  "Juliette Kayyem", "Erin Meyer", "Seth Godin", "Susan Kare", "Florence Nightingale",
  "Amal Clooney", "Barbara Corcoran", "Brené Brown", "Lilly Singh", "Reid Hoffman",
  "Aswath Damodaran", "Serena Williams", "Sal Khan", "Indra Nooyi", "Tim Ferriss",
] as const;

const roleModelThemes: Array<{ title: typeof ROLE_MODEL_TITLES[number]; terms: string[] }> = [
  { title: "Martin Lewis (financial journalist)", terms: ["finance", "financial", "content", "video", "media", "journalism", "literacy"] },
  { title: "Mellody Hobson", terms: ["finance", "investing", "business", "leadership", "strategy"] },
  { title: "Hans Rosling", terms: ["data", "analytics", "visualization", "statistics", "research", "education"] },
  { title: "Fei-Fei Li", terms: ["ai", "software", "computer", "technology", "research", "coding"] },
  { title: "Nate Silver", terms: ["sports", "analytics", "data", "statistics", "forecasting"] },
  { title: "Juliette Kayyem", terms: ["emergency", "rescue", "security", "operations", "management", "crisis"] },
  { title: "Erin Meyer", terms: ["language", "multilingual", "cross-cultural", "international", "localization", "communication"] },
  { title: "Seth Godin", terms: ["marketing", "sales", "content", "brand", "entrepreneurship"] },
  { title: "Susan Kare", terms: ["design", "creative", "graphics", "ux", "software"] },
  { title: "Florence Nightingale", terms: ["nursing", "healthcare", "medical", "operations", "data"] },
  { title: "Amal Clooney", terms: ["legal", "law", "international", "human rights", "communication"] },
  { title: "Barbara Corcoran", terms: ["real estate", "sales", "entrepreneurship", "media", "business"] },
  { title: "Brené Brown", terms: ["research", "consulting", "speaking", "leadership", "content"] },
  { title: "Lilly Singh", terms: ["social media", "creator", "video", "content", "marketing"] },
  { title: "Reid Hoffman", terms: ["saas", "startup", "software", "business development", "network"] },
  { title: "Aswath Damodaran", terms: ["finance", "financial", "valuation", "education", "research", "content"] },
  { title: "Serena Williams", terms: ["sports", "athlete", "brand", "entrepreneurship"] },
  { title: "Sal Khan", terms: ["education", "content", "video", "software", "finance"] },
  { title: "Indra Nooyi", terms: ["operations", "leadership", "international", "strategy", "business"] },
  { title: "Tim Ferriss", terms: ["consulting", "creator", "content", "entrepreneurship", "marketing"] },
];

export function assignedRoleModels(combinations: SkillCombination[]) {
  const used = new Set<string>();
  return combinations.map((combination) => {
    const text = [...combination.elements, ...combination.services.flatMap((service) => [service.name, service.description])].join(" ").toLowerCase();
    const tokens = new Set(text.match(/[a-z0-9+#-]{2,}/g) ?? []);
    const hasTerm = (term: string) => term.includes(" ") ? text.includes(term) : tokens.has(term);
    const ranked = roleModelThemes.map((candidate, order) => ({
      ...candidate, order,
      score: candidate.terms.reduce((score, term, termIndex) => score + (hasTerm(term) ? (termIndex === 0 || term.includes(" ") ? 3 : 1) : 0), 0),
    })).filter((candidate) => !used.has(candidate.title)).sort((a, b) => b.score - a.score || a.order - b.order);
    const selected = ranked[0] ?? roleModelThemes.find((candidate) => !used.has(candidate.title)) ?? roleModelThemes[0];
    used.add(selected.title);
    return selected.title;
  });
}

export function needsReportIntelligenceRepair(result: AnalysisResult) {
  const top = result.combinations.slice(0, 3);
  const roleModels = top.map((combination) => combination.careerProspect?.wikipediaTitle).filter(Boolean);
  return new Set(roleModels).size !== top.length || !result.positioning.leadWithEdge || !hasEuUsBenchmark(result.positioning) || !result.positioning.estimatedEarningRange || !result.positioning.estimatedEarningBasis || !cleanPublicUrl(result.positioning.estimatedEarningSourceUrl);
}

function hasEuUsBenchmark(positioning: AnalysisResult["positioning"]) {
  if (positioning.estimatedEarningMarket !== "EU/US") return false;
  const source = cleanPublicUrl(positioning.estimatedEarningSourceUrl);
  if (!source) return false;
  const url = new URL(source);
  if (url.hostname.endsWith(".in") || /(?:^|\.)(?:ambitionbox|naukri|foundit)\./i.test(url.hostname) || /(?:india|indian)[-/]/i.test(url.pathname)) return false;
  return /\b(?:EU|Europe|European|US|USA|United States|UK|United Kingdom)\b/i.test(positioning.estimatedEarningBasis ?? "");
}

function cleanPublicUrl(value?: string) {
  const extracted = value?.match(/https?:\/\/[^\s)\]]+/)?.[0];
  if (!extracted || !isSafeExternalUrl(extracted)) return undefined;
  try { return canonicalUrl(extracted); } catch { return undefined; }
}

export function normalizeReportIntelligence(result: AnalysisResult): AnalysisResult {
  const sourceUrl = cleanPublicUrl(result.positioning.estimatedEarningSourceUrl);
  const basis = result.positioning.estimatedEarningBasis?.trim();
  const hasCaveat = /before (?:expenses|costs|tax)|gross revenue|not (?:guaranteed|take-home)/i.test(basis ?? "");
  return {
    ...result,
    positioning: {
      ...result.positioning,
      estimatedEarningSourceUrl: sourceUrl,
      estimatedEarningBasis: basis ? `${basis}${hasCaveat ? "" : " Optimistic gross revenue before expenses and taxes; not guaranteed take-home income."}` : undefined,
    },
  };
}

export async function repairReportIntelligence(result: AnalysisResult): Promise<AnalysisResult> {
  const top = result.combinations.slice(0, 3);
  const assignments = assignedRoleModels(top);
  const prospectProperties = Object.fromEntries(assignments.map((title, index) => [`prospect${index}`, {
    type: "object", additionalProperties: false,
    required: ["name", "roleModelTitle", "wikipediaTitle", "whatTheyBuilt", "whyRelevant", "whatTheyDidDifferently", "stealThisMove"],
    properties: {
      name: { type: "string" }, roleModelTitle: { type: "string" }, wikipediaTitle: { type: "string", enum: [title] },
      whatTheyBuilt: { type: "string" }, whyRelevant: { type: "string" }, whatTheyDidDifferently: { type: "string" }, stealThisMove: { type: "string" },
    },
  }]));
  const schema = {
    type: "object", additionalProperties: false,
    required: [...assignments.map((_, index) => `prospect${index}`), "positioningSentence", "leadWithEdge", "estimatedEarningRange", "estimatedEarningBasis", "estimatedEarningSourceUrl", "estimatedEarningMarket"],
    properties: {
      ...prospectProperties,
      positioningSentence: { type: "string" }, leadWithEdge: { type: "string" }, estimatedEarningRange: { type: "string" }, estimatedEarningBasis: { type: "string" }, estimatedEarningSourceUrl: { type: "string" }, estimatedEarningMarket: { type: "string", enum: ["EU/US"] },
    },
  };
  const assignmentsText = assignments.map((title, index) => `Combination ${index + 1} (${top[index].elements.join(" x ")}): ${title}`).join("\n");
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-4.1-mini",
        tools: [{ type: "web_search", search_context_size: "medium" }],
        input: `Repair a paid Monetizable report using public web evidence. Use exactly these three distinct role-model assignments:\n${assignmentsText}\n\nFor each, write factual, concise fields tied to that combination and to the user's actual evidence. Do not repeat text across prospects, invent achievements, or claim the paths are identical. positioningSentence must be one concise sentence: who the user is + who they serve + what outcome they help create. leadWithEdge must be a short stack phrase. For the strongest combination, research an optimistic but plausible gross-revenue range with a timeframe using ONLY EU or US public creator sponsorship, consultancy, freelance, or comparable business-model benchmarks. Never use India, Asia-wide, or another lower-cost labor market as a proxy. estimatedEarningMarket must be EU/US. Always provide a numeric range and one directly relevant EU or US public source URL. State the EU/US assumptions and distinguish revenue from take-home income; never promise the user will earn it.\n\nProfile evidence: ${JSON.stringify(result.profile.rawEvidence)}\nCombinations: ${JSON.stringify(top.map((combination) => ({ elements: combination.elements, services: combination.services, evidence: combination.evidence })))}\nObserved pricing: ${JSON.stringify(result.pricing)}`,
        max_output_tokens: 4_000,
        text: { format: { type: "json_schema", name: "report_intelligence_repair", strict: true, schema } },
      }),
    });
    if (!response.ok) return result;
    const data = await response.json();
    const outputText = data.output_text ?? data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? []).find((item: { text?: string }) => item.text)?.text;
    if (!outputText) return result;
    const parsed = JSON.parse(outputText) as Record<string, unknown>;
    const repaired = result.combinations.map((combination, index) => index < top.length ? { ...combination, careerProspect: parsed[`prospect${index}`] as SkillCombination["careerProspect"] } : combination);
    return normalizeReportIntelligence({
      ...result,
      combinations: repaired,
      positioning: {
        ...result.positioning,
        sentence: String(parsed.positioningSentence),
        leadWithEdge: String(parsed.leadWithEdge),
        estimatedEarningRange: String(parsed.estimatedEarningRange),
        estimatedEarningBasis: String(parsed.estimatedEarningBasis),
        estimatedEarningSourceUrl: String(parsed.estimatedEarningSourceUrl),
        estimatedEarningMarket: "EU/US",
      },
    });
  } catch {
    return result;
  }
}

interface WikipediaPage {
  title?: string;
  description?: string;
  fullurl?: string;
  thumbnail?: { source?: string; width?: number; height?: number };
}

function isTrustedWikipediaUrl(value: string | undefined, kind: "image" | "page") {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return kind === "image" ? url.hostname === "upload.wikimedia.org" : url.hostname.endsWith(".wikipedia.org");
  } catch {
    return false;
  }
}

export async function enrichCareerProspects(combinations: SkillCombination[]) {
  const titles = [...new Set(combinations.map((combination) => combination.careerProspect.wikipediaTitle).filter(Boolean))];
  if (!titles.length) return combinations;
  try {
    const params = new URLSearchParams({
      action: "query", prop: "pageimages|info|description", inprop: "url", piprop: "thumbnail", pithumbsize: "512",
      redirects: "1", format: "json", origin: "*", titles: titles.join("|"),
    });
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
          headers: { accept: "application/json", "user-agent": "Monetizable/1.0 (https://thecoreme.com)" },
          signal: AbortSignal.timeout(8_000),
        });
        if (response.ok) break;
      } catch {
        response = undefined;
      }
    }
    if (!response?.ok) return combinations;
    const data = await response.json() as { query?: { pages?: Record<string, WikipediaPage> } };
    const pages = Object.values(data.query?.pages ?? {});
    return combinations.map((combination) => {
      const expected = combination.careerProspect.wikipediaTitle.toLowerCase();
      const page = pages.find((item) => item.title?.toLowerCase() === expected);
      if (!page?.thumbnail?.source || !page.fullurl || !isTrustedWikipediaUrl(page.thumbnail.source, "image") || !isTrustedWikipediaUrl(page.fullurl, "page")) return combination;
      return {
        ...combination,
        careerProspect: {
          ...combination.careerProspect,
          name: page.title ?? combination.careerProspect.name,
          roleModelTitle: page.description ?? combination.careerProspect.roleModelTitle,
          imageUrl: page.thumbnail.source,
          profileUrl: page.fullurl,
        },
      };
    });
  } catch {
    return combinations;
  }
}
