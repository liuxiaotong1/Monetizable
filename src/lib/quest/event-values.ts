import { load } from "cheerio";
import { marketDate } from "./domain";
import type { MarketEvent } from "./types";
export const EVENT_VALUES_URL="https://tradingeconomics.com/united-states/calendar";
export interface CalendarValue {date:string;metric:string;unit:string;previous?:number;previousOriginal?:number;consensus?:number;forecast?:number;reported?:number;reference?:string;sourceUrl:string;fetchedAt:string}
export interface EventValuesFeed {fetchedAt:string;rows:CalendarValue[];status:"ready"|"error";message:string;attemptedAt:string}
const specs:Record<string,{kind:string;unit:string;scale:number;percent?:boolean}>={
 "inflation rate yoy":{kind:"CPI",unit:"% 同比，未季调",scale:1,percent:true},
 "non farm payrolls":{kind:"NFP",unit:"千人，月度净新增非农就业",scale:.001},
 "nonfarm payrolls":{kind:"NFP",unit:"千人，月度净新增非农就业",scale:.001},
 "pce price index yoy":{kind:"PCE",unit:"% 同比",scale:1,percent:true},
 "gdp growth rate qoq adv":{kind:"GDP",unit:"% 季环比年化",scale:1,percent:true},
 "gdp growth rate qoq 2nd":{kind:"GDP",unit:"% 季环比年化",scale:1,percent:true},
 "gdp growth rate qoq final":{kind:"GDP",unit:"% 季环比年化",scale:1,percent:true},
 "fed interest rate decision":{kind:"FOMC",unit:"% 目标利率区间上限",scale:1,percent:true},
 "initial jobless claims":{kind:"CLAIMS",unit:"人，季调初次申请",scale:1},
 "ism services pmi":{kind:"ISM",unit:"指数",scale:1},
 "ism manufacturing pmi":{kind:"ISM",unit:"指数",scale:1},
 "michigan consumer sentiment prel":{kind:"CONFIDENCE",unit:"指数",scale:1},
 "michigan consumer sentiment final":{kind:"CONFIDENCE",unit:"指数",scale:1},
 "retail sales mom":{kind:"RETAIL",unit:"% 环比",scale:1,percent:true},
 "balance of trade":{kind:"TRADE",unit:"十亿美元，贸易差额",scale:1e-9},
 "jolts job openings":{kind:"JOLTS",unit:"千人，职位空缺",scale:.001},
 "ppi yoy":{kind:"PPI",unit:"% 同比",scale:1,percent:true},
};
export function calendarNumber(raw:string,spec:{scale:number;percent?:boolean}){
 const value=raw.trim().replace(/[$,\s]/g,"").replace(/−/g,"-");
 const m=value.match(/^([+-]?\d+(?:\.\d+)?)([%KMB])?$/i);if(!m||spec.percent&&m[2]!=="%"||!spec.percent&&m[2]==="%")return undefined;
 const multiplier=({K:1e3,M:1e6,B:1e9} as Record<string,number>)[m[2]?.toUpperCase()]||1;
 return Math.round(Number(m[1])*multiplier*spec.scale*1e6)/1e6;
}
export function parseEventValues(html:string,fetchedAt:string):EventValuesFeed{
 if(html.length>4_000_000||!Number.isFinite(Date.parse(fetchedAt)))throw Error("经济日历响应无效");
 const $=load(html),rows:CalendarValue[]=[];
 $('tr[data-country="united states"][data-event]').each((_,el)=>{
  const row=$(el),metric=(row.attr("data-event")||"").toLowerCase().trim(),spec=specs[metric];if(!spec)return;
  const date=row.children("td").first().attr("class")?.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  const href=row.attr("data-url");if(!date||!href?.startsWith("/united-states/")||href.includes(".."))return;
  const get=(id:string)=>calendarNumber(row.find(`[id='${id}']`).first().text(),spec);
  const previous=get("previous"),consensus=get("consensus"),forecast=get("forecast"),reported=get("actual");
  if([previous,consensus,forecast,reported].every(v=>v===undefined))return;
  const original=row.find("[id='revised']").attr("title")?.match(/^Previous revised from (.+)$/i)?.[1];
  rows.push({date,metric,unit:spec.unit,previous,previousOriginal:original?calendarNumber(original,spec):undefined,consensus,forecast,reported,reference:row.find(".calendar-reference").first().text().trim(),sourceUrl:new URL(href,EVENT_VALUES_URL).href,fetchedAt});
 });
 if(!rows.length)throw Error("公开日历未返回可匹配的前值与预测");
 return {fetchedAt,attemptedAt:fetchedAt,status:"ready",message:`已取得 ${rows.length} 条有明确口径的公开日历记录`,rows};
}
export function applyEventValues(events:MarketEvent[],feed?:EventValuesFeed):MarketEvent[]{
 if(!feed)return events;
 return events.map(event=>{
  if(event.status==="unconfirmed"||!Number.isFinite(Date.parse(event.at)))return event;
  const date=marketDate(new Date(event.at));
  const candidates=feed.rows.filter(row=>row.date===date&&specs[row.metric]?.kind===event.kind);
  const row=candidates.find(row=>event.kind!=="ISM"||(/服务/.test(event.title)?row.metric==="ism services pmi":row.metric==="ism manufacturing pmi"));
  if(!row)return event;
  // Calendar-reported actuals remain distinct from official, immutable releases.
  return {...event,calendarValues:row,previous:event.previous??row.previous,consensus:row.consensus,consensusSource:row.consensus===undefined?undefined:"Trading Economics · 经济学家调查共识"};
 });
}
