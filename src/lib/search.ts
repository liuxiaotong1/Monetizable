import { config } from "@/lib/config";
import { canonicalUrl, isSafeExternalUrl } from "@/lib/url";
import { normalizeOpportunityText } from "@/lib/opportunity-text";
import { opportunityTitleSupportsIntent } from "@/lib/opportunity-execution-guard";
import type { LocationDependency, MonetizationSpeed, Opportunity, OpportunityKind, SkillCombination, UserContext } from "@/lib/types";

export interface RawResult { title: string; url: string; content: string; publishedDate?: string; source?: string; buyer?: string; estimatedTotal?: number }

const nearbyMarkets: Record<string, string[]> = {
  "nice|france": ["côte d’azur", "côte d'azur", "cote d'azur", "alpes-maritimes", "antibes", "cannes", "sophia antipolis", "monaco"],
};

const countryRegions: Record<string, string[]> = {
  france: ["france", "europe", "eu", "emea"],
  "united kingdom": ["united kingdom", "uk", "europe", "emea"],
  canada: ["canada", "north america"],
  australia: ["australia", "apac"],
};

export function geographyTerms(context: UserContext) {
  const country = context.country?.toLowerCase().trim() ?? "";
  const city = context.city?.toLowerCase().trim();
  if (context.workMode === "global_remote") return [];
  if (context.workMode === "regional_remote") return [...new Set((countryRegions[country] ?? [country]).filter(Boolean))];
  return [...new Set([city, country, ...(nearbyMarkets[`${city}|${country}`] ?? [])].filter(Boolean) as string[])];
}

function selectedOpportunityKinds(contractTypes: string[] = []) {
  const kinds = new Set<OpportunityKind>();
  for (const value of contractTypes) {
    const normalized = value.toLowerCase();
    if (normalized.includes("freelance") || normalized.includes("contract") || normalized.includes("part-time") || normalized.includes("part time")) kinds.add("freelance_contract");
    if (normalized.includes("consulting")) kinds.add("consulting");
    if (normalized.includes("fractional")) kinds.add("fractional");
    if (normalized.includes("productized")) kinds.add("productized_service");
    if (normalized.includes("buyer demand")) kinds.add("latent_buyer_demand");
  }
  return kinds;
}

function authorizationAllows(text: string, context: UserContext) {
  const stated = context.workAuthorization?.toLowerCase() ?? "";
  const country = context.country?.toLowerCase() ?? "";
  const allows = (region: "us" | "uk" | "canada" | "eu") => {
    if (region === "us") return /\bus\b|u\.s\.|united states/.test(stated) || /united states|usa|u\.s\./.test(country);
    if (region === "uk") return /\buk\b|united kingdom|britain/.test(stated) || /united kingdom|\buk\b/.test(country);
    if (region === "canada") return /canada/.test(stated) || /canada/.test(country);
    return /\beu\b|eea|european/.test(stated) || /france|germany|italy|spain|netherlands|belgium|ireland|portugal|austria|sweden|denmark|finland|norway|poland|czech|greece|romania|croatia|slovakia|slovenia|hungary|bulgaria|estonia|latvia|lithuania|luxembourg|malta|cyprus|iceland|liechtenstein/.test(country);
  };
  if (/(?:us|u\.s\.|united states)[- ]only|(?:must be )?authorized to work in (?:the )?(?:us|u\.s\.|united states)/.test(text) && !allows("us")) return false;
  if (/(?:uk|united kingdom)[- ]only|(?:must be )?authorized to work in (?:the )?(?:uk|united kingdom)/.test(text) && !allows("uk")) return false;
  if (/canada[- ]only|(?:must be )?authorized to work in canada/.test(text) && !allows("canada")) return false;
  if (/(?:eu|eea|european union)[- ]only|(?:must be )?authorized to work in (?:the )?(?:eu|eea|european union)/.test(text) && !allows("eu")) return false;
  return true;
}

export function buildMarketQueries(combinations: SkillCombination[], context: UserContext) {
  const base = combinations.flatMap((combo) => combo.services.flatMap((service) => service.searchQueries));
  const targetFocus = (context.targetRoles ?? []).slice(0, 4).join(" ");
  const terms = geographyTerms(context);
  return base.map((query, index) => {
    const focusedQuery = `${targetFocus} ${query}`.trim();
    if (context.workMode === "global_remote") return `${focusedQuery} (freelance OR contract OR project OR consultant) (remote OR worldwide)`;
    if (context.workMode === "regional_remote") return `${focusedQuery} (freelance OR contract OR project OR consultant) remote${terms.length ? ` (${terms.join(" OR ")})` : ""}`;
    const focus = index % 2 === 0 ? context.city : terms.slice(2).join(" OR ") || `${context.city} nearby`;
    return `${focusedQuery} (freelance OR contract OR project OR consultant) (${focus}) (${context.country})`;
  }).slice(0, config.maxSearchQueries);
}

function inferLocationDependency(text: string, fallback: LocationDependency): LocationDependency {
  if (/licensed|licen[cs]e required|jurisdiction|on-site|onsite|in-person|local clients?|real estate|nurs(?:e|ing)|legal|tax law|court|property photography/.test(text)) return "high";
  if (/hybrid|regional|specific time zone|occasional travel/.test(text)) return "medium";
  if (/remote|worldwide|anywhere|distributed/.test(text)) return "low";
  return fallback;
}

function speed_to_monetize(text: string, matches: number, compensationFound: boolean, location_dependency: LocationDependency, serviceSpeed: MonetizationSpeed) {
  let points = matches * 2 + (compensationFound ? 2 : 0) + (/freelance|contract|project|immediate|short-term/.test(text) ? 2 : 0);
  points += serviceSpeed === "Fast" ? 3 : serviceSpeed === "Moderate" ? 1 : 0;
  points -= location_dependency === "high" ? 4 : location_dependency === "medium" ? 2 : 0;
  points -= /portfolio required|case stud(?:y|ies)|certification required|degree required|security clearance/.test(text) ? 2 : 0;
  points -= /generic (?:writer|designer|developer)|entry.level/.test(text) ? 1 : 0;
  return points >= 7 ? "Fast" as const : points >= 3 ? "Moderate" as const : "Slower" as const;
}

export function recommendationNeedsLocation(combinations: SkillCombination[]) {
  const service = combinations[0]?.services.find((item) => item.location_dependency === "high");
  if (!service) return null;
  return { serviceName: service.name, cityRequired: /in-person|on-site|onsite|local|photograph|real estate/i.test(`${service.name} ${service.description}`) };
}

export interface MarketSearchProvider {
  search(query: string): Promise<RawResult[]>;
}

class TavilyProvider implements MarketSearchProvider {
  async search(query: string) {
    const response = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_key: process.env.SEARCH_API_KEY, query, search_depth: "advanced", max_results: 12, include_answer: false }) });
    if (!response.ok) throw new Error(`Tavily search failed (${response.status})`);
    const data = await response.json();
    return (data.results ?? []).map((r: { title: string; url: string; content?: string; published_date?: string }) => ({ title: r.title, url: r.url, content: r.content ?? "", publishedDate: r.published_date }));
  }
}

class BraveProvider implements MarketSearchProvider {
  async search(query: string) {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20&freshness=p${config.freshnessDays}d`, { headers: { accept: "application/json", "x-subscription-token": process.env.SEARCH_API_KEY ?? "" } });
    if (!response.ok) throw new Error(`Brave search failed (${response.status})`);
    const data = await response.json();
    return (data.web?.results ?? []).map((r: { title: string; url: string; description?: string; age?: string; profile?: { long_name?: string } }) => ({ title: r.title, url: r.url, content: r.description ?? "", source: r.profile?.long_name, publishedDate: r.age }));
  }
}

class JoobleProvider implements MarketSearchProvider {
  async search(query: string) {
    const response = await fetch(`https://jooble.org/api/${process.env.JOOBLE_API_KEY}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keywords: query, page: 1, ResultOnPage: 30 }),
    });
    if (!response.ok) throw new Error(`Jooble search failed (${response.status})`);
    const data = await response.json();
    return (data.jobs ?? []).map((job: { title?: string; link?: string; snippet?: string; updated?: string; company?: string; location?: string; salary?: string; source?: string }, index: number) => ({
      title: job.title ?? "Untitled opportunity",
      url: job.link ?? "",
      content: [job.company, job.location, job.salary, job.snippet].filter(Boolean).join(" · "),
      publishedDate: job.updated,
      source: job.source ?? "Jooble",
      buyer: job.company,
      estimatedTotal: index === 0 && Number.isFinite(Number(data.totalCount)) ? Number(data.totalCount) : undefined,
    }));
  }
}

function simpleApiQuery(query: string) {
  return query.replace(/\([^)]*\)/g, " ").replace(/\b(?:OR|AND|freelance|contract|project|consultant|remote|worldwide)\b/gi, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 7).join(" ");
}

class RemoteFirstProvider implements MarketSearchProvider {
  async search(query: string) {
    const response = await fetch(`https://remotefirstjobs.com/api/search-jobs?query=${encodeURIComponent(simpleApiQuery(query))}&page=0`, { headers: { "user-agent": "Monetizable/1.0 (https://thecoreme.com)" }, signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Remote First Jobs search failed (${response.status})`);
    const data = await response.json();
    return (data.jobs ?? []).slice(0, 40).map((job: { title?: string; url?: string; description?: string; published_at?: string; company_name?: string; locations?: string[]; salary_min?: number; salary_max?: number }) => ({
      title: job.title ?? "Untitled remote opportunity", url: job.url ?? "",
      content: [job.company_name, "Remote", job.locations?.join(", "), job.salary_min && job.salary_max ? `$${job.salary_min}-$${job.salary_max}` : undefined, job.description].filter(Boolean).join(" · "),
      publishedDate: job.published_at, source: "Remote First Jobs",
      buyer: job.company_name,
    }));
  }
}

let arbeitnowJobs: Promise<Array<{ title?: string; url?: string; description?: string; created_at?: number; company_name?: string; location?: string; remote?: boolean; tags?: string[]; job_types?: string[] }>> | undefined;

class ArbeitnowProvider implements MarketSearchProvider {
  async search(query: string) {
    arbeitnowJobs ??= fetch("https://www.arbeitnow.com/api/job-board-api", { headers: { "user-agent": "Monetizable/1.0 (https://thecoreme.com)" }, signal: AbortSignal.timeout(8_000) }).then(async (response) => {
      if (!response.ok) throw new Error(`Arbeitnow search failed (${response.status})`);
      return (await response.json()).data ?? [];
    });
    const terms = tokenSet([simpleApiQuery(query)]);
    return (await arbeitnowJobs).filter((job) => job.remote && [...terms].some((term) => `${job.title} ${job.description} ${job.tags?.join(" ")}`.toLowerCase().includes(term))).slice(0, 40).map((job) => ({
      title: job.title ?? "Untitled remote opportunity", url: job.url ?? "",
      content: [job.company_name, job.location, "Remote", job.job_types?.join(", "), job.tags?.join(", "), job.description].filter(Boolean).join(" · "),
      publishedDate: job.created_at ? new Date(job.created_at * 1000).toISOString() : undefined, source: "Arbeitnow",
      buyer: job.company_name,
    }));
  }
}

let jobicyJobs: Promise<Array<{ jobTitle?: string; url?: string; jobDescription?: string; pubDate?: string; companyName?: string; jobGeo?: string; jobType?: string; jobIndustry?: string[]; annualSalaryMin?: number; annualSalaryMax?: number }>> | undefined;

class JobicyProvider implements MarketSearchProvider {
  async search(query: string) {
    jobicyJobs ??= fetch("https://jobicy.com/api/v2/remote-jobs?count=200", {
      headers: { "user-agent": "Monetizable/1.0 (https://getmonetizable.com)" },
      signal: AbortSignal.timeout(10_000),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Jobicy search failed (${response.status})`);
      return (await response.json()).jobs ?? [];
    });
    const terms = tokenSet([simpleApiQuery(query)]);
    return (await jobicyJobs)
      .filter((job) => [...terms].some((term) => `${job.jobTitle} ${job.jobDescription} ${job.jobIndustry?.join(" ")}`.toLowerCase().includes(term)))
      .slice(0, 80)
      .map((job) => ({
        title: job.jobTitle ?? "Untitled remote opportunity",
        url: job.url ?? "",
        content: [job.companyName, job.jobGeo, "Remote", job.jobType, job.jobIndustry?.join(", "), job.annualSalaryMin && job.annualSalaryMax ? `$${job.annualSalaryMin}-$${job.annualSalaryMax}` : undefined, job.jobDescription].filter(Boolean).join(" · "),
        publishedDate: job.pubDate,
        source: "Jobicy",
        buyer: job.companyName,
      }));
  }
}

let remotiveJobs: Promise<Array<{ title?: string; url?: string; description?: string; publication_date?: string; company_name?: string; candidate_required_location?: string; job_type?: string; category?: string; salary?: string }>> | undefined;

class RemotiveProvider implements MarketSearchProvider {
  async search(query: string) {
    remotiveJobs ??= fetch("https://remotive.com/api/remote-jobs?limit=500", {
      headers: { "user-agent": "Monetizable/1.0 (https://getmonetizable.com)" },
      signal: AbortSignal.timeout(10_000),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Remotive search failed (${response.status})`);
      return (await response.json()).jobs ?? [];
    });
    const terms = tokenSet([simpleApiQuery(query)]);
    return (await remotiveJobs)
      .filter((job) => [...terms].some((term) => `${job.title} ${job.description} ${job.category}`.toLowerCase().includes(term)))
      .slice(0, 120)
      .map((job) => ({
        title: job.title ?? "Untitled remote opportunity",
        url: job.url ?? "",
        content: [job.company_name, job.candidate_required_location, "Remote", job.job_type, job.category, job.salary, job.description].filter(Boolean).join(" · "),
        publishedDate: job.publication_date,
        source: "Remotive",
        buyer: job.company_name,
      }));
  }
}

class AdzunaProvider implements MarketSearchProvider {
  constructor(private country: string) {}
  async search(query: string) {
    const response = await fetch(`https://api.adzuna.com/v1/api/jobs/${this.country}/search/1?app_id=${encodeURIComponent(process.env.ADZUNA_APP_ID ?? "")}&app_key=${encodeURIComponent(process.env.ADZUNA_APP_KEY ?? "")}&results_per_page=30&what=${encodeURIComponent(simpleApiQuery(query))}&where=remote&content-type=application/json`);
    if (!response.ok) throw new Error(`Adzuna search failed (${response.status})`);
    const data = await response.json();
    return (data.results ?? []).map((job: { title?: string; redirect_url?: string; description?: string; created?: string; company?: { display_name?: string }; location?: { display_name?: string }; salary_min?: number; salary_max?: number }, index: number) => ({
      title: job.title ?? "Untitled opportunity", url: job.redirect_url ?? "",
      content: [job.company?.display_name, job.location?.display_name, job.salary_min && job.salary_max ? `$${job.salary_min}-$${job.salary_max}` : undefined, job.description].filter(Boolean).join(" · "),
      publishedDate: job.created, source: "Adzuna",
      buyer: job.company?.display_name,
      estimatedTotal: index === 0 && Number.isFinite(Number(data.count)) ? Number(data.count) : undefined,
    }));
  }
}

function adzunaCountry(country?: string) {
  const codes: Record<string, string> = { france: "fr", "united states": "us", usa: "us", "united kingdom": "gb", uk: "gb", germany: "de", canada: "ca", australia: "au", india: "in" };
  return codes[country?.toLowerCase() ?? ""] ?? "gb";
}

function providers(context: UserContext): MarketSearchProvider[] {
  const available: MarketSearchProvider[] = [];
  if (config.enableRemoteFirstJobs) available.push(new RemoteFirstProvider());
  if (config.enableArbeitnow) available.push(new ArbeitnowProvider());
  available.push(new JobicyProvider());
  available.push(new RemotiveProvider());
  if (process.env.JOOBLE_API_KEY) available.push(new JoobleProvider());
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) available.push(new AdzunaProvider(adzunaCountry(context.country)));
  if (process.env.SEARCH_API_KEY && config.searchProvider === "tavily") available.push(new TavilyProvider());
  if (process.env.SEARCH_API_KEY && config.searchProvider === "brave") available.push(new BraveProvider());
  return available;
}

function sourceFromUrl(value: string) {
  const host = new URL(value).hostname.replace(/^www\./, "");
  const known: Record<string, string> = { "upwork.com": "Upwork", "contra.com": "Contra", "wellfound.com": "Wellfound" };
  return Object.entries(known).find(([domain]) => host.endsWith(domain))?.[1] ?? host;
}

function compensation(text: string) {
  const match = text.match(/(?:[$€£]\s?\d[\d,]*(?:\.\d+)?(?:\s?[kKmM]\b)?(?:\s?[–-]\s?[$€£]?\s?\d[\d,]*(?:\.\d+)?(?:\s?[kKmM]\b)?)?(?:\s?\/?\s?(?:hr|hour|project|month|year))?)/i);
  return match?.[0];
}

export function classifyOpportunityKind(text: string): OpportunityKind {
  const value = text.toLowerCase();
  if (/fractional|part-time (?:cmo|cto|coo|head|director)|interim executive/.test(value)) return "fractional";
  if (/consultant|consulting|advisor|advisory/.test(value)) return "consulting";
  if (/freelance|contractor|contract role|project-based|fixed-price|short-term|part[- ]time/.test(value)) return "freelance_contract";
  if (/request for proposal|rfp|seeking (?:a )?(?:partner|vendor|agency)|market entry|expanding into|launched in|funding round|new market/.test(value)) return "latent_buyer_demand";
  if (/productized service|service package|monthly package|fixed-scope|fixed scope/.test(value)) return "productized_service";
  return "employment";
}

function tokenSet(values: string[]) {
  return new Set(values.join(" ").toLowerCase().match(/[a-zà-ž0-9+#.]{3,}/g) ?? []);
}

const GENERIC_CAPABILITY_WORDS = new Set(["and", "the", "for", "with", "specialist", "professional", "experience", "management", "creation", "development"]);

const CAPABILITY_ALIASES: Array<{ match: RegExp; terms: string[] }> = [
  { match: /business development|sales|commercial/i, terms: ["partnership", "go-to-market", "account growth", "revenue", "commercial"] },
  { match: /financial|finance|account/i, terms: ["finance", "financial", "accounting", "budget", "forecast"] },
  { match: /content|writing|copy/i, terms: ["content", "editorial", "copywriter", "writer", "communications"] },
  { match: /social media|influencer/i, terms: ["social", "community", "influencer", "creator"] },
  { match: /education|program/i, terms: ["learning", "training", "curriculum", "education", "programme", "program"] },
  { match: /project management/i, terms: ["project", "program manager", "programme manager", "delivery", "operations"] },
  { match: /market expansion|localization|translation|multilingual/i, terms: ["localization", "translation", "multilingual", "international", "market entry"] },
];

function capabilityMatches(label: string, haystack: string) {
  const phrase = label.toLowerCase().replace(/[^\p{L}\p{N}+#.]+/gu, " ").trim();
  if (!phrase) return false;
  if (haystack.includes(phrase)) return true;
  if (CAPABILITY_ALIASES.some((alias) => alias.match.test(label) && alias.terms.some((term) => haystack.includes(term)))) return true;
  const terms = [...tokenSet([phrase])].filter((term) => !GENERIC_CAPABILITY_WORDS.has(term));
  if (!terms.length) return false;
  const matched = terms.filter((term) => haystack.includes(term)).length;
  return matched >= Math.max(1, Math.ceil(terms.length * 0.5));
}

export function rankOpportunity(raw: RawResult, combinations: SkillCombination[], context: UserContext): Opportunity | null {
  return evaluateOpportunity(raw, combinations, context).opportunity;
}

export type OpportunityFilterReason = "location" | "expired" | "low_fit";

export function evaluateOpportunity(raw: RawResult, combinations: SkillCombination[], context: UserContext): { opportunity: Opportunity | null; eligibleAfterHardFilters: boolean; filterReason?: OpportunityFilterReason } {
  if (!isSafeExternalUrl(raw.url)) return { opportunity: null, eligibleAfterHardFilters: false, filterReason: "expired" };
  const haystack = `${raw.title} ${raw.content}`.toLowerCase();
  if (/expired|position has been filled|no longer accepting/.test(haystack)) return { opportunity: null, eligibleAfterHardFilters: false, filterReason: "expired" };
  const kind = classifyOpportunityKind(haystack);
  const selectedKinds = selectedOpportunityKinds(context.contractTypes);
  if (selectedKinds.size && !selectedKinds.has(kind)) return { opportunity: null, eligibleAfterHardFilters: false, filterReason: "low_fit" };
  if (!authorizationAllows(haystack, context)) return { opportunity: null, eligibleAfterHardFilters: false, filterReason: "location" };
  const usOnly = /us[- ]only|united states only|must be authorized to work in (?:the )?u\.?s/.test(haystack);
  if (context.workMode !== "global_remote" && !/united states|usa|u\.s\./i.test(context.country ?? "") && /\b[a-z][a-z .'-]{1,40},\s*(?:al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b/i.test(haystack)) return { opportunity: null, eligibleAfterHardFilters: false, filterReason: "location" };
  if (context.exclusions && tokenSet([context.exclusions]).size && [...tokenSet([context.exclusions])].some((t) => haystack.includes(t))) return { opportunity: null, eligibleAfterHardFilters: false, filterReason: "low_fit" };

  let bestIndex = 0;
  let bestMatches = 0;
  combinations.forEach((combo, index) => {
    const matches = combo.elements.filter((element) => capabilityMatches(element, haystack)).length;
    if (matches > bestMatches) { bestMatches = matches; bestIndex = index; }
  });
  if (bestMatches < 1) return { opportunity: null, eligibleAfterHardFilters: true, filterReason: "low_fit" };
  if (!opportunityTitleSupportsIntent(raw.title, combinations[bestIndex].elements, raw.content)) {
    return { opportunity: null, eligibleAfterHardFilters: true, filterReason: "low_fit" };
  }
  const remote = /remote|anywhere|distributed/.test(haystack);
  const locationTerms = geographyTerms(context);
  const locationMatches = locationTerms.filter((term) => haystack.includes(term));
  const geoCompatible = context.workMode === "global_remote"
    // Independent work and buyer demand are frequently deliverable remotely
    // even when the public signal does not repeat the word "remote". Only an
    // explicit physical-presence requirement is a hard rejection here.
    ? !/\b(?:on-site|onsite|in-person|must be based in|local candidates? only)\b/.test(haystack)
    : context.workMode === "regional_remote"
      ? remote && locationMatches.length > 0
      : locationMatches.length > 0;
  if (!geoCompatible) return { opportunity: null, eligibleAfterHardFilters: false, filterReason: "location" };
  const freshBonus = raw.publishedDate ? 8 : 2;
  const comp = compensation(`${raw.title} ${raw.content}`);
  const bestService = combinations[bestIndex].services[0];
  const location_dependency = inferLocationDependency(haystack, bestService.location_dependency);
  const monetizationSpeed = speed_to_monetize(haystack, bestMatches, Boolean(comp), location_dependency, bestService.speed_to_monetize);
  const geoScore = context.workMode === "local" ? Math.min(18, 10 + locationMatches.length * 2) : 12;
  const speedBonus = monetizationSpeed === "Fast" ? 10 : monetizationSpeed === "Moderate" ? 4 : 0;
  const sourceQuality = raw.source === "Jobicy" || raw.source === "Arbeitnow" || raw.source === "Remote First Jobs" ? 5 : raw.url.includes("jooble.org") ? -10 : 0;
  const requiredCoverage = combinations[bestIndex].elements.length === 1 ? 1 : 2;
  const rawScore = 38 + bestMatches * 12 + geoScore + (comp ? 8 : 0) + freshBonus + speedBonus + sourceQuality;
  // One generic overlap must never become a Good/Strong match through remote,
  // compensation or freshness bonuses. Multi-capability directions require
  // evidence of at least two selected capabilities before outreach is allowed.
  const score = Math.min(bestMatches >= requiredCoverage ? 96 : 48, rawScore);
  return { eligibleAfterHardFilters: true, opportunity: {
    id: crypto.randomUUID(), title: raw.title.replace(/<[^>]+>/g, "").slice(0, 160), source: raw.source ?? sourceFromUrl(raw.url),
    url: canonicalUrl(raw.url), postedDate: raw.publishedDate, compensation: comp, location: remote ? "Remote" : locationMatches[0] ?? context.city,
    remoteStatus: remote ? "Remote" : "Not stated", authorization: usOnly ? "US work authorization" : undefined,
    summary: normalizeOpportunityText(raw.content).slice(0, 320), requiredSkills: combinations[bestIndex].elements.filter((element) => capabilityMatches(element, haystack)),
    fitLabel: score >= 78 ? "Strong fit" : score >= 62 ? "Good fit" : "Moderate fit",
    fitReason: `The listing mentions ${combinations[bestIndex].elements.filter((element) => capabilityMatches(element, haystack)).join(", ")}. Review the full requirements and working arrangements before applying.`,
    combinationIndex: bestIndex, score, location_dependency, speed_to_monetize: monetizationSpeed,
    kind,
    buyer: raw.buyer ?? raw.source,
    publicSignals: kind === "latent_buyer_demand" ? [raw.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 220)] : [],
    suggestedOffer: kind === "latent_buyer_demand" || kind === "productized_service" ? bestService.name : undefined,
    evidenceUrls: [canonicalUrl(raw.url)],
  } };
}

export async function searchRawMarket(query: string, context: UserContext) {
  const settled = await Promise.allSettled(providers(context).map((provider) => provider.search(query)));
  return {
    results: settled.flatMap((item) => item.status === "fulfilled" ? item.value : []),
    estimatedTotal: settled.reduce((total, item) => {
      if (item.status !== "fulfilled") return total;
      return total + (item.value.find((result) => typeof result.estimatedTotal === "number")?.estimatedTotal ?? item.value.length);
    }, 0),
    errors: settled.flatMap((item) => item.status === "rejected" ? [item.reason instanceof Error ? item.reason.message : String(item.reason)] : []),
    status: settled.every((item) => item.status === "rejected") ? "failed" as const : settled.some((item) => item.status === "rejected") ? "partial" as const : "complete" as const,
  };
}

export async function searchMarketOpportunities(combinations: SkillCombination[], context: UserContext) {
  const queries = buildMarketQueries(combinations, context);
  const settled = await Promise.allSettled(queries.map((query) => searchRawMarket(query, context)));
  const raw = settled.flatMap((item) => item.status === "fulfilled" ? item.value.results : []);
  const unique = new Map<string, Opportunity>();
  raw.forEach((item) => {
    const ranked = rankOpportunity(item, combinations, context);
    if (ranked && !unique.has(ranked.url)) unique.set(ranked.url, ranked);
  });
  return {
    opportunities: [...unique.values()].sort((a, b) => b.score - a.score),
    status: settled.every((x) => x.status === "rejected" || x.value.status === "failed") ? "failed" as const : settled.some((x) => x.status === "rejected" || x.value.status !== "complete") ? "partial" as const : "complete" as const,
  };
}

export function deriveDemand(combinations: SkillCombination[], opportunities: Opportunity[]) {
  return combinations.map((combo, index) => ({ ...combo, demandLevel: opportunities.filter((o) => o.combinationIndex === index).length >= 6 ? "High" as const : opportunities.filter((o) => o.combinationIndex === index).length >= 2 ? "Medium" as const : "Low" as const }));
}

export function derivePricing(opportunities: Opportunity[], count: number) {
  return Array.from({ length: count }, (_, index) => {
    const observed = opportunities.filter((o) => o.combinationIndex === index && o.compensation).map((o) => o.compensation as string);
    return { range: observed.length >= 2 ? observed.slice(0, 3).join(" · ") : undefined, sampleSize: observed.length, disclaimer: "Comparable public listings, not an earnings prediction." };
  });
}
