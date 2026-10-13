import {getPublicFeed} from '@/lib/quest/public-source';
import {refreshNative} from '@/lib/quest/native-feed';
export const maxDuration=60;
export async function GET(request:Request){const expected=process.env.CRON_SECRET;if(!expected||request.headers.get('authorization')!==`Bearer ${expected}`)return new Response('Unauthorized',{status:401});const feed=await refreshNative(await getPublicFeed(),true);return Response.json({latest:feed.state.bars.filter(b=>b.symbol==='QQQ').at(-1)?.date,reports:(feed.reports as {reports:unknown[]}).reports.length});}
