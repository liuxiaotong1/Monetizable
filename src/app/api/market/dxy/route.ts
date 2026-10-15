import {parseDollarIndex,type DxyInterval} from '@/lib/quest/dollar-index';
export const maxDuration=30;
export async function GET(request:Request){
 const interval=new URL(request.url).searchParams.get('interval')||'D';
 if(!['D','60','15'].includes(interval))return Response.json({error:'Unsupported chart interval'},{status:400});
 const range=interval==='D'?'6mo':interval==='60'?'1mo':'5d',granularity=interval==='D'?'1d':interval==='60'?'60m':'15m';
 for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com'])try{
  const response=await fetch(`https://${host}/v8/finance/chart/DX-Y.NYB?${new URLSearchParams({range,interval:granularity})}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Upstream unavailable');
  return Response.json(parseDollarIndex(await response.json(),interval as DxyInterval),{headers:{'Cache-Control':'public, max-age=0, s-maxage=300'}});
 }catch{/* Independent public endpoint fallback; do not substitute a different index. */}
 return Response.json({error:'Dollar index data is temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
}
