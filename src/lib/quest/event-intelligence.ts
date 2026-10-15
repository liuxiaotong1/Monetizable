import { load } from "cheerio";
export const INTEL_SOURCES = [
  {id:"polymarket",name:"Polymarket",url:"https://gamma-api.polymarket.com/public-search?q=Fed&events_status=active&limit_per_type=10",home:"https://polymarket.com/",note:"预测市场价格隐含概率，受流动性与参与者影响；不是官方数据或经济学家共识。"},
  {id:"ft",name:"Financial Times",url:"https://www.ft.com/rss/home",home:"https://www.ft.com/",note:"公开新闻标题；完整报道可能需要 FT 订阅。"},
  {id:"marketwatch",name:"MarketWatch",url:"https://feeds.marketwatch.com/marketwatch/topstories/",home:"https://www.marketwatch.com/",note:"公开新闻标题；点击原文阅读，不将媒体报道自动当作官方公布值。"},
] as const;
export type IntelId = typeof INTEL_SOURCES[number]["id"];
export interface IntelItem { id:string;title:string;url:string;publishedAt?:string;endAt?:string;outcomes?:{label:string;probability:number}[] }
export interface IntelSource {id:IntelId;name:string;home:string;note:string;status:"ready"|"error"|"empty";attemptedAt:string;fetchedAt?:string;message:string;items:IntelItem[]}
export interface EventIntelligence {sources:IntelSource[]}
const relevant=/\b(fed|federal reserve|fomc|inflation|cpi|pce|jobs|employment|payroll|recession|gdp|interest rate|nasdaq|qqq|nvidia|apple|microsoft|amazon|meta|tesla|alphabet|earnings|stock|market|economy|tariff|bond|yield|ai)\b/i;
function safeLink(value:string, hosts:string[]) {try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&hosts.some(h=>u.hostname===h||u.hostname.endsWith(`.${h}`))?u.href:undefined;}catch{return undefined;}}
function time(value:unknown){return typeof value==="string"&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():undefined;}
export function parseIntelligence(id:IntelId,raw:string,now=new Date()):IntelItem[]{
 if(raw.length>2_000_000)throw Error("来源响应过大");
 if(id==="polymarket"){
  const data=JSON.parse(raw);if(!Array.isArray(data.events))throw Error("预测市场响应格式无效");
  const result:IntelItem[]=[];
  for(const event of data.events)for(const market of Array.isArray(event.markets)?event.markets:[]){
   const endAt=time(market.endDate||event.endDate),title=String(market.question||event.title||"");
   if(market.closed!==false||market.active!==true||!endAt||endAt<=now.toISOString()||!relevant.test(title)||!market.slug||!/^[-a-zA-Z0-9]+$/.test(market.slug))continue;
   let labels,prices;try{labels=typeof market.outcomes==="string"?JSON.parse(market.outcomes):market.outcomes;prices=typeof market.outcomePrices==="string"?JSON.parse(market.outcomePrices):market.outcomePrices;}catch{continue;}
   if(!Array.isArray(labels)||!Array.isArray(prices)||labels.length!==prices.length||labels.length<2)continue;
   const outcomes=labels.map((label,i)=>({label:String(label).slice(0,80),probability:prices[i]===null||prices[i]===""?NaN:Number(prices[i])}));
   if(outcomes.some(o=>!Number.isFinite(o.probability)||o.probability<0||o.probability>1)||Math.abs(outcomes.reduce((s,o)=>s+o.probability,0)-1)>.1)continue;
   result.push({id:String(market.id),title:title.slice(0,300),url:`https://polymarket.com/market/${market.slug}`,endAt,outcomes});
  }return [...new Map(result.map(item=>[item.id,item])).values()].slice(0,8);
 }
 const $=load(raw,{xml:true});if(!$("rss channel").length)throw Error("新闻源不是有效 RSS");
 const result:IntelItem[]=[];$("item").each((_,el)=>{const row=$(el),title=row.find("title").first().text().trim(),url=safeLink(row.find("link").first().text().trim(),[id==="ft"?"ft.com":"marketwatch.com"]),publishedAt=time(row.find("pubDate").first().text());
  if(url&&title&&relevant.test(title)&&publishedAt&&Date.parse(publishedAt)<=now.getTime()+60_000&&Date.parse(publishedAt)>now.getTime()-7*86400000)result.push({id:url,title:title.slice(0,300),url,publishedAt});
 });return [...new Map(result.map(item=>[item.id,item])).values()].sort((a,b)=>b.publishedAt!.localeCompare(a.publishedAt!)).slice(0,8);
}
export async function fetchIntelligence(previous:EventIntelligence={sources:[]},now=new Date(),fetcher:typeof fetch=fetch):Promise<EventIntelligence>{
 const sources=await Promise.all(INTEL_SOURCES.map(async spec=>{const prior=previous.sources.find(s=>s.id===spec.id);const base={id:spec.id,name:spec.name,home:spec.home,note:spec.note,attemptedAt:now.toISOString()};try{
  const r=await fetcher(spec.url,{headers:{"User-Agent":"QQQQuest/1.0 personal research","Accept":"application/json, application/rss+xml, application/xml"},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`来源返回 HTTP ${r.status}`);
  const items=parseIntelligence(spec.id,await r.text(),now);return {...base,status:items.length?"ready" as const:"empty" as const,fetchedAt:now.toISOString(),items,message:items.length?`取得 ${items.length} 条公开记录`:"本次未返回近期相关内容"};
 }catch(error){return {...base,status:"error" as const,items:(prior?.items||[]).filter(item=>item.endAt?item.endAt>now.toISOString():Boolean(item.publishedAt&&Date.parse(item.publishedAt)>+now-7*86400000)),fetchedAt:prior?.fetchedAt,message:`${error instanceof Error?error.message:"连接失败"}；${prior?.items.length?"保留上次内容，请注意取得时间":"尚无可验证内容"}`};}}));return {sources};
}
