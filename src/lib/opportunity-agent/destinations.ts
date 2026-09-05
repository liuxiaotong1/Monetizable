import type { Opportunity } from "@/lib/types";
import { publicWebFetch } from "@/lib/public-web";
import { isSafeExternalUrl } from "@/lib/url";
import { extractPublicContact, isValidProfessionalEmail, prefersDirectOutreach } from "@/lib/opportunity-agent/signatures";

const ATS_HOST = /(?:^|\.)(?:greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|smartrecruiters\.com|jobvite\.com|myworkdayjobs\.com|personio\.(?:com|de)|breezy\.hr)$/i;
const BOARD_HOST = /(?:^|\.)(?:arbeitnow\.com|arbeitnow\.co\.uk|remotefirstjobs\.com|jobicy\.com|jooble\.org|lensa\.com|appcast\.io|experteer\.com|remotive\.com|adzuna\.(?:com|co\.uk|fr|de))$/i;
const REJECT_LINK = /privacy|terms|login|sign[- ]?in|register|alerts?|similar|related|share|facebook|linkedin|twitter|instagram/i;
const cache = new Map<string, Promise<string | null>>();
const contactSearchCache = new Map<string, Promise<Array<{ url: string; title: string }>>>();
const DISCOVERY_HOST = /(?:^|\.)(?:linkedin\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|wikipedia\.org|glassdoor\.[a-z.]+|indeed\.[a-z.]+|google\.com|docs\.google\.com)$/i;

function host(value: string) {
  try { return new URL(value).hostname.toLowerCase(); } catch { return ""; }
}

function absolute(base: string, href: string) {
  try { return new URL(href.replaceAll("&amp;", "&"), base).toString(); } catch { return null; }
}

function cleanText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/&(?:nbsp|amp|quot|#39);/gi, " ").replace(/\s+/g, " ").trim();
}

function candidateLinks(html: string, base: string) {
  const baseHost = host(base);
  const candidates: Array<{ url: string; score: number }> = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = absolute(base, match[1]);
    if (!url || !/^https:/i.test(url)) continue;
    const text = cleanText(match[2]);
    if (REJECT_LINK.test(`${text} ${url}`)) continue;
    const targetHost = host(url);
    let score = 0;
    if (ATS_HOST.test(targetHost)) score += 100;
    if (/\bapply(?: now| for this (?:job|position))?\b/i.test(text)) score += 50;
    if (/\b(?:apply|application|jobs?|careers?|positions?)\b/i.test(url)) score += 18;
    if (targetHost && targetHost !== baseHost) score += 16;
    if (BOARD_HOST.test(targetHost) && targetHost === baseHost) score -= 30;
    if (score > 20) candidates.push({ url, score });
  }
  return candidates.sort((left, right) => right.score - left.score);
}

async function fetchDestination(value: string) {
  const headers = { "user-agent": "Mozilla/5.0 (compatible; MonetizableOpportunityAgent/1.0; +https://getmonetizable.com)" };
  const response = await publicWebFetch(value, { headers, redirect: "manual" });
  const location = response.headers.get("location");
  if (location) return absolute(value, location);
  if (!response.ok) return null;
  const finalUrl = response.url;
  if (!BOARD_HOST.test(host(finalUrl))) return finalUrl;
  const html = await response.text();
  const best = candidateLinks(html, finalUrl)[0]?.url;
  if (!best) return null;
  if (host(best) === host(finalUrl) && /\/apply(?:[/?#]|$)/i.test(best)) {
    const redirected = await publicWebFetch(best, { headers, redirect: "manual" }).catch(() => null);
    const redirectedLocation = redirected?.headers.get("location");
    return redirectedLocation ? absolute(best, redirectedLocation) : null;
  }
  return best;
}

async function resolveUrl(value: string) {
  if (ATS_HOST.test(host(value)) || !BOARD_HOST.test(host(value))) return value;
  const parsed = new URL(value);
  let probe = value;
  if (/arbeitnow\.(?:com|co\.uk)$/i.test(parsed.hostname) && !/\/apply\/?$/i.test(parsed.pathname)) probe = `${value.replace(/\/$/, "")}/apply`;
  if (/remotefirstjobs\.com$/i.test(parsed.hostname)) {
    const slug = parsed.pathname.match(/\/jobs\/([^/?#]+)/)?.[1];
    if (slug) probe = `${parsed.origin}/a/${slug}`;
  }
  return fetchDestination(probe).catch(() => null);
}

export async function resolveOpportunityDestination(opportunity: Opportunity): Promise<Opportunity> {
  if (!opportunity.url || !BOARD_HOST.test(host(opportunity.url))) return opportunity;
  const originalUrl = opportunity.url;
  let pending = cache.get(originalUrl);
  if (!pending) { pending = resolveUrl(originalUrl); cache.set(originalUrl, pending); }
  const resolved = await pending;
  if (!resolved || !isSafeExternalUrl(resolved) || BOARD_HOST.test(host(resolved))) return opportunity;
  return {
    ...opportunity,
    url: resolved,
    evidenceUrls: [...new Set([...(opportunity.evidenceUrls ?? []), originalUrl, resolved])],
  };
}

const PROFESSIONAL_MAILBOX = /^(?:business|careers?|contact|hello|hiring|info|jobs?|office|partnerships?|people|projects?|sales|talent|team)@/i;

function publicProfessionalEmail(html: string, pageUrl?: string) {
  const emails = [...new Set([...html.matchAll(/(?:mailto:|\b)([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)]
    .map((match) => match[1].toLowerCase())
    .filter(isValidProfessionalEmail))];
  const pageHost = host(pageUrl ?? "").replace(/^www\./, "");
  const officialEmails = pageHost
    ? emails.filter((email) => {
        const emailDomain = email.split("@")[1];
        return Boolean(emailDomain && (pageHost === emailDomain || pageHost.endsWith(`.${emailDomain}`) || emailDomain.endsWith(`.${pageHost}`)));
      })
    : emails;
  // Prefer a role mailbox, but keep a named professional address when the
  // company published it on the opportunity or its own contact page.
  return officialEmails.find((email) => PROFESSIONAL_MAILBOX.test(email)) ?? officialEmails[0];
}

function contactPageUrls(html: string, base: string) {
  const baseHost = host(base);
  const urls = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .flatMap((match) => {
      const url = absolute(base, match[1]);
      if (!url || host(url) !== baseHost || !/contact|about|team|careers?/i.test(`${url} ${cleanText(match[2])}`)) return [];
      return [url];
    });
  try {
    const origin = new URL(base).origin;
    urls.push(`${origin}/contact`, `${origin}/contact-us`, `${origin}/about`, `${origin}/team`, `${origin}/careers`, origin);
  } catch { /* invalid source URL */ }
  return [...new Set(urls)].slice(0, 6);
}

function buyerTerms(opportunity: Opportunity) {
  return `${opportunity.buyer ?? ""}`.toLowerCase().match(/[a-z0-9]{4,}/g)?.filter((term) => !new Set(["company", "group", "limited", "services", "international"]).has(term)) ?? [];
}

function officialCompanyUrls(html: string, base: string, opportunity: Opportunity) {
  const baseHost = host(base);
  const terms = buyerTerms(opportunity);
  const candidates: Array<{ url: string; score: number }> = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = absolute(base, match[1]);
    if (!url || !/^https:/i.test(url)) continue;
    const targetHost = host(url);
    if (!targetHost || targetHost === baseHost || BOARD_HOST.test(targetHost) || ATS_HOST.test(targetHost) || DISCOVERY_HOST.test(targetHost)) continue;
    const text = cleanText(match[2]);
    if (REJECT_LINK.test(`${text} ${url}`)) continue;
    const haystack = `${targetHost} ${text}`.toLowerCase();
    let score = /official|company|website|homepage|visit site/i.test(text) ? 30 : 0;
    score += terms.filter((term) => haystack.includes(term)).length * 25;
    if (/contact|about|careers?/i.test(`${text} ${url}`)) score += 10;
    if (score >= 25) candidates.push({ url, score });
  }
  return [...new Map(candidates.sort((left, right) => right.score - left.score).map((candidate) => [candidate.url, candidate])).values()]
    .slice(0, 3)
    .map((candidate) => candidate.url);
}

async function searchOfficialPages(opportunity: Opportunity) {
  const buyer = String(opportunity.buyer ?? "").trim();
  if (!buyer || !process.env.SEARCH_API_KEY) return [];
  const key = buyer.toLowerCase();
  let pending = contactSearchCache.get(key);
  if (!pending) {
    pending = (async () => {
      const query = `"${buyer.replace(/["\\]/g, " ")}" official website contact ${opportunity.requiredSkills.slice(0, 2).join(" ")}`;
      if (process.env.SEARCH_PROVIDER === "brave") {
        const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=6`, {
          headers: { accept: "application/json", "x-subscription-token": process.env.SEARCH_API_KEY ?? "" },
          signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) return [];
        const data = await response.json();
        return (data.web?.results ?? []).map((item: { url?: string; title?: string }) => ({ url: item.url ?? "", title: cleanText(item.title ?? "") }));
      }
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ api_key: process.env.SEARCH_API_KEY, query, search_depth: "basic", max_results: 6, include_answer: false }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.results ?? []).map((item: { url?: string; title?: string }) => ({ url: item.url ?? "", title: cleanText(item.title ?? "") }));
    })().catch(() => []);
    contactSearchCache.set(key, pending);
  }
  const terms = buyerTerms(opportunity);
  return (await pending).filter((item) => {
    const itemHost = host(item.url);
    if (!itemHost || BOARD_HOST.test(itemHost) || ATS_HOST.test(itemHost) || DISCOVERY_HOST.test(itemHost)) return false;
    const haystack = `${itemHost} ${item.title}`.toLowerCase();
    return terms.length > 0 && terms.some((term) => haystack.includes(term));
  }).slice(0, 3);
}

async function publicContactFromPage(url: string, opportunity?: Opportunity, followOfficialSite = true): Promise<{ email: string; url: string } | null> {
  const response = await publicWebFetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; MonetizableOpportunityAgent/1.0; +https://getmonetizable.com)" },
    timeoutMs: 7_000,
  }).catch(() => null);
  if (!response?.ok) return null;
  const html = await response.text();
  const finalUrl = response.url || url;
  let email = publicProfessionalEmail(html, finalUrl);
  if (email) return { email, url: finalUrl };
  for (const contactUrl of contactPageUrls(html, finalUrl)) {
    const contactResponse = await publicWebFetch(contactUrl, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; MonetizableOpportunityAgent/1.0; +https://getmonetizable.com)" },
      timeoutMs: 5_000,
    }).catch(() => null);
    if (!contactResponse?.ok) continue;
    email = publicProfessionalEmail(await contactResponse.text(), contactResponse.url || contactUrl);
    if (email) return { email, url: contactResponse.url || contactUrl };
  }
  if (followOfficialSite && opportunity) {
    for (const companyUrl of officialCompanyUrls(html, finalUrl, opportunity)) {
      const contact: { email: string; url: string } | null = await publicContactFromPage(companyUrl, opportunity, false);
      if (contact) return contact;
    }
  }
  return null;
}

export async function enrichDirectOutreachContact(opportunity: Opportunity): Promise<Opportunity> {
  if (!prefersDirectOutreach(opportunity.kind) || extractPublicContact(opportunity) || !opportunity.url) return opportunity;
  try {
    const direct = isKnownDirectDestination(opportunity.url) ? await publicContactFromPage(opportunity.url, opportunity) : null;
    let found = direct;
    if (!found) {
      for (const page of await searchOfficialPages(opportunity)) {
        found = await publicContactFromPage(page.url, opportunity, false);
        if (found) break;
      }
    }
    if (!found) return opportunity;
    return {
      ...opportunity,
      publicSignals: [...new Set([...(opportunity.publicSignals ?? []), `Public professional contact: ${found.email}`])],
      evidenceUrls: [...new Set([...(opportunity.evidenceUrls ?? []), found.url])],
    };
  } catch {
    return opportunity;
  }
}

export function isKnownDirectDestination(value?: string) {
  if (!value) return false;
  const valueHost = host(value);
  return Boolean(valueHost) && !BOARD_HOST.test(valueHost);
}

export function isKnownAtsDestination(value?: string) {
  return Boolean(value && ATS_HOST.test(host(value)));
}
