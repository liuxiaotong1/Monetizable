import type { MarketSearchProvider, RawResult } from "@/lib/search";
import type { UserContext } from "@/lib/types";
import { normalizeOpportunityText } from "@/lib/opportunity-text";
import { isRemoteOnlyOpportunity } from "@/lib/remote-only";

// Public syndication is permitted with attribution and links back to WWR:
// https://weworkremotely.com/remote-job-rss-feed
export function parseRemoteFeed(xml: string, context: UserContext): RawResult[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap(([, item]) => {
    const field = (name: string) => normalizeOpportunityText(normalizeOpportunityText(item.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")));
    const url = field("link");
    if (!/^https:\/\/weworkremotely\.com\/remote-jobs\//.test(url)) return [];
    const region = field("region"), country = field("country");
    if (region && !/anywhere|worldwide/i.test(region) && (!context.country || !`${region} ${country}`.toLowerCase().includes(context.country.toLowerCase()))) return [];
    const date = field("pubDate");
    if (!Number.isFinite(Date.parse(date)) || Date.now() - Date.parse(date) > 45 * 86_400_000) return [];
    const title = field("title");
    const result = { title, url, source: "We Work Remotely", buyer: title.split(":")[0], publishedDate: new Date(date).toISOString(), content: ["Remote", region, country, field("type"), field("category"), field("description")].filter(Boolean).join(" · ") };
    return isRemoteOnlyOpportunity(result) ? [result] : [];
  });
}

let cached: Promise<string> | undefined;
let until = 0;
export class WeWorkRemotelyProvider implements MarketSearchProvider {
  constructor(private context: UserContext) {}
  async search(query: string) {
    if (Date.now() >= until) { cached = undefined; until = Date.now() + 3_600_000; }
    cached ??= fetch("https://weworkremotely.com/remote-jobs.rss", { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10_000) }).then(response => {
      if (!response.ok) throw new Error(`We Work Remotely feed failed (${response.status})`);
      return response.text();
    }).catch(error => { cached = undefined; throw error; });
    const terms = query.toLowerCase().replace(/\([^)]*\)/g, "").split(/\W+/).filter(term => term.length > 2 && !["remote", "freelance", "contract", "project", "needed", "consultant", "vendor", "buyer"].includes(term));
    return parseRemoteFeed(await cached, this.context).filter(job => terms.some(term => `${job.title} ${job.content}`.toLowerCase().includes(term)));
  }
}
