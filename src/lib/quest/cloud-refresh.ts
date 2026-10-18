import {refreshIssues} from '@/lib/quest/refresh-policy';
import {refreshNative} from '@/lib/quest/native-feed';
import {foundationFeed} from '@/lib/quest/public-source';
import {database} from '@/lib/account/db';
import {archiveCloudReviews} from '@/lib/quest/cloud-reviews';
export async function runCloudRefresh(){
 const startedAt=new Date().toISOString();
 try{
  const feed=await refreshNative(foundationFeed(),false,true),completedAt=new Date().toISOString();
  const reviewsArchived=await archiveCloudReviews(feed.state);
  const issues=refreshIssues(feed.state.sources,feed.state.events,new Date(completedAt));
  const status=issues.sources.length||issues.overdue.length?'partial':'ready';
  await database().query("INSERT INTO quest_shared_data(key,body) VALUES('refresh-health',$1) ON CONFLICT(key) DO UPDATE SET body=EXCLUDED.body,updated_at=now()",[JSON.stringify({startedAt,completedAt,status,issues,learning:feed.state.learningUpdate,sources:feed.state.sources})]);
  return Response.json({status,startedAt,completedAt,exportedAt:feed.exportedAt,reviewsArchived,learning:feed.state.learningUpdate,issues},{headers:{'Cache-Control':'no-store'}});
 }catch{
  return Response.json({status:'error',startedAt,error:'Data refresh did not complete; last verified data retained.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
