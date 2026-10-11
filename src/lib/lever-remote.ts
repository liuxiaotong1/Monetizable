import type { MarketSearchProvider, RawResult } from "@/lib/search";
import { isRemoteOnlyOpportunity } from "@/lib/remote-only";

type Posting = { text?: string; hostedUrl?: string; applyUrl?: string; workplaceType?: string; descriptionPlain?: string; additionalPlain?: string; lists?: {text?:string;content?:string}[]; categories?: {location?:string;commitment?:string;allLocations?:string[]} };
export function leverRemoteResult(job: Posting, company: string): RawResult | null {
  if (!job.text || !/^https:\/\/jobs\.lever\.co\//.test(job.hostedUrl ?? "") || !/^https:\/\/jobs\.lever\.co\/.+\/apply/.test(job.applyUrl ?? "")) return null;
  if (job.workplaceType && job.workplaceType !== "remote") return null;
  const description = [job.descriptionPlain, ...(job.lists ?? []).map(list => `${list.text ?? ""} ${list.content ?? ""}`), job.additionalPlain].filter(Boolean).join(" ");
  const result: RawResult = { title: job.text, url: job.hostedUrl!, buyer: company, source: "Lever", description,
    employmentType: job.categories?.commitment,
    eligibleLocations: job.categories?.allLocations ?? (job.categories?.location ? [job.categories.location] : undefined),
    content: [company, job.workplaceType, job.categories?.location, job.categories?.commitment, description].filter(Boolean).join(" · ") };
  return isRemoteOnlyOpportunity(result) ? result : null;
}
let cache: {at:number;promise:Promise<RawResult[]>} | undefined;
export class LeverRemoteProvider implements MarketSearchProvider {
  async search() {
    if (!cache || Date.now()-cache.at > 3600_000) {
      const promise = Promise.all([['tsmg','TSMG'],['appen','Appen']].map(async ([site,company]) => {
        const results = new Map<string,RawResult>();
        for(let page=0;page<5;page++) {
          const response=await fetch(`https://api.lever.co/v0/postings/${site}?mode=json&limit=100&skip=${page*100}`,{next:{revalidate:3600},signal:AbortSignal.timeout(10_000)});
          if(!response.ok) { if(page>0)break; throw new Error(`Lever ${site} failed (${response.status})`); }
          const jobs: Posting[]=await response.json();
          if(!Array.isArray(jobs))throw new Error('Invalid Lever feed');
          for(const job of jobs){const result=leverRemoteResult(job,company);if(result)results.set(result.url,result);}
          if(jobs.length<100)break;
        }
        return [...results.values()];
      })).then(rows=>rows.flat()).catch(error=>{cache=undefined;throw error});
      cache={at:Date.now(),promise};
    }
    return cache.promise;
  }
}
