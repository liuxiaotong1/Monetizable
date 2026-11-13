import {getPublicFeed} from '@/lib/quest/public-source';
export async function GET(){const {state}=await getPublicFeed();return Response.json({now:state.now,session:state.session,bars:state.bars.filter(b=>b.symbol==='QQQ').sort((a,b)=>a.date.localeCompare(b.date)).slice(-20)},{headers:{'Cache-Control':'public, max-age=60, s-maxage=300, stale-while-revalidate=600'}});}
