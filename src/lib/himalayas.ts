import type { UserContext } from "@/lib/types";
import type { MarketSearchProvider, RawResult } from "@/lib/search";
type RemoteJob = { title?: string; guid?: string; applicationLink?: string; description?: string; excerpt?: string; companyName?: string; pubDate?: number | string; expiryDate?: number | string; locationRestrictions?: Array<string | { name: string }>; timezoneRestrictions?: number[]; minSalary?: number; maxSalary?: number; currency?: string; salaryPeriod?: string; employmentType?: string };
function timestamp(value?: number | string) {
  if (value === undefined) return undefined;
  const numeric = Number(value);
  const ms = Number.isFinite(numeric) ? numeric * (numeric < 1e12 ? 1000 : 1) : Date.parse(String(value));
  return Number.isFinite(ms) ? ms : undefined;
}
export function himalayasResult(job: RemoteJob, context: UserContext): RawResult | null {
  const countries = (job.locationRestrictions ?? []).map(country => typeof country === "string" ? country : country.name);
  const normalize = (s: string) => ({ usa: "united states", us: "united states", uk: "united kingdom" }[s.toLowerCase()] ?? s.toLowerCase());
  if (countries.length && !countries.some(country => normalize(country) === normalize(context.country ?? ""))) return null;
  const expiry = timestamp(job.expiryDate), published = timestamp(job.pubDate);
  if (expiry !== undefined && expiry < Date.now()) return null;
  const url = [job.guid, job.applicationLink].find(url => /^https:\/\/himalayas\.app\//.test(url ?? "")) ?? "";
  if (!/^https:\/\/himalayas\.app\//.test(url)) return null;
  return {
    title: job.title ?? "Remote opportunity", url, source: "Himalayas", buyer: job.companyName,
    employmentType: job.employmentType,
    eligibleLocations: countries,
    description: job.description ?? job.excerpt,
    publishedDate: published !== undefined ? new Date(published).toISOString() : undefined,
    content: [job.companyName, "Remote", countries.length ? `Eligible locations: ${countries.join(", ")}` : "Worldwide", job.timezoneRestrictions?.length ? `UTC offsets: ${job.timezoneRestrictions.join(", ")}` : "", job.employmentType,
      job.minSalary && job.maxSalary ? `${job.currency ?? ""} ${job.minSalary}–${job.maxSalary} / ${job.salaryPeriod ?? "period not specified"}` : "", job.description ?? job.excerpt].filter(Boolean).join(" · "),
  };
}
export class HimalayasProvider implements MarketSearchProvider {
  constructor(private context: UserContext) {}
  async search(query: string): Promise<RawResult[]> {
    const q = query.replace(/\([^)]*\)/g, " ").replace(/\b(?:OR|AND|remote|worldwide|freelance|contract|project|consultant)\b/gi," ").replace(/\s+/g," ").trim();
    const countries: Record<string,string> = { france:"FR",germany:"DE",spain:"ES",italy:"IT",netherlands:"NL",belgium:"BE",portugal:"PT",ireland:"IE", "united kingdom":"GB",uk:"GB", "united states":"US",usa:"US",canada:"CA",australia:"AU",india:"IN",china:"CN",singapore:"SG" };
    const country = countries[this.context.country?.toLowerCase() ?? ""];
    // Filter before pagination: otherwise the first page can be entirely
    // country-ineligible while hundreds of suitable remote results exist.
    const params = new URLSearchParams({q,sort:"recent",...(country ? {country} : {worldwide:"true"})});
    const results = new Map<string, RawResult>();
    const seen = new Set<string>();
    for (let page = 1; page <= 8; page++) {
      params.set("page", String(page));
      const response = await fetch(`https://himalayas.app/jobs/api/search?${params}`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10_000) });
      if (!response.ok) {
        if (page > 1) break; // Keep successful pages if a later page is rate limited.
        throw new Error(`Himalayas search failed (${response.status})`);
      }
      const data = await response.json();
      const jobs: RemoteJob[] = Array.isArray(data.jobs) ? data.jobs : [];
      let added = 0;
      for (const job of jobs) {
        const key = job.guid ?? job.applicationLink;
        if (!key || seen.has(key)) continue;
        seen.add(key); added++;
        const result = himalayasResult(job, this.context);
        if (result) results.set(result.url, result);
      }
      if (!added || jobs.length < Number(data.limit ?? 20) || (Number(data.totalCount) > 0 && seen.size >= Number(data.totalCount))) break;
    }
    return [...results.values()];
  }
}
