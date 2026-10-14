import type {MarketEvent} from './types';
const ids:Partial<Record<MarketEvent['kind'],string[]>>={CPI:['CUUR0000SA0','CUUR0000SA0L1E','CUSR0000SA0'],NFP:['CES0000000001'],PPI:['WPUFD4'],JOLTS:['JTS000000000000000JOL']};
export function parseBlsSeries(event:MarketEvent,input:unknown,now:string):MarketEvent{
 const payload=input as {status?:string;Results?:{series?:{seriesID:string;data:{year:string;period:string;value:string}[]}[]}};
 const expectedIds=ids[event.kind];if(payload.status!=='REQUEST_SUCCEEDED'||!expectedIds||Date.parse(now)<Date.parse(event.at))throw Error('BLS API 尚未提供有效结果');
 const target=new Date(event.at);target.setUTCDate(1);target.setUTCMonth(target.getUTCMonth()-(event.kind==='JOLTS'?2:1));
 const period=(d:Date)=>`${d.getUTCFullYear()}:M${String(d.getUTCMonth()+1).padStart(2,'0')}`,key=period(target),series=expectedIds.map(id=>payload.Results?.series?.find(s=>s.seriesID===id));
 for(const row of series){
  const latest=row?.data.filter(p=>/^M(0[1-9]|1[012])$/.test(p.period)).sort((a,b)=>`${b.year}:${b.period}`.localeCompare(`${a.year}:${a.period}`))[0];
  if(!latest||`${latest.year}:${latest.period}`!==key)throw Error('BLS API 最新报告期与本次公布不匹配');
 }
 const get=(index:number,offset:number)=>{const d=new Date(target);d.setUTCMonth(d.getUTCMonth()-offset);const p=series[index]?.data.find(p=>`${p.year}:${p.period}`===period(d));const n=p?Number(p.value.replace(/,/g,'')):NaN;if(!Number.isFinite(n)||n<=0)throw Error('BLS API 缺少同口径的必要观察值');return n;};
 const annual=(index:number,offset=0)=>Math.round((get(index,offset)/get(index,offset+12)-1)*1000)/10;
 const actual=event.kind==='CPI'||event.kind==='PPI'?annual(0):event.kind==='NFP'?get(0,0)-get(0,1):get(0,0),previous=event.kind==='CPI'||event.kind==='PPI'?annual(0,1):event.kind==='NFP'?get(0,1)-get(0,2):get(0,1);
 const metrics:NonNullable<MarketEvent['report']>['metrics']=event.kind==='CPI'?[{kind:'headline-mom',value:Math.round((get(2,0)/get(2,1)-1)*1000)/10,unit:'%'},{kind:'core-yoy',value:annual(1),unit:'%'}]:[];
 const sourceUrl=`https://api.bls.gov/publicAPI/v2/timeseries/data/${expectedIds[0]}`;
 return {...event,status:'confirmed',actual,previous,period:target.toISOString().slice(0,7),fetchedAt:now,sourceUrl,sourceName:'BLS · 官方数据 API（当前版本计算）',report:{title:'BLS 官方数据 API',bodyUrl:sourceUrl,metrics,summary:[`API 报告期 ${target.toISOString().slice(0,7)}；本次 ${actual}，前值 ${previous}。`,`按同口径官方序列计算；当前版本可能包含修订，不能冒充首次新闻稿。`,...(metrics||[]).map(m=>`${m.kind==='headline-mom'?'总体 CPI 季调环比':'核心 CPI 同比'} ${m.value}%。`)]}};
}
export async function fetchBlsSeries(event:MarketEvent,now:Date){
 const series=ids[event.kind];if(!series)throw Error('未配置此 BLS 序列');
 const target=new Date(event.at);target.setUTCDate(1);target.setUTCMonth(target.getUTCMonth()-(event.kind==='JOLTS'?2:1));
 const r=await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({seriesid:series,startyear:String(target.getUTCFullYear()-1),endyear:String(target.getUTCFullYear())}),cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error(`BLS API HTTP ${r.status}`);return parseBlsSeries(event,await r.json(),now.toISOString());
}
/** Upgrade already verified legacy summaries without claiming a fresh source fetch. */
export function enrichReleaseMetrics(event:MarketEvent):MarketEvent{
 if(event.kind!=='CPI'||event.status!=='confirmed'||!event.report||event.report.metrics)return event;
 const metrics:NonNullable<MarketEvent['report']>['metrics']=[];
 for(const line of event.report.summary){const mom=line.match(/^总体 CPI 季调环比 ([\d.]+)%/),core=line.match(/^核心 CPI 同比 ([\d.]+)%/);if(mom)metrics.push({kind:'headline-mom',value:Number(mom[1]),unit:'%'});if(core)metrics.push({kind:'core-yoy',value:Number(core[1]),unit:'%'});}
 return {...event,report:{...event.report,metrics}};
}
