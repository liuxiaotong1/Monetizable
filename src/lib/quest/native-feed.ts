import 'server-only';
import { createHash } from 'node:crypto';
import { database } from '@/lib/account/db';
import { parseFreeBars, freeBarsNeedRefresh } from './free-market';
import { marketDate, nyTimeToUtc, sessionFor } from './domain';
import { parisDate, reportWeekStart } from './agent-report';
import { preparationForecast } from './prediction-window';
import type { PublicFeed } from './public-source';
import type { AgentReport } from './agent-report';
async function read<T>(key:string):Promise<T|undefined>{const {rows}=await database().query('SELECT body FROM quest_shared_data WHERE key=$1',[key]);return rows[0]?.body;}
async function save(key:string,body:unknown){await database().query('INSERT INTO quest_shared_data(key,body) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET body=EXCLUDED.body,updated_at=now()',[key,JSON.stringify(body)]);}
export async function refreshNative(feed:PublicFeed,force=false):Promise<PublicFeed>{
 const now=new Date(),state=feed.state;
 try {
  let saved=await read<{fetchedAt:string;bars:typeof state.bars}>('market-bars');
  if(force||freeBarsNeedRefresh(saved,now)){
   try{const r=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/QQQ?range=6mo&interval=1d&includePrePost=false',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const bars=parseFreeBars(await r.json(),'QQQ',now);saved={fetchedAt:now.toISOString(),bars};await save('market-bars',saved);}catch{/* Preserve verified bars and their original timestamps. */}
  }
  if(saved){const byDate=new Map(state.bars.map(b=>[`${b.symbol}:${b.date}`,b]));for(const bar of saved.bars)byDate.set(`${bar.symbol}:${bar.date}`,bar);state.bars=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));}
  const session=sessionFor(now);const forecast=preparationForecast(state.bars,session.date,now);
  if(session.isTradingDay && now.getTime()<Date.parse(session.openAt)&&forecast){const key=`forecast:${session.date}`,prior=await read<typeof state.forecasts>(key)||[];if(!prior.some(f=>f.id===forecast.id)){prior.push(forecast);await save(key,prior);}state.forecasts=[...state.forecasts.filter(f=>f.date!==session.date),...prior];}
  const date=parisDate(now),parisTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now),day=new Date(date+'T12:00:00Z').getUTCDay();
  const kind=day===0?'weekly':'daily',key=`report:${kind}:${date}`;
  let report=await read<AgentReport>(key);
  const window=kind==='weekly'?parisTime>='19:00':day!==6&&parisTime>='14:15'&&now.getTime()<Date.parse(session.openAt);
  if(!report&&window){
   const latest=state.bars.filter(b=>b.symbol==='QQQ').at(-1),previous=state.bars.filter(b=>b.symbol==='QQQ').at(-2);
   const events=state.events.filter(e=>e.at>=now.toISOString()&&e.at<new Date(now.getTime()+(kind==='weekly'?7:1)*86400000).toISOString()).sort((a,b)=>a.at.localeCompare(b.at));
   const title=kind==='weekly'?`${date} · 一周前瞻`:`${date} · 盘前快报`;
   const summary=latest?`最近核对收盘 ${latest.date}：QQQ $${latest.close.toFixed(2)}。${latest.date===session.previousDate?'已取得上一交易日完整日线。':'最新交易日资料仍待恢复；以下仅为已确认历史参考。'}关注 ${events.length} 项已取得事件日程。`:'行情尚待确认；保留事件日程，不提供未经核实的价格。';
   const f=preparationForecast(state.bars,session.isTradingDay?session.date:session.nextDate,now);
   const body=`## ${title}\n${summary}\n\n## 行情快照\n${latest?`日线日期：${latest.date}；收盘 $${latest.close.toFixed(2)}；高低 $${latest.low.toFixed(2)}–$${latest.high.toFixed(2)}；取得 ${latest.fetchedAt}。${previous?`相对前收盘 ${((latest.close/previous.close-1)*100).toFixed(2)}%。`:''}`:'暂无已确认日线。'}\n\n## 事件 Boss 地图\n${events.length?events.map(e=>`- ${e.title} · ${e.at} · [官方来源](${e.sourceUrl})`).join('\n'):'这个窗口尚未取得可靠事件日程；不代表没有事件。'}\n\n## 观察条件\n${f?f.scenarios.map(s=>`- ${s.title}：${s.condition} 失效条件：${s.invalidation}`).join('\n'):'日线不足，暂不生成价位情景。'}\n\n这是网站自动生成的数据准备版，不包含未接入的实时期货、新闻或跨资产数据；官方公布值未核实前保留待确认。`;
   report={kind,date,generatedAt:now.toISOString(),title,summary,body,status:'partial',origin:kind==='weekly'?'weekly-quest':'cloud-backup',sources:[{title:'QQQ 日线',url:'https://finance.yahoo.com/quote/QQQ/history/'},...events.slice(0,8).map(e=>({title:e.title,url:e.sourceUrl}))],version:1,savedAt:now.toISOString(),digest:createHash('sha256').update(body).digest('hex'),...(kind==='weekly'?{weekStart:reportWeekStart(date)}:{})};await save(key,report);
  }
  const {rows}=await database().query("SELECT body FROM quest_shared_data WHERE key LIKE 'report:%' ORDER BY updated_at DESC LIMIT 20");
  const old=(feed.reports as {reports?:AgentReport[]}).reports||[];const unique=new Map<string,AgentReport>();for(const candidate of [...rows.map(r=>r.body as AgentReport),...old]){const key=`${candidate.kind}:${candidate.date}`,prior=unique.get(key);if(!prior || candidate.origin==="trading-agent"&&prior.origin!=="trading-agent" || candidate.origin===prior.origin&&(candidate.generatedAt>prior.generatedAt||candidate.generatedAt===prior.generatedAt&&candidate.body.length>prior.body.length))unique.set(key,candidate);}const reports=[...unique.values()].sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt));feed.reports={...(feed.reports as object),reports,dailyStatus:day===0||day===6?"weekend":reports.some(r=>r.kind==="daily"&&r.date===date)?"ready":now.getTime()>=Date.parse(session.openAt)?"missed":"scheduled",reportDate:date};
  return feed;
 }catch{return feed;}
}
