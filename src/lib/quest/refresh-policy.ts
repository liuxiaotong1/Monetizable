import type {MarketEvent,SourceStatus} from './types';
export interface CacheClock {version?:number;attemptedAt:string;error?:string}
/** Failed attempts must never inherit a six-hour/day-long success TTL. */
export function cacheDue(prior:CacheClock|undefined,ttl:number,now:Date,version=1){
 return !prior||prior.version!==version||!Number.isFinite(Date.parse(prior.attemptedAt))||now.getTime()-Date.parse(prior.attemptedAt)>=(prior.error?Math.min(ttl,5*60_000):ttl);
}
export const releaseParserVersion=(event:MarketEvent)=>event.kind==='EARNINGS'?1:event.kind==='FOMC'||event.kind==='GDP'?6:event.kind==='CLAIMS'||event.kind==='PCE'||event.kind==='TRADE'?5:4;
export function releaseCandidates(events:MarketEvent[],cached:Map<string,CacheClock>,now:Date){
 const latest=new Map<string,string>(),kind=(e:MarketEvent)=>e.kind+(e.kind==='EARNINGS'?e.symbol||e.id:'')+(e.kind==='ISM'?String(/服务/.test(e.title)):'');
 for(const e of [...events].sort((a,b)=>a.at.localeCompare(b.at)))if(Date.parse(e.at)<=+now)latest.set(kind(e),e.id);
 const eligible=events.filter(e=>Date.parse(e.at)<=+now&&(e.kind!=='EARNINGS'||Date.parse(e.at)>+now-45*86400_000)).filter(e=>{
  const prior=cached.get(e.id),upgrade=prior&&prior.version!==releaseParserVersion(e);
  if(e.status==='confirmed'&&latest.get(kind(e))!==e.id&&!upgrade&&!prior?.error)return false;
  const ttl=e.status==='confirmed'?86400_000:+now-Date.parse(e.at)<86400_000?300_000:3600_000;
  return cacheDue(prior,ttl,now,releaseParserVersion(e));
 });
 // Reserve archive slots and rotate by last attempt: blocked old releases cannot
 // monopolize the batch, and current releases cannot starve the archive forever.
 const recent=eligible.filter(e=>+now-Date.parse(e.at)<7*86400_000).sort((a,b)=>Number(a.status==='confirmed')-Number(b.status==='confirmed')||b.at.localeCompare(a.at));
 const older=eligible.filter(e=>!recent.includes(e)).sort((a,b)=>(cached.get(a.id)?.attemptedAt||'').localeCompare(cached.get(b.id)?.attemptedAt||'')||b.at.localeCompare(a.at));
 const repairs=older.filter(e=>{const prior=cached.get(e.id);return prior&&(prior.error||prior.version!==releaseParserVersion(e));});
 const archive=older.filter(e=>!repairs.includes(e));
 const ordered=[...recent.slice(0,4),...repairs.slice(0,1),...archive.slice(0,1),...older.filter(e=>e!==repairs[0]&&e!==archive[0]),...recent.slice(4)];
 return [...ordered.filter(e=>e.kind==='EARNINGS').slice(0,4),...ordered.filter(e=>e.kind!=='EARNINGS').slice(0,6)];
}
export function refreshIssues(sources:SourceStatus[],events:MarketEvent[],now:Date){
 const managed=/^(QQQ 公开参考日线|纳斯达克100 ETF 公开参考日线|官方更新 ·|FRED .* 历史|纽约联储经济日历|BEA 日历|Fed 日历|经济日历 ·|新闻与市场情绪|官方事件自动同步|大盘权重股财报日历|后台更新异常)/;
 const sourcesWithIssues=sources.filter(s=>managed.test(s.name)&&s.status!=='ready').map(s=>({name:s.name,status:s.status,message:s.message}));
 const overdue=events.filter(e=>e.status!=='confirmed'&&Date.parse(e.at)<=+now&&Date.parse(e.at)>+now-45*86400_000).map(e=>e.id);
 return {sources:sourcesWithIssues,overdue};
}

/** Retire an unverified imported meeting only when the official year has all eight regular meetings. Confirmed emergency decisions and manual sources stay intact. */
export function reconcileFomcCalendar(events:MarketEvent[],calendar:MarketEvent[]){
 const meetings=calendar.filter(e=>e.kind==='FOMC'),years=new Map<string,Set<string>>();for(const e of meetings){const year=e.at.slice(0,4);if(!years.has(year))years.set(year,new Set());years.get(year)!.add(e.at.slice(0,10));}
 return events.filter(e=>e.kind!=='FOMC'||e.status==='confirmed'||!/^https:\/\/www\.federalreserve\.gov\/newsevents\/pressreleases\/monetary\d{8}a\.htm$/.test(e.sourceUrl)||(years.get(e.at.slice(0,4))?.size||0)<8||years.get(e.at.slice(0,4))!.has(e.at.slice(0,10)));
}
