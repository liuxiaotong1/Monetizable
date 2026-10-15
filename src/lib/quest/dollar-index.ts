export const DXY_SOURCE='https://finance.yahoo.com/quote/DX-Y.NYB/';
export type DxyInterval='D'|'60'|'15';
export function parseDollarIndex(input:unknown,interval:DxyInterval,now=new Date()){
 const data=input as {chart?:{error?:unknown;result?:{meta?:{symbol?:string;dataGranularity?:string};timestamp?:number[];indicators?:{quote?:{close?:unknown[]}[]}}[]}};
 const row=data.chart?.result?.[0],granularity=interval==='D'?'1d':interval==='60'?'60m':'15m';
 if(data.chart?.error||row?.meta?.symbol!=='DX-Y.NYB'||!(row.meta.dataGranularity===granularity||interval==='60'&&row.meta.dataGranularity==='1h')||!Array.isArray(row.timestamp))throw Error('Dollar index response does not match the requested instrument and interval');
 const points=row.timestamp.flatMap((time,i)=>{const value=row.indicators?.quote?.[0]?.close?.[i];return Number.isFinite(time)&&time*1000<=+now&&typeof value==='number'&&Number.isFinite(value)&&value>0?[{date:new Date(time*1000).toISOString(),value}]:[];}).sort((a,b)=>a.date.localeCompare(b.date));
 if(points.length<2||new Set(points.map(p=>p.date)).size!==points.length)throw Error('No valid dollar index history');
 return {symbol:'DXY',interval,fetchedAt:now.toISOString(),sourceUrl:DXY_SOURCE,points};
}
