import {marketDate} from './domain';
import {freeBarsNeedRefresh} from './free-market';
import {cacheDue,releaseCandidates,type CacheClock} from './refresh-policy';
import type {Bar,MarketEvent} from './types';

/** Quiet periods reuse the last assembled feed. A fresh release still rebuilds within its usual retry window. */
export const FULL_ASSEMBLE_MS=15*60*1000;
const HISTORY_KINDS=['CPI','NFP','PCE','GDP','FOMC','CLAIMS','CONFIDENCE','TRADE','JOLTS','RETAIL','PPI'] as const;
export interface RefreshClock {key:string;version?:number;attemptedAt?:string;error?:string}
function asClock(clock:RefreshClock|undefined):CacheClock|undefined {
 if(!clock?.attemptedAt||!Number.isFinite(Date.parse(clock.attemptedAt)))return;
 const version=Number(clock.version);
 return {version:Number.isFinite(version)?version:undefined,attemptedAt:clock.attemptedAt,error:clock.error||undefined};
}
export function calendarMonths(now:Date){
 const first=new Date(marketDate(now).slice(0,7)+'-01T12:00:00Z');
 return [0,1].map(offset=>{const date=new Date(first);date.setUTCMonth(date.getUTCMonth()+offset);return date.toISOString().slice(0,7);});
}
export function scheduledRefreshMode(input:{now:Date;snapshotUpdatedAt?:string;barsFetchedAt?:string;lastBarDate?:string;clocks:RefreshClock[];events:MarketEvent[]}){
 const byKey=new Map(input.clocks.map(clock=>[clock.key,clock]));
 const due=(key:string,ttl:number,version=1)=>cacheDue(asClock(byKey.get(key)),ttl,input.now,version);
 const newsDue=due('news-native',5*60_000),valuesDue=due('event-values-native',5*60_000);
 const full=()=>({mode:'full' as const,newsDue,valuesDue});
 if(!input.snapshotUpdatedAt||input.now.getTime()-Date.parse(input.snapshotUpdatedAt)>=FULL_ASSEMBLE_MS)return full();
 const bars=input.barsFetchedAt?{fetchedAt:input.barsFetchedAt,bars:input.lastBarDate?[{symbol:'QQQ',date:input.lastBarDate,open:0,high:0,low:0,close:0,volume:0,source:'',fetchedAt:input.barsFetchedAt} satisfies Bar]:[]}:undefined;
 if(freeBarsNeedRefresh(bars,input.now))return full();
 for(const month of calendarMonths(input.now))if(due(`calendar-native:${month}`,6*3600_000))return full();
 if(due('bea-calendar-native',6*3600_000)||due('fed-calendar-native',6*3600_000,2))return full();
 if(due(`major-earnings:${marketDate(input.now).slice(0,7)}:${Math.floor(+input.now/604800000)}`,6*3600_000,2))return full();
 for(const kind of HISTORY_KINDS){
  const recent=input.events.some(event=>event.kind===kind&&Date.parse(event.at)<=+input.now&&+input.now-Date.parse(event.at)<24*3600_000);
  if(due(`history-native:${kind}`,recent?3600_000:24*3600_000))return full();
 }
 const cached=new Map<string,CacheClock>();
 for(const clock of input.clocks){if(!clock.key.startsWith('release-native:'))continue;const parsed=asClock(clock);if(parsed)cached.set(clock.key.slice('release-native:'.length),parsed);}
 const urgent=releaseCandidates(input.events,cached,input.now).some(event=>+input.now-Date.parse(event.at)<24*3600_000);
 return urgent?full():{mode:'light' as const,newsDue,valuesDue};
}
