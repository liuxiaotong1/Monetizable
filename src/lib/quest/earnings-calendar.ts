import {marketDate,nyTimeToUtc,addDays} from './domain';
import type {MarketEvent} from './types';
/** Curated market-moving large-cap watchlist; no small-cap calendar flooding or invented weights. */
export const majorEarningsSymbols=new Set(['AAPL','MSFT','NVDA','AMZN','GOOGL','GOOG','META','AVGO','TSLA','SPCX','AMD','NFLX','ORCL','PLTR','MU','COST','WMT','JPM','BRK.B']);
export type EarningsTiming='after-close'|'before-open'|'unknown';
export interface EarningsSchedule {symbol:string;name:string;date:string;timing:EarningsTiming;sourceUrl:string;sourceName:string;callAt?:string;consensus?:number;verified?:boolean}
// Official notices checked 2026-10-21. Fixed announcements expire with their actual dates.
export const verifiedEarnings:EarningsSchedule[]=[
 {symbol:'META',name:'Meta',date:'2026-10-21',timing:'after-close',callAt:nyTimeToUtc('2026-10-21','16:30'),sourceName:'Meta Investor Relations',sourceUrl:'https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-to-Announce-Third-Quarter-2026-Results/default.aspx',verified:true},
 {symbol:'TSLA',name:'Tesla',date:'2026-10-21',timing:'after-close',callAt:nyTimeToUtc('2026-10-21','17:30'),sourceName:'Tesla Investor Relations',sourceUrl:'https://ir.tesla.com/press-release/tesla-third-quarter-2026-production-deliveries-and-deployments',verified:true},
 {symbol:'SPCX',name:'SpaceX',date:'2026-10-20',timing:'after-close',callAt:nyTimeToUtc('2026-10-20','16:30'),sourceName:'SpaceX Investor Relations',sourceUrl:'https://ir.spacex.com/updates/releases-details/2026/SpaceX-to-Post-Third-Quarter-2026-Results-and-Host-Webcast-on-October-20-2026-2026-QssQGye3im/default.aspx',verified:true},
];
export function earningsDates(now:Date){const date=marketDate(now),day=new Date(date+'T12:00:00Z').getUTCDay(),start=addDays(date,-((day+6)%7));return Array.from({length:14},(_,i)=>addDays(start,i)).filter(d=>![0,6].includes(new Date(d+'T12:00:00Z').getUTCDay()));}
export function parseEarningsCalendar(raw:unknown,date:string):EarningsSchedule[]{
 const data=(raw as {data?:{rows?:unknown[]}})?.data;if(!Array.isArray(data?.rows))throw Error('Earnings calendar rows unavailable');
 return data.rows.flatMap(value=>{const row=value as Record<string,unknown>,inputSymbol=String(row.symbol||'').toUpperCase(),symbol=inputSymbol==='GOOG'?'GOOGL':inputSymbol;if(!majorEarningsSymbols.has(symbol))return [];
 const timing=/after/i.test(String(row.time))?'after-close':/pre|before/i.test(String(row.time))?'before-open':'unknown',rawEPS=String(row.epsForecast??''),eps=Number(rawEPS.replace(/[$,]/g,''));
 return [{symbol,name:String(row.name||symbol),date,timing,sourceUrl:`https://www.nasdaq.com/market-activity/stocks/${symbol.toLowerCase()}/earnings`,sourceName:'Nasdaq earnings calendar',...(rawEPS.trim()&&!['--','N/A'].includes(rawEPS)&&Number.isFinite(eps)?{consensus:eps}:{})}];
 });
}
export function earningsEvents(rows:EarningsSchedule[],now:Date):MarketEvent[]{
 const selected=new Map<string,EarningsSchedule>();for(const row of rows){if(majorEarningsSymbols.has(row.symbol)&&/^\d{4}-\d{2}-\d{2}$/.test(row.date))selected.set(`${row.symbol}:${row.date}`,row);}
 for(const row of verifiedEarnings){if(row.date>=addDays(marketDate(now),-14)&&row.date<=addDays(marketDate(now),45)){for(const [key,prior]of selected)if(prior.symbol===row.symbol&&Math.abs(Date.parse(prior.date)-Date.parse(row.date))<7*86400000)selected.delete(key);selected.set(`${row.symbol}:${row.date}`,{...row,consensus:rows.find(r=>r.symbol===row.symbol&&r.date===row.date)?.consensus});}}
 return [...selected.values()].map(row=>({id:`earnings-${row.symbol.toLowerCase()}-${row.date}`,kind:'EARNINGS',symbol:row.symbol,title:`${row.symbol} · ${row.name} 财报`,at:nyTimeToUtc(row.date,row.timing==='before-open'?'08:00':row.timing==='after-close'?'16:00':'23:59'),earningsTiming:row.timing,earningsCallAt:row.callAt,calendarVerified:!!row.verified,status:row.date<marketDate(now)?'pending':'scheduled',consensus:row.consensus,consensusSource:row.consensus===undefined?undefined:'Nasdaq earnings calendar',unit:'USD / EPS',description:'仅追踪大盘影响较大的公司。财报发布时段与电话会议时间分开；日期以公司公告为准。',analogy:'公司的季度成绩单，指引是下一关的提示。',impact:'重点观察收入、利润率、现金流和指引，以及市场此前已计入价格的预期。',scenarios:['盈利超预期也可能已被计价；结合指引与反应。','先核实口径，再比较共识，不把标题当入场信号。'],sourceUrl:row.sourceUrl,sourceName:row.sourceName,fetchedAt:now.toISOString(),history:[]}));
}
export async function fetchMajorEarnings(now:Date,fetcher:typeof fetch=fetch){
 const results=await Promise.allSettled(earningsDates(now).map(async date=>{const r=await fetcher(`https://api.nasdaq.com/api/calendar/earnings?date=${date}`,{headers:{'User-Agent':'Mozilla/5.0 Monetizable/1.0','Accept':'application/json'},signal:AbortSignal.timeout(6500)});if(!r.ok)throw Error(`Calendar HTTP ${r.status}`);return parseEarningsCalendar(await r.json(),date);}));
 const success=results.filter(r=>r.status==='fulfilled');if(!success.length)throw Error('Large-cap calendar temporarily unavailable');return earningsEvents(success.flatMap(r=>r.value),now);
}
export function earningsTimingLabel(event:MarketEvent,locale:'en'|'fr'|'zh'){
 const timing=event.earningsTiming;if(!timing)return '';
 return {en:{'after-close':'After market close · ET','before-open':'Before market open · ET',unknown:'Release time not announced'},fr:{'after-close':'Après la clôture · ET','before-open':'Avant l’ouverture · ET',unknown:'Horaire non annoncé'},zh:{'after-close':'美东盘后','before-open':'美东盘前',unknown:'具体时间尚未公布'}}[locale][timing];
}
