import type { MarketSearchProvider, RawResult } from "@/lib/search";

type RemoteOkJob = { id?: number | string; position?: string; url?: string; company?: string; description?: string; date?: string; location?: string; tags?: string[] };
export function remoteOkResult(job: RemoteOkJob): RawResult | null {
  if (!job.id || !job.position || !job.description || !/^https:\/\/remoteok\.com\/remote-jobs\//i.test(job.url ?? "")) return null;
  const date = Date.parse(job.date ?? "");
  if (!Number.isFinite(date) || date < Date.now() - 45 * 86400_000) return null;
  // Preserve Remote OK attribution and canonical listing link as required by its feed.
  return { title: job.position, url: new URL(job.url!).href, source: "Remote OK", buyer: job.company,
    publishedDate: new Date(date).toISOString(), description: job.description,
    employmentType: job.tags?.find(tag => /^(?:full[- ]time|part[- ]time|contract|freelance)$/i.test(tag)),
    eligibleLocations: job.location ? [job.location] : undefined,
    content: [job.company, "Remote", job.location, job.description].filter(Boolean).join(" · ") };
}
let cache: { at: number; promise: Promise<RawResult[]> } | undefined;
export class RemoteOkProvider implements MarketSearchProvider {
  async search(): Promise<RawResult[]> {
    if (!cache || Date.now() - cache.at > 86400_000) {
      const promise = fetch("https://remoteok.com/api", { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10_000) })
        .then(async response => {
          if (!response.ok) throw new Error(`Remote OK feed failed (${response.status})`);
          const rows = await response.json();
          if (!Array.isArray(rows)) throw new Error("Remote OK returned an invalid feed");
          return rows.map(remoteOkResult).filter((row): row is RawResult => row !== null);
        }).catch(error => { cache = undefined; throw error; });
      cache = { at: Date.now(), promise };
    }
    return cache.promise;
  }
}
