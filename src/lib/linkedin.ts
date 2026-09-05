import { config } from "@/lib/config";
import type { ProfileEvidence } from "@/lib/types";

export interface LinkedInRetrieval {
  url: string;
  directAccess: "worked" | "blocked" | "failed";
  notFound: boolean;
  indexedSearchAvailable: boolean;
  evidence: ProfileEvidence[];
}

type LinkedInCacheEntry = { expiresAt: number; value: LinkedInRetrieval };

declare global {
  var monetizableLinkedInCache: Map<string, LinkedInCacheEntry> | undefined;
  var monetizableLinkedInInflight: Map<string, Promise<LinkedInRetrieval>> | undefined;
}

const profileCache = global.monetizableLinkedInCache ?? new Map<string, LinkedInCacheEntry>();
const inflightProfiles = global.monetizableLinkedInInflight ?? new Map<string, Promise<LinkedInRetrieval>>();
global.monetizableLinkedInCache = profileCache;
global.monetizableLinkedInInflight = inflightProfiles;
const PROFILE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const BLOCKED_PROFILE_CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_VERSION = "v4";

export function clearLinkedInProfileCache() {
  profileCache.clear();
  inflightProfiles.clear();
}

export function normalizeLinkedInProfileUrl(value: string) {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("Enter a valid LinkedIn profile URL."); }
  if (url.protocol !== "https:" || !(url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com"))) {
    throw new Error("Enter a valid LinkedIn profile URL.");
  }
  const match = url.pathname.match(/^\/in\/([^/?#]+)\/?$/i);
  if (!match) throw new Error("Use a LinkedIn member profile URL such as linkedin.com/in/your-name.");
  return `https://www.linkedin.com/in/${match[1]}/`;
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

function evidenceMatchesProfileSlug(text: string, slug: string) {
  const expected = slug.toLowerCase().split("-").filter((part) => /^[a-zà-ž]{3,}$/i.test(part)).slice(0, 2);
  if (expected.length === 0) return true;
  const compact = text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
  return expected.every((part) => compact.includes(part.normalize("NFKD").replace(/[^a-z0-9]+/g, "")));
}

function meta(html: string, key: string) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, "i"),
  ];
  return patterns.map((pattern) => html.match(pattern)?.[1]).find(Boolean);
}

function publicPageEvidence(html: string, url: string): ProfileEvidence | null {
  const title = meta(html, "og:title") ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  const description = meta(html, "og:description") ?? meta(html, "description");
  const structured: string[] = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(decodeHtml(match[1]));
      const person = data?.mainEntity ?? data?.["@graph"]?.find((item: { [key: string]: unknown }) => item?.["@type"] === "Person");
      if (!person || person["@type"] !== "Person") continue;
      const jobTitles = Array.isArray(person.jobTitle) ? person.jobTitle.filter(Boolean) : [person.jobTitle].filter(Boolean);
      const employers = (Array.isArray(person.worksFor) ? person.worksFor : [person.worksFor]).filter(Boolean).map((item: { name?: string }) => item.name).filter(Boolean);
      const schools = (Array.isArray(person.alumniOf) ? person.alumniOf : [person.alumniOf]).filter(Boolean).map((item: { name?: string }) => item.name).filter(Boolean);
      const languages = (Array.isArray(person.knowsLanguage) ? person.knowsLanguage : [person.knowsLanguage]).filter(Boolean).map((item: string | { name?: string }) => typeof item === "string" ? item : item.name).filter(Boolean);
      const locality = person.address?.addressLocality;
      const country = person.address?.addressCountry;
      if (person.name) structured.push(`Name: ${person.name}`);
      if (jobTitles.length) structured.push(`Roles: ${jobTitles.join(", ")}`);
      if (employers.length) structured.push(`Experience: ${employers.join(", ")}`);
      if (schools.length) structured.push(`Education: ${schools.join(", ")}`);
      if (languages.length) structured.push(`Languages: ${languages.join(", ")}`);
      if (locality || country) structured.push(`Location: ${[locality, country].filter(Boolean).join(", ")}`);
    } catch {
      // A malformed optional metadata block must not discard valid OpenGraph evidence.
    }
  }
  const text = [title, description, ...structured].filter(Boolean).map((part) => decodeHtml(part as string)).filter((part) => !/^linkedin:?\s*(log in|sign up)?$/i.test(part)).join("\n");
  if (text.length < 20 || /profile not found|join linkedin|sign in to linkedin/i.test(text)) return null;
  return { source: "linkedin_public", text, url, retrievalSource: "linkedin_public_page" };
}

async function indexedEvidence(url: string): Promise<ProfileEvidence[]> {
  if (!process.env.SEARCH_API_KEY) return [];
  const slug = new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  const query = `"${url}" OR "linkedin.com/in/${slug}"`;
  try {
    if (config.searchProvider === "tavily") {
      const response = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_key: process.env.SEARCH_API_KEY, query, search_depth: "advanced", max_results: 5, include_answer: false }) });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.results ?? []).filter((item: { title?: string; url?: string; content?: string }) => {
        const text = [item.title, item.content].filter(Boolean).join("\n");
        return Boolean(item.url?.includes(`linkedin.com/in/${slug}`) && evidenceMatchesProfileSlug(text, slug));
      }).map((item: { title?: string; url?: string; content?: string }) => ({ source: "linkedin_public" as const, text: [item.title, item.content].filter(Boolean).join("\n"), url: item.url ?? url, retrievalSource: "public_search" as const }));
    }
    if (config.searchProvider === "brave") {
      const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, { headers: { accept: "application/json", "x-subscription-token": process.env.SEARCH_API_KEY } });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.web?.results ?? []).filter((item: { title?: string; url?: string; description?: string }) => {
        const text = [item.title, item.description].filter(Boolean).join("\n");
        return Boolean(item.url?.includes(`linkedin.com/in/${slug}`) && evidenceMatchesProfileSlug(text, slug));
      }).map((item: { title?: string; url?: string; description?: string }) => ({ source: "linkedin_public" as const, text: [item.title, item.description].filter(Boolean).join("\n"), url: item.url ?? url, retrievalSource: "public_search" as const }));
    }
  } catch (error) {
    console.error("LinkedIn indexed search failure", { url, error });
  }
  return [];
}

async function openAiIndexedEvidence(url: string): Promise<ProfileEvidence[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];
  const slug = new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        signal: AbortSignal.timeout(25_000),
        body: JSON.stringify({
          model: process.env.OPENAI_LINKEDIN_SEARCH_MODEL ?? "gpt-5.4-mini",
          tools: [{ type: "web_search", search_context_size: "high" }],
          input: `Find and summarize only public professional information from the exact LinkedIn profile ${url}. Search locale variants such as fr.linkedin.com/in/${slug} and the exact slug. Include roles, education, certifications, languages, services, projects, and measurable achievements when visible. Do not mix in any other similarly named profile. Distinguish authored work from liked or reposted activity; never present likes, reposts, or another person's post as this person's capability or achievement. Return compact evidence with one fact per line and cite the exact matching profile.`,
          max_output_tokens: 1_200,
        }),
      });
      if (!response.ok) {
        console.error("OpenAI LinkedIn public-index fallback rejected", { status: response.status });
        return [];
      }
      const data = await response.json();
      const content = data.output?.flatMap((item: { content?: { text?: string; annotations?: { type?: string; url?: string }[] }[] }) => item.content ?? []).find((item: { text?: string }) => item.text);
      const outputText = data.output_text ?? content?.text;
      if (!outputText || outputText.trim() === "NO_PUBLIC_EVIDENCE" || outputText.trim().length < 40) continue;
      const exactCitation = content?.annotations?.find((annotation: { type?: string; url?: string }) => {
        if (annotation.type !== "url_citation" || !annotation.url) return false;
        try { return new URL(annotation.url).pathname.replace(/\/$/, "").toLowerCase() === `/in/${slug}`.toLowerCase(); } catch { return false; }
      })?.url;
      if (!exactCitation) continue;
      const citedUrl = new URL(exactCitation);
      citedUrl.search = "";
      citedUrl.hash = "";
      const cleaned = outputText
        .replace(/\(\[\]\(\)\)/g, "")
        .replace(/\(\[[^\]]+\]\(https?:\/\/[^)]+\)\)/g, "")
        .replace(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g, "")
        .replace(/^\s*\)\s*$/gm, "")
        .replace(/\*\*/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      const lines = cleaned.split(/\n+/).map((line: string) => line.replace(/^\s*[-•]\s*/, "").trim()).filter(Boolean);
      const profileLine = lines.find((line: string) => /^Profile:/i.test(line));
      const nameLine = lines.find((line: string) => /^Name:/i.test(line));
      const exactMatchLine = lines.find((line: string) => /^Exact matching profile found:/i.test(line));
      const aboutLine = lines.find((line: string) => /^(?:About headline|Headline)(?: shown)?:/i.test(line));
      const name = nameLine?.replace(/^Name:\s*/i, "").replace(/\.$/, "").trim()
        ?? profileLine?.match(/^Profile:\s*(.+?)(?:\s+on\s+the\s+exact|\s+at\s+https?:|$)/i)?.[1]?.trim()
        ?? exactMatchLine?.match(/^Exact matching profile found:\s*(.+?)\s+on\s+LinkedIn/i)?.[1]?.trim();
      const headline = aboutLine?.replace(/^[^:]+:\s*/, "").replace(/[“”"]/g, "").replace(/\.$/, "").trim();
      const body = lines.filter((line: string) => line !== profileLine && line !== nameLine && line !== exactMatchLine && line !== aboutLine && !/^Here is (?:the exact matching profile|a compact summary)/i.test(line) && !/^Public professional information visible/i.test(line) && !/^Public activity visible/i.test(line) && !/\b(?:liked|reposted)\b/i.test(line) && !/^I did not use/i.test(line) && !/^Visible role\/experience entries/i.test(line));
      const text = [name ? `${name}${headline ? ` — ${headline}` : ""}` : undefined, ...body].filter(Boolean).join("\n");
      if (!evidenceMatchesProfileSlug(text, slug)) continue;
      return [{ source: "linkedin_public", text, url: citedUrl.toString(), retrievalSource: "public_search" }];
    }
    return [];
  } catch (error) {
    console.error("OpenAI LinkedIn public-index fallback failure", { url, error });
    return [];
  }
}

async function fetchPublicProfilePage(url: string) {
  let finalError: unknown;
  const userAgents = [
    "Mozilla/5.0 (compatible; Monetizable/1.0; public-profile-analysis)",
    "facebookexternalhit/1.1",
  ];
  let lastResponse: Response | undefined;
  for (const userAgent of userAgents) {
    try {
      const response = await fetch(url, { redirect: "follow", headers: { accept: "text/html,application/xhtml+xml", "user-agent": userAgent }, signal: AbortSignal.timeout(8000) });
      lastResponse = response;
      if (response.ok || response.status === 404) return response;
    } catch (error) {
      finalError = error;
    }
  }
  if (lastResponse) return lastResponse;
  throw finalError;
}

async function retrieveFreshProfile(url: string): Promise<LinkedInRetrieval> {
  let directAccess: LinkedInRetrieval["directAccess"] = "failed";
  let notFound = false;
  let direct: ProfileEvidence | null = null;
  try {
    const response = await fetchPublicProfilePage(url);
    notFound = response.status === 404 && /profile not found/i.test((await response.clone().text()).slice(0, 100_000));
    directAccess = response.ok ? "worked" : response.status === 401 || response.status === 403 || response.status === 429 || response.status === 999 ? "blocked" : "failed";
    if (response.ok) direct = publicPageEvidence((await response.text()).slice(0, 1_000_000), url);
    if (response.ok && !direct) directAccess = "blocked";
  } catch (error) {
    console.error("LinkedIn public page retrieval failure", { url, error });
  }
  let indexed = await indexedEvidence(url);
  if (!direct && indexed.length === 0) indexed = await openAiIndexedEvidence(url);
  return { url, directAccess, notFound, indexedSearchAvailable: indexed.length > 0, evidence: [...(direct ? [direct] : []), ...indexed] };
}

export async function retrieveLinkedInPublicProfile(value: string): Promise<LinkedInRetrieval> {
  const url = normalizeLinkedInProfileUrl(value);
  const cacheKey = `${CACHE_VERSION}:${url}`;
  const cached = profileCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) profileCache.delete(cacheKey);
  const existing = inflightProfiles.get(cacheKey);
  if (existing) return existing;
  const retrieval = retrieveFreshProfile(url).then((value) => {
    const ttl = value.evidence.length > 0 ? PROFILE_CACHE_TTL_MS : BLOCKED_PROFILE_CACHE_TTL_MS;
    profileCache.set(cacheKey, { value, expiresAt: Date.now() + ttl });
    return value;
  }).finally(() => inflightProfiles.delete(cacheKey));
  inflightProfiles.set(cacheKey, retrieval);
  return retrieval;
}
