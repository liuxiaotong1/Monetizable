import {scheduledRefreshMode} from '@/lib/quest/feed-plan';
import {refreshIssues} from '@/lib/quest/refresh-policy';
import {refreshNative} from '@/lib/quest/native-feed';
import {refreshEventValuesCache,refreshNewsIfDue} from '@/lib/quest/data-refresh';
import {foundationFeed} from '@/lib/quest/public-source';
import {loadRefreshSignals,readHealthSummary} from '@/lib/quest/feed-store';
import {database} from '@/lib/account/db';
import {archiveCloudReviews} from '@/lib/quest/cloud-reviews';
import {ensureClosingReviewSchedule} from './closing-review-schedule';
export async function runCloudRefresh(){
 const startedAt=new Date().toISOString();
 const closingSchedule=await ensureClosingReviewSchedule().catch(()=>({enabled:false}));
 try{
  const now=new Date(),signals=await loadRefreshSignals(),plan=scheduledRefreshMode({now,snapshotUpdatedAt:signals.snapshotUpdatedAt,barsFetchedAt:signals.barsFetchedAt,lastBarDate:signals.lastBarDate,clocks:signals.clocks,events:foundationFeed().state.events});
  if(plan.mode==='light'){
   if(plan.newsDue)await refreshNewsIfDue(now).catch(()=>undefined);
   if(plan.valuesDue)await refreshEventValuesCache(now).catch(()=>undefined);
   const summary=await readHealthSummary(),completedAt=new Date().toISOString();
   return Response.json({status:summary.status||'ready',startedAt,completedAt,reused:true,reviewsArchived:0,closingSchedule,learning:summary.learning,issues:summary.issues||{sources:[],overdue:[]}},{headers:{'Cache-Control':'no-store'}});
  }
  const feed=await refreshNative(foundationFeed(),false,true),completedAt=new Date().toISOString();
  const reviewsArchived=await archiveCloudReviews(feed.state);
  const issues=refreshIssues(feed.state.sources,feed.state.events,new Date(completedAt));
  const status=issues.sources.length||issues.overdue.length?'partial':'ready';
  await database().query("INSERT INTO quest_shared_data(key,body) VALUES('refresh-health',$1) ON CONFLICT(key) DO UPDATE SET body=EXCLUDED.body,updated_at=now()",[JSON.stringify({startedAt,completedAt,status,issues,learning:feed.state.learningUpdate,sources:feed.state.sources})]);
  return Response.json({status,startedAt,completedAt,exportedAt:feed.exportedAt,reviewsArchived,closingSchedule,learning:feed.state.learningUpdate,issues},{headers:{'Cache-Control':'no-store'}});
 }catch{
  return Response.json({status:'error',startedAt,error:'Data refresh did not complete; last verified data retained.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
