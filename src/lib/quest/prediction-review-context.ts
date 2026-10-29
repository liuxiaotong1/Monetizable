import {marketDate,sessionFor,latestCompletedDate,previousTradingDate} from './domain';
import type {Bar,MarketEvent} from './types';

export interface ReviewBoss {
 id:string;kind:string;symbol?:string;title:string;at:string;unit:string;
 actual?:number;previous?:number;consensus?:number;consensusKnownBeforeRelease:boolean;
 summary:string[];sourceUrl:string;comparisons:{vsPrevious?:'above'|'below'|'equal';vsConsensus?:'above'|'below'|'equal'};
 historical?:{samples:number;eventDayMeanAbsPct:number;nextDayMeanAbsPct:number};
}
export interface ReviewMarketContext {
 asOf:string;windowStart:string;bosses:ReviewBoss[];
 macroReleases:ReviewBoss[];
 nextBosses:{kind:string;symbol?:string;title:string;at:string}[];
 priceMap:{sessions:number;close:number;ma20?:number;ma60?:number;return5Pct?:number;return20Pct?:number;support5:number;resistance5:number;comparisons:string[]};
}
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const round=(value:number)=>Number(value.toFixed(3));
function releaseComparisons(event:MarketEvent){
 const compare=(reference:unknown):'above'|'below'|'equal'|undefined=>!finite(event.actual)||!finite(reference)?undefined:Math.abs(event.actual-reference)<1e-9?'equal':event.actual>reference?'above':'below';
 return {vsPrevious:compare(event.previous),vsConsensus:compare(event.consensus)};
}

function hasRelease(event:MarketEvent){
 return event.status==='confirmed'&&(finite(event.actual)||!!event.earningsReport||!!event.report?.summary?.length);
}
/** Bound the entire evidence packet to the reviewed session, including historical price samples. */
export function predictionReviewContext(date:string,bars:Bar[],events:MarketEvent[]):ReviewMarketContext {
 const session=sessionFor(new Date(date+'T12:00:00Z'));
 const previous=sessionFor(new Date(session.previousDate+'T12:00:00Z'));
 const cutoff=Date.parse(session.closeAt),start=Date.parse(previous.closeAt);
 const byDate=new Map<string,Bar>();
 for(const bar of bars.filter(b=>b.symbol==='QQQ'&&b.date<=date&&finite(b.close)&&b.close>0).sort((a,b)=>Date.parse(a.fetchedAt)-Date.parse(b.fetchedAt)))byDate.set(bar.date,bar);
 const prices=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
 const latest=prices.at(-1);if(!latest||latest.date!==date)throw Error('PENDING');
 const published=events.filter(e=>hasRelease(e)&&Number.isFinite(Date.parse(e.at))&&Date.parse(e.at)<=cutoff);
 const unique=[...new Map(published.map(e=>[e.kind+':'+(e.symbol||'')+':'+e.at+':'+e.title,e])).values()];
 function boss(event:MarketEvent):ReviewBoss {
  const dates=new Set([...event.releaseHistory?.map(r=>r.date.slice(0,10))||[],...event.qqqReactions?.map(r=>r.date)||[],...unique.filter(e=>e.kind===event.kind&&e.symbol===event.symbol).map(e=>marketDate(new Date(e.at)))]);
  const samples=[...dates].filter(d=>d<date).sort().map(d=>{
   const i=prices.findIndex(b=>b.date===d),at=prices[i],before=prices[i-1],after=prices[i+1];
   if(i<1||!at||!before||!after||after.date>=date||after.date!==sessionFor(new Date(d+'T12:00:00Z')).nextDate)return null;
   return {event:Math.abs((at.close/before.close-1)*100),next:Math.abs((after.close/at.close-1)*100)};
  }).filter((x):x is {event:number;next:number}=>!!x).slice(-12);
  const values=event.calendarValues;
  const consensusKnownBeforeRelease=finite(event.consensus)&&!!values?.fetchedAt&&Date.parse(values.fetchedAt)<=Date.parse(event.at);
  return {id:event.id,kind:event.kind,symbol:event.symbol,title:event.title,at:event.at,unit:event.unit,actual:event.actual,previous:event.previous,consensus:event.consensus,consensusKnownBeforeRelease,
   summary:[...(event.report?.summary||[]).slice(0,3).map(s=>s.slice(0,500)),...(event.earningsReport?[JSON.stringify({period:event.earningsReport.period,revenueUsd:event.earningsReport.revenueUsd,gaapDilutedEps:event.earningsReport.gaapDilutedEps,netIncomeUsd:event.earningsReport.netIncomeUsd})]:[])],
   sourceUrl:event.sourceUrl,comparisons:releaseComparisons(event),historical:samples.length>=3?{samples:samples.length,eventDayMeanAbsPct:round(samples.reduce((n,s)=>n+s.event,0)/samples.length),nextDayMeanAbsPct:round(samples.reduce((n,s)=>n+s.next,0)/samples.length)}:undefined};
 }
 const tail5=prices.slice(-5),mean=(n:number)=>prices.length>=n?round(prices.slice(-n).reduce((sum,b)=>sum+b.close,0)/n):undefined;
 const change=(n:number)=>prices.length>n?round((latest.close/prices[prices.length-n-1].close-1)*100):undefined;
 const prior5=prices.slice(-6,-1),levelBars=prior5.length?prior5:tail5;
 const support5=round(Math.min(...levelBars.map(b=>b.low))),resistance5=round(Math.max(...levelBars.map(b=>b.high))),ma20=mean(20),ma60=mean(60);
 const relation=(a:number,b:number)=>a>b?'ABOVE':a<b?'BELOW':'EQUAL TO';
 const comparisons=[
  'Session high '+latest.high+' is '+relation(latest.high,resistance5)+' the preceding-five-session resistance '+resistance5+'.',
  'Session low '+latest.low+' is '+relation(latest.low,support5)+' the preceding-five-session support '+support5+'.',
  ...(ma20===undefined?[]:['Close '+latest.close+' is '+relation(latest.close,ma20)+' MA20 '+ma20+'.']),
  ...(ma60===undefined?[]:['Close '+latest.close+' is '+relation(latest.close,ma60)+' MA60 '+ma60+'.'])
 ];

 return {asOf:session.closeAt,windowStart:previous.closeAt,
  bosses:unique.filter(e=>Date.parse(e.at)>start).sort((a,b)=>a.at.localeCompare(b.at)).map(boss),
  macroReleases:unique.filter(e=>e.kind!=='EARNINGS'&&Date.parse(e.at)>=cutoff-60*86400000).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,10).map(boss),
  nextBosses:events.filter(e=>e.status!=='unconfirmed'&&Date.parse(e.at)>cutoff&&Date.parse(e.at)<=cutoff+7*86400000).sort((a,b)=>a.at.localeCompare(b.at)).slice(0,8).map(e=>({kind:e.kind,symbol:e.symbol,title:e.title,at:e.at})),
  priceMap:{sessions:prices.length,close:latest.close,ma20,ma60,return5Pct:change(5),return20Pct:change(20),support5,resistance5,comparisons}
 };
}


export interface CurrentReviewBoss extends ReviewBoss {
 scope:'new-release'|'carryover';
 releaseReaction?:{date:string;returnPct:number};
}
export interface CurrentReviewContext {
 asOf:string;marketDate:string;priceAsOf:string;
 priceMap:ReviewMarketContext['priceMap'];priceReturnPct:number;
 bosses:CurrentReviewBoss[];
 nextBosses:ReviewMarketContext['nextBosses'];
}
/** Current expectations refresh independently of the historical judgment score. */
export function currentReviewContext(now:Date,bars:Bar[],events:MarketEvent[]):CurrentReviewContext {
 const today=marketDate(now),complete=latestCompletedDate(now);
 const priceAsOf=bars.filter(b=>b.symbol==='QQQ'&&b.date<=complete&&finite(b.close)&&b.close>0).map(b=>b.date).sort().at(-1);
 if(!priceAsOf)throw Error('PENDING');
 const snapshot=predictionReviewContext(priceAsOf,bars,events);
 const published=events.filter(e=>hasRelease(e)&&Date.parse(e.at)<=+now).sort((a,b)=>b.at.localeCompare(a.at));
 const unique=[...new Map([...published].reverse().map(e=>[e.kind+':'+(e.symbol||'')+':'+marketDate(new Date(e.at))+':'+(e.kind==='ISM'?e.title:''),e])).values()].sort((a,b)=>b.at.localeCompare(a.at));
 const latestMacro=new Map<string,MarketEvent>();
 for(const e of unique)if(['FOMC','CPI','PCE','NFP','GDP'].includes(e.kind)&&(e.kind!=='FOMC'||finite(e.actual))&&!latestMacro.has(e.kind))latestMacro.set(e.kind,e);
 let earningsFrom=today;for(let n=0;n<5;n++)earningsFrom=previousTradingDate(earningsFrom);
 const selected=unique.filter(e=>{
  const released=marketDate(new Date(e.at));
  if(released===today)return true;
  if(e.kind==='EARNINGS')return released>=earningsFrom;
  const anchor=latestMacro.get(e.kind);
  return anchor?.id===e.id&&+now-Date.parse(e.at)<(e.kind==='FOMC'?180:60)*86400000;
 }).sort((a,b)=>Number(b.kind==='FOMC')-Number(a.kind==='FOMC')||b.at.localeCompare(a.at));
 const snapshots=new Map([...snapshot.bosses,...snapshot.macroReleases].map(b=>[b.id,b]));
 const barMap=new Map<string,Bar>();for(const b of [...bars].filter(b=>b.symbol==='QQQ'&&b.date<=priceAsOf).sort((a,b)=>a.fetchedAt.localeCompare(b.fetchedAt)))barMap.set(b.date,b);
 const bosses=selected.map(e=>{
  const known=snapshots.get(e.id),date=marketDate(new Date(e.at)),releaseSession=sessionFor(new Date(date+'T12:00:00Z'));
  const reactionDate=Date.parse(e.at)>Date.parse(releaseSession.closeAt)?releaseSession.nextDate:date;
  const reactionBar=barMap.get(reactionDate),prior=barMap.get(previousTradingDate(reactionDate));
  const fallback:ReviewBoss={id:e.id,kind:e.kind,symbol:e.symbol,title:e.title,at:e.at,unit:e.unit,actual:e.actual,previous:e.previous,consensus:e.consensus,consensusKnownBeforeRelease:finite(e.consensus)&&!!e.calendarValues?.fetchedAt&&Date.parse(e.calendarValues.fetchedAt)<=Date.parse(e.at),summary:(e.report?.summary||[]).slice(0,3),sourceUrl:e.sourceUrl,comparisons:releaseComparisons(e)};
  return {...(known||fallback),scope:date===today?'new-release' as const:'carryover' as const,
   releaseReaction:reactionBar&&prior&&prior.close>0?{date:reactionDate,returnPct:round((reactionBar.close/prior.close-1)*100)}:undefined};
 });
 const close=barMap.get(priceAsOf)!,prior=barMap.get(previousTradingDate(priceAsOf));
 return {asOf:now.toISOString(),marketDate:today,priceAsOf,priceMap:snapshot.priceMap,priceReturnPct:prior?round((close.close/prior.close-1)*100):0,bosses,
  nextBosses:events.filter(e=>e.status!=='unconfirmed'&&Date.parse(e.at)>+now&&Date.parse(e.at)<=+now+7*86400000).sort((a,b)=>a.at.localeCompare(b.at)).slice(0,8).map(e=>({kind:e.kind,symbol:e.symbol,title:e.title,at:e.at}))};
}
