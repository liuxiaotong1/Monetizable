import {refreshNative} from '@/lib/quest/native-feed';
import {foundationFeed} from '@/lib/quest/public-source';
import {database} from '@/lib/account/db';
import {archiveCloudReviews} from '@/lib/quest/cloud-reviews';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function GET(){
 const startedAt=new Date().toISOString();
 try{
  const feed=await refreshNative(foundationFeed(),false,true),completedAt=new Date().toISOString();
  const reviewsArchived=await archiveCloudReviews(feed.state);
  const status=feed.state.events.some(e=>e.at<=feed.state.now&&e.status!=='confirmed'&&Date.parse(e.at)>Date.parse(feed.state.now)-7*86400000)?'partial':'ready';
  await database().query("INSERT INTO quest_shared_data(key,body) VALUES('refresh-health',$1) ON CONFLICT(key) DO UPDATE SET body=EXCLUDED.body,updated_at=now()",[JSON.stringify({startedAt,completedAt,status,sources:feed.state.sources})]);
  return Response.json({status,startedAt,completedAt,exportedAt:feed.exportedAt,reviewsArchived},{headers:{'Cache-Control':'no-store'}});
 }catch{
  return Response.json({status:'error',startedAt,error:'Data refresh did not complete; last verified data retained.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
