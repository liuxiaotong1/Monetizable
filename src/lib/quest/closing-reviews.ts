import 'server-only';
import {database} from '@/lib/account/db';
import {getPublicFeed} from './public-source';
import {generatePredictionReview,predictionReviewCacheKey} from './prediction-review-service';
import {sessionFor,sessionReady} from './domain';
import type {Forecast,Judgment} from './types';
export async function warmClosingReviews(){
 const now=new Date(),session=sessionFor(now);
 if(!sessionReady(session.date,now)||now.getTime()>Date.parse(session.closeAt)+2*3600_000)return {status:'outside-window',ready:0,pending:0};
 if(!process.env.OPENAI_API_KEY)return {status:'ai-unavailable',ready:0,pending:0};
 const db=database(),lock='closing-review-worker:'+session.date;
 const lease=await db.query("INSERT INTO quest_shared_data(key,body) VALUES($1,'{}') ON CONFLICT(key) DO UPDATE SET updated_at=now() WHERE quest_shared_data.updated_at<now()-interval '5 minutes' RETURNING key",[lock]);
 if(!lease.rowCount)return {status:'generating',ready:0,pending:0};
 try{
  const {rows}=await db.query("SELECT user_id,locale,record FROM quest_profiles WHERE record IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(record->'judgments','[]'::jsonb)) j WHERE j->>'date'=$1) ORDER BY last_seen_at DESC LIMIT 100",[session.date]);
  const jobs=rows.flatMap(row=>{
   const judgment=(row.record.judgments as Judgment[]).find(j=>j.date===session.date),forecast=(row.record.forecasts as Forecast[]||[]).find(f=>f.id===judgment?.forecastId);
   if(!judgment||!forecast)return [];
   const input={locale:row.locale==='zh'||row.locale==='fr'?row.locale:'en',date:judgment.date,direction:judgment.direction,confidence:judgment.confidence,reason:judgment.reason,lockedAt:judgment.lockedAt,threshold:forecast.threshold,forecastCreatedAt:forecast.createdAt};
   return [{userId:String(row.user_id),input,key:predictionReviewCacheKey(String(row.user_id),input)}];
  });
  if(!jobs.length)return {status:'ready',ready:0,pending:0};
  const existing=await db.query('SELECT key,body FROM quest_shared_data WHERE key=ANY($1::text[])',[jobs.map(j=>j.key)]);
  const complete=new Set(existing.rows.filter(r=>r.body?.version===12&&r.body.priceAsOf===session.date&&r.body.contextDate===session.date).map(r=>r.key));
  const todo=jobs.filter(j=>!complete.has(j.key)).slice(0,10);
  if(!todo.length)return {status:'ready',ready:complete.size,pending:0};
  const feed=await getPublicFeed();
  if(!feed.state.bars.some(b=>b.symbol==='QQQ'&&b.date===session.date&&sessionReady(b.date,new Date(b.fetchedAt))))return {status:'waiting-for-close',ready:complete.size,pending:jobs.length-complete.size};
  let ready=complete.size,pending=jobs.length-complete.size;
  const errors:Record<string,number>={};
  for(let i=0;i<todo.length;i+=2){await Promise.all(todo.slice(i,i+2).map(async job=>{
   const response=await generatePredictionReview(job.userId,job.input,feed);
   if(response.status===200){ready++;pending--;}else{const result=await response.json();const code=String(result.error||result.status||response.status);errors[code]=(errors[code]||0)+1;}
  }));}
  const result={status:pending?'pending':'ready',date:session.date,ready,pending,errors,checkedAt:new Date().toISOString()};
  await db.query("INSERT INTO quest_shared_data(key,body) VALUES('closing-review-health',$1) ON CONFLICT(key) DO UPDATE SET body=EXCLUDED.body,updated_at=now()",[JSON.stringify(result)]);
  return result;
 }finally{await db.query('DELETE FROM quest_shared_data WHERE key=$1',[lock]);}
}
