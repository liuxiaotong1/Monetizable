import type {EventIntelligence} from './event-intelligence';
export interface ReviewMarketSignals {
 asOf:string;
 headlines:{title:string;source:string;publishedAt:string;url:string}[];
 expectations:{title:string;source:string;endAt:string;url:string;outcomes:{label:string;probability:number}[]}[];
}
/** Headlines and market-implied expectations are dated context, separate from official releases. */
export function reviewMarketSignals(input:unknown,now:Date):ReviewMarketSignals {
 const sources=(input as EventIntelligence|undefined)?.sources;
 const result:ReviewMarketSignals={asOf:now.toISOString(),headlines:[],expectations:[]};
 if(!Array.isArray(sources))return result;
 for(const source of sources){
  if(!['ft','marketwatch','polymarket'].includes(source.id)||source.status!=='ready'||!source.fetchedAt||!Number.isFinite(Date.parse(source.fetchedAt))||Date.parse(source.fetchedAt)>+now||+now-Date.parse(source.fetchedAt)>12*3600000||!Array.isArray(source.items))continue;
  for(const item of source.items){
   if(typeof item.title!=='string'||typeof item.url!=='string')continue;
   if(source.id==='polymarket'){
    const outcomes=item.outcomes;
    if(+now-Date.parse(source.fetchedAt)>6*3600000||!item.endAt||!Number.isFinite(Date.parse(item.endAt))||Date.parse(item.endAt)<=+now||!Array.isArray(outcomes)||outcomes.length<2||outcomes.length>6||outcomes.some(o=>typeof o.label!=='string'||!Number.isFinite(o.probability)||o.probability<0||o.probability>1)||Math.abs(outcomes.reduce((s,o)=>s+o.probability,0)-1)>.1)continue;
    result.expectations.push({title:item.title.slice(0,300),source:source.name,endAt:item.endAt,url:item.url,outcomes:outcomes.map(o=>({label:o.label.slice(0,80),probability:o.probability}))});
   }else if(item.publishedAt&&Number.isFinite(Date.parse(item.publishedAt))&&Date.parse(item.publishedAt)<=+now&&+now-Date.parse(item.publishedAt)<=48*3600000){
    result.headlines.push({title:item.title.slice(0,300),source:source.name,publishedAt:item.publishedAt,url:item.url});
   }
  }
 }
 result.headlines=[...new Map(result.headlines.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).map(item=>[item.title.toLowerCase().trim(),item])).values()].slice(0,8);
 result.expectations=[...new Map(result.expectations.map(item=>[item.url,item])).values()].slice(0,4);
 return result;
}
