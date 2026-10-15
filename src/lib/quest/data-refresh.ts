import 'server-only';
import {enrichReleaseMetrics} from './bls-api';
import {database} from '@/lib/account/db';
import {fetchOfficialRelease} from './official-release';
import {parseEventValues,applyEventValues,EVENT_VALUES_URL,type EventValuesFeed} from './event-values';
import {fetchIntelligence,type EventIntelligence} from './event-intelligence';
import {marketDate,nyTimeToUtc,addDays} from './domain';
import {load} from 'cheerio';
import type {MarketEvent,QuestState,SourceStatus,HistoryPoint} from './types';
type Attempt={attemptedAt:string;status:'ready'|'error';message:string};
interface Cached<T>{version?:number;body:T;attemptedAt:string;lastSuccess?:string;error?:string}
const inflight=new Map<string,Promise<unknown>>();
/** A DB lease prevents concurrent visitors/cron runs from duplicating upstream requests. */
async function cached<T>(key:string,ttl:number,loader:()=>Promise<T>,empty:T,now:Date,version=1):Promise<Cached<T>>{
 const pool=database(),prior=(await pool.query('SELECT body FROM quest_shared_data WHERE key=$1',[key])).rows[0]?.body as Cached<T>|undefined;
 if(prior?.version===version&&now.getTime()-Date.parse(prior.attemptedAt)<ttl)return prior;
 if(inflight.has(key))return await inflight.get(key) as Cached<T>;
 const operation=(async()=>{const client=await pool.connect();let locked=false;
  try{locked=(await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS acquired',['refresh:'+key])).rows[0].acquired;if(!locked)return prior||{body:empty,attemptedAt:now.toISOString(),error:'后台正在同步'};
   const recent=(await client.query('SELECT body FROM quest_shared_data WHERE key=$1',[key])).rows[0]?.body as Cached<T>|undefined;
   if(recent?.version===version&&now.getTime()-Date.parse(recent.attemptedAt)<ttl)return recent;
   let result:Cached<T>;try{result={version,body:await loader(),attemptedAt:now.toISOString(),lastSuccess:now.toISOString()};}catch(error){result={version,body:recent?.body||prior?.body||empty,attemptedAt:now.toISOString(),lastSuccess:recent?.lastSuccess||prior?.lastSuccess,error:error instanceof Error?error.message:'上游暂不可用'};}
   await client.query('INSERT INTO quest_shared_data(key,body) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET body=EXCLUDED.body,updated_at=now()',[key,JSON.stringify(result)]);return result;
  }finally{if(locked)await client.query('SELECT pg_advisory_unlock(hashtext($1))',['refresh:'+key]);client.release();}
 })();inflight.set(key,operation);try{return await operation;}finally{inflight.delete(key);}
}
function status(name:string,result:Cached<unknown>,message:string):SourceStatus{return {name,status:result.error?'delayed':'ready',message:result.error?`${result.error}；保留上次成功内容，自动重试。`:message,lastSuccess:result.lastSuccess};}
function setSource(state:QuestState,source:SourceStatus){state.sources=state.sources.filter(s=>s.name!==source.name);state.sources.push(source);}
export function publicationVersion(previous:MarketEvent|undefined,event:MarketEvent){
 const history=previous?.releaseHistory||event.releaseHistory||[];
 if(event.actual===undefined)return history;
 const last=history.at(-1);
 if(last&&last.actual===event.actual&&last.previous===event.previous&&last.revised===event.revised)return history;
 return [...history,{date:marketDate(new Date(event.at)),period:event.period,actual:event.actual,previous:event.previous,revised:event.revised,vintage:event.fetchedAt!,sourceUrl:event.sourceUrl,fetchedAt:event.fetchedAt!,version:(last?.version||0)+1}].slice(-24);
}
const calendarKinds:[RegExp,MarketEvent['kind']][]=[[/Consumer Price Index/i,'CPI'],[/Producer Price Index/i,'PPI'],[/Employment Situation/i,'NFP'],[/Initial Claims/i,'CLAIMS'],[/ISM Non-Manufacturing/i,'ISM'],[/ISM Manufacturing/i,'ISM'],[/Michigan Consumer Survey/i,'CONFIDENCE'],[/Retail Sales/i,'RETAIL'],[/Trade balance/i,'TRADE'],[/Job Openings|JOLTS/i,'JOLTS'],[/Gross Domestic Product/i,'GDP'],[/Personal Income and the PCE/i,'PCE']];
export function parseCalendar(html:string,month:string,templates:MarketEvent[],url:string,now:Date):MarketEvent[]{
 const $=load(html);const results:MarketEvent[]=[];
 $('td').each((_,el)=>{const text=$(el).text().replace(/\s+/g,' ').trim();const day=text.match(/^(\d{2})\b/);if(!day)return;
  for(const [pattern,kind] of calendarKinds){const found=text.match(new RegExp(pattern.source+'\\s*\\((\\d{2}:\\d{2})\\)','i'));if(!found)continue;const date=`${month}-${day[1]}`,at=nyTimeToUtc(date,found[1]);const template=templates.find(e=>e.kind===kind&&(kind!=='ISM'||/服务/.test(e.title)===/Non-Manufacturing/i.test(found[0])));if(!template)continue;
   const existing=templates.find(e=>e.kind===kind&&marketDate(new Date(e.at))===date&&(kind!=='ISM'||/服务/.test(e.title)===/Non-Manufacturing/i.test(found[0])));
   results.push(existing?{...existing,at}:{...template,id:`${kind.toLowerCase()}-${date}`,at,status:Date.parse(at)<now.getTime()?'pending':'scheduled',actual:undefined,previous:undefined,revised:undefined,consensus:undefined,calendarValues:undefined,report:undefined,releaseHistory:[],sourceUrl:url,sourceName:'纽约联储 · 官方经济发布日历',fetchedAt:now.toISOString(),period:undefined});
  }
 });if(!results.length)throw Error('官方日历未返回可解析的发布日期');return results;
}
async function text(url:string){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error(`来源 HTTP ${r.status}`);const body=await r.text();if(body.length>4_000_000)throw Error('来源响应过大');return body;}
async function refreshCalendars(state:QuestState,now:Date){
 const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];const first=new Date(marketDate(now).slice(0,7)+'-01T12:00:00Z');
 for(const offset of [0,1]){const d=new Date(first);d.setUTCMonth(d.getUTCMonth()+offset);const month=d.toISOString().slice(0,7),url=`https://www.newyorkfed.org/research/calendars/i-${months[d.getUTCMonth()]}${d.getUTCFullYear().toString().slice(-2)}.html`;
  const result=await cached(`calendar-native:${month}`,6*3600_000,async()=>parseCalendar(await text(url),month,state.events,url,now),[],now);
  const map=new Map(state.events.map(e=>[e.id,e]));for(const e of result.body)map.set(e.id,map.has(e.id)?{...map.get(e.id)!,at:e.at}:e);state.events=[...map.values()].sort((a,b)=>a.at.localeCompare(b.at));setSource(state,status(`纽约联储经济日历 · ${month}`,result,'已复核当前及下月官方日程；日历不代表公布结果。'));
 }
}
function calendarEvent(state:QuestState,kind:MarketEvent['kind'],at:string,url:string,now:Date):MarketEvent|undefined{
 const date=marketDate(new Date(at)),existing=state.events.find(e=>e.kind===kind&&marketDate(new Date(e.at))===date),template=state.events.find(e=>e.kind===kind);
 if(existing)return {...existing,at};if(!template)return;
 return {...template,id:`${kind.toLowerCase()}-${date}`,at,status:at>now.toISOString()?'scheduled':'pending',actual:undefined,previous:undefined,revised:undefined,consensus:undefined,calendarValues:undefined,releaseHistory:[],report:undefined,period:undefined,sourceUrl:url,sourceName:kind==='FOMC'||kind==='MINUTES'?'Fed 官方发布日历':'BEA 官方发布日历',fetchedAt:now.toISOString()};
}
async function refreshAgencyCalendars(state:QuestState,now:Date){
 const specs=[{key:'bea-calendar-native',name:'BEA 日历',url:'https://apps.bea.gov/API/signup/release_dates.json',parse:(raw:string)=>{
  const result:MarketEvent[]=[];for(const [title,item] of Object.entries(JSON.parse(raw) as Record<string,{release_dates:string[]}>)){
   const kind=/International Trade in Goods and Services/i.test(title)?'TRADE':/Personal Income and Outlays/i.test(title)?'PCE':/Gross Domestic Product|GDP/i.test(title)?'GDP':undefined;if(!kind)continue;
   for(const time of item.release_dates||[]){if(!Number.isFinite(Date.parse(time)))continue;const at=new Date(time).toISOString();if(Date.parse(at)<now.getTime()-45*86400_000||Date.parse(at)>now.getTime()+90*86400_000)continue;const event=calendarEvent(state,kind,at,'https://apps.bea.gov/API/signup/release_dates.json',now);if(event)result.push(event);}
  }return result;
 }},{key:'fed-calendar-native',name:'Fed 日历',url:'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',parse:(raw:string)=>{
  const $=load(raw),result:MarketEvent[]=[],names=['january','february','march','april','may','june','july','august','september','october','november','december'];
  $('.fomc-meeting').each((_,el)=>{const row=$(el),year=row.closest('.panel').find('.panel-heading').first().text().match(/20\d{2}/)?.[0],month=names.indexOf(row.find('.fomc-meeting__month').text().trim().toLowerCase()),day=row.find('.fomc-meeting__date').text().match(/(?:\d+-)?(\d{1,2})/);if(!year||month<0||!day)return;const date=`${year}-${String(month+1).padStart(2,'0')}-${day[1].padStart(2,'0')}`;
   if(Date.parse(date)>now.getTime()-45*86400_000&&Date.parse(date)<now.getTime()+90*86400_000){const event=calendarEvent(state,'FOMC',nyTimeToUtc(date,'14:00'),'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',now);if(event)result.push(event);}
   const minutes=row.find('.fomc-meeting__minutes'),released=minutes.text().match(/Released (\w+) (\d{1,2}), (20\d{2})/),href=minutes.find('a[href$=".htm"]').attr('href');if(released&&href){const m=names.indexOf(released[1].toLowerCase()),day=`${released[3]}-${String(m+1).padStart(2,'0')}-${released[2].padStart(2,'0')}`;if(m>=0&&Date.parse(day)>now.getTime()-45*86400_000){const event=calendarEvent(state,'MINUTES',nyTimeToUtc(day,'14:00'),new URL(href,'https://www.federalreserve.gov').href,now);if(event)result.push({...event,sourceUrl:new URL(href,'https://www.federalreserve.gov').href});}}
  });return result;
 }}];
 await Promise.allSettled(specs.map(async spec=>{const result=await cached(spec.key,6*3600_000,async()=>{const events=spec.parse(await text(spec.url));if(!events.length)throw Error('官方日历没有返回可核对的日期');return events;},[],now);const map=new Map(state.events.map(e=>[e.id,e]));for(const event of result.body)map.set(event.id,map.has(event.id)?{...map.get(event.id)!,at:event.at,...(event.kind==='MINUTES'?{sourceUrl:event.sourceUrl}:{})}:event);state.events=[...map.values()].sort((a,b)=>a.at.localeCompare(b.at));setSource(state,status(spec.name,result,'官方发布日期已复核。'));}));
}
async function refreshReleases(state:QuestState,now:Date){
 const parserVersion=(event:MarketEvent)=>event.kind==='CLAIMS'?5:4;
 const stored=(await database().query("SELECT key,body FROM quest_shared_data WHERE key LIKE 'release-native:%'")).rows as {key:string;body:Cached<MarketEvent>}[];
 const byId=new Map(stored.map(row=>[row.key.slice('release-native:'.length),row.body]));
 for(const e of state.events){const prior=byId.get(e.id);if(prior)setSource(state,status(`官方更新 · ${e.kind} · ${marketDate(new Date(e.at))}`,prior,`${e.kind} 已核对官方文档与发布日期`));}
 state.events=state.events.map(e=>{const prior=byId.get(e.id),next=prior?.body.status==='confirmed'?{...e,...prior.body}:e;return next.kind==='CLAIMS'&&next.status==='confirmed'?{...next,description:'每周首次申请失业保险的人数，是就业变化的高频线索；本次官方发布已核对，结合前值修订与四周均值观察。'}:next;});
 const latestByKind=new Map<string,string>();for(const e of [...state.events].sort((a,b)=>a.at.localeCompare(b.at)))if(Date.parse(e.at)<=now.getTime())latestByKind.set(e.kind+(e.kind==='ISM'?String(/服务/.test(e.title)):''),e.id);
 const candidates=state.events.filter(e=>e.kind!=='EARNINGS'&&(e.status!=='confirmed'||latestByKind.get(e.kind+(e.kind==='ISM'?String(/服务/.test(e.title)):''))===e.id)&&Date.parse(e.at)<=now.getTime()&&Date.parse(e.at)>now.getTime()-45*86400_000)
  .filter(e=>{const prior=byId.get(e.id),ttl=e.status==='confirmed'?24*3600_000:now.getTime()-Date.parse(e.at)<24*3600_000?5*60_000:3600_000;return !prior||prior.version!==parserVersion(e)||now.getTime()-Date.parse(prior.attemptedAt)>=ttl;})
  .sort((a,b)=>b.at.localeCompare(a.at)).slice(0,6);
 // Each source has its own retry clock; one failed document cannot block the other releases.
 const results=await Promise.allSettled(candidates.map(async event=>{
  const due=now.getTime()-Date.parse(event.at)<24*3600_000;const ttl=event.status==='confirmed'?24*3600_000:due?5*60_000:60*60_000;
  const result=await cached(`release-native:${event.id}`,ttl,async()=>{const next=await fetchOfficialRelease(event,now);return {...next,releaseHistory:publicationVersion(event,next)};},event,now,parserVersion(event));
  setSource(state,status(`官方更新 · ${event.kind} · ${marketDate(new Date(event.at))}`,result,`${event.kind} 已核对官方文档与发布日期`));
  return result.body;
 }));
 for(const result of results){if(result.status==='fulfilled'){const i=state.events.findIndex(e=>e.id===result.value.id);if(i>=0)state.events[i]=result.value;}}
}
const histories:Record<string,{id:string;change?:'yoy'|'diff'|'mom';scale?:number}>={CPI:{id:'CPIAUCNS',change:'yoy'},NFP:{id:'PAYEMS',change:'diff'},PCE:{id:'PCEPI',change:'yoy'},GDP:{id:'A191RL1Q225SBEA'},FOMC:{id:'DFEDTARU'},CLAIMS:{id:'ICSA'},CONFIDENCE:{id:'UMCSENT'},TRADE:{id:'BOPGSTB',scale:.001},JOLTS:{id:'JTSJOL'},RETAIL:{id:'RSAFS',change:'mom'},PPI:{id:'PPIFIS',change:'yoy'}};
export function parseHistory(csv:string,spec:{id:string;change?:'yoy'|'diff'|'mom';scale?:number}):HistoryPoint[]{
 const lines=csv.trim().split('\n');if(!lines[0].includes(spec.id))throw Error('历史序列标识不匹配');const values=lines.slice(1).map(line=>line.trim().split(',')).filter(([date,value])=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&value!==''&&value!=='.'&&Number.isFinite(Number(value))).map(([date,value])=>({date,value:Number(value)}));
 const byDate=new Map(values.map(p=>[p.date,p.value]));return values.flatMap((p,i)=>{let value=p.value;if(spec.change==='yoy'){const prev=byDate.get(`${Number(p.date.slice(0,4))-1}${p.date.slice(4)}`);if(!prev)return [];value=(value/prev-1)*100;}else if(spec.change){const prev=values[i-1],month=new Date(p.date+'T12:00:00Z');month.setUTCMonth(month.getUTCMonth()-1);if(!prev||prev.date!==month.toISOString().slice(0,10))return [];value=spec.change==='diff'?value-prev.value:(value/prev.value-1)*100;}
 if(spec.id==='DFEDTARU'&&values[i+1]?.date.slice(0,7)===p.date.slice(0,7))return [];return [{date:p.date,value:Math.round(value*(spec.scale||1)*1000)/1000}];}).slice(-Math.max(60,spec.id==='ICSA'?261:60));
}
async function refreshHistory(state:QuestState,now:Date){
 await Promise.allSettled(Object.entries(histories).map(async([kind,spec])=>{
  const due=state.events.some(e=>e.kind===kind&&e.status==='confirmed'&&e.fetchedAt&&now.getTime()-Date.parse(e.fetchedAt)<3600_000);
  const result=await cached(`history-native:${kind}`,due?3600_000:24*3600_000,async()=>parseHistory(await text(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${spec.id}&cosd=${addDays(marketDate(now),-6*366)}`),spec),[],now);
  if(result.body.length)state.events=state.events.map(e=>e.kind===kind?{...e,history:result.body,historySource:{url:`https://fred.stlouisfed.org/series/${spec.id}`,name:`FRED · ${spec.id}`,fetchedAt:result.lastSuccess!}}:e);
  setSource(state,status(`FRED ${kind} 历史`,result,'已取得官方历史；历史序列更新可能晚于新闻稿，不能代替本次公布值。'));
 }));
}
export async function refreshEventData(state:QuestState,now=new Date()):Promise<void>{
 try{await refreshCalendars(state,now);await refreshAgencyCalendars(state,now);await refreshReleases(state,now);
  const [values]=await Promise.all([cached('event-values-native',5*60_000,async()=>parseEventValues(await text(EVENT_VALUES_URL),now.toISOString()),undefined as EventValuesFeed|undefined,now),refreshHistory(state,now)]);
  state.events=applyEventValues(state.events,values.body).map(enrichReleaseMetrics);setSource(state,status('经济日历 · 前值与市场预测',values,'共识单独标注来源；不以媒体或模型预测代替调查值。'));
  setSource(state,{name:'官方事件自动同步',status:'ready',message:'公布后每 5 分钟检查，失败保留原值并重试；正文与报告期核对后才确认。',lastSuccess:now.toISOString()});
 }catch(error){setSource(state,{name:'官方事件自动同步',status:'delayed',message:error instanceof Error?error.message:'同步暂不可用'});}
}
export async function refreshNews(previous:EventIntelligence,now:Date){const result=await cached('news-native',5*60_000,()=>fetchIntelligence(previous,now),previous,now);return result.body;}
