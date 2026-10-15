import 'server-only';
import {database} from '@/lib/account/db';
import {scoreForecast,sessionFor,sessionReady} from './domain';
import type {QuestState,Judgment,Forecast} from './types';

/** Archive the first verified result without editing a user's judgment or notes. */
export async function archiveCloudReviews(state:QuestState){
 const latest=state.bars.filter(b=>b.symbol==='QQQ').at(-1);
 if(!latest||!sessionReady(latest.date,new Date(state.now)))return 0;
 const db=database();
 const {rows}=await db.query("SELECT user_id,record FROM quest_profiles WHERE record IS NOT NULL AND jsonb_array_length(COALESCE(record->'judgments','[]'::jsonb))>0");
 let saved=0;
 for(const row of rows){
  const judgments=(row.record.judgments||[]) as Judgment[],forecasts=(row.record.forecasts||[]) as Forecast[];
  for(const judgment of judgments){
   const actual=state.bars.find(b=>b.symbol==='QQQ'&&b.date===judgment.date),forecast=forecasts.find(f=>f.id===judgment.forecastId);
   if(!actual||!forecast||!sessionReady(judgment.date,new Date(state.now))||!sessionReady(judgment.date,new Date(actual.fetchedAt)))continue;
   const previous=state.bars.find(b=>b.symbol==='QQQ'&&b.date===sessionFor(new Date(judgment.date+'T12:00:00Z')).previousDate);
   if(forecast.provisional&&!previous)continue;
   const result=scoreForecast(forecast.provisional?{...forecast,baselineClose:previous!.close}:forecast,actual,judgment);
   const inserted=await db.query('INSERT INTO quest_shared_data(key,body) VALUES($1,$2) ON CONFLICT(key) DO NOTHING',[`review:${row.user_id}:${judgment.id}`,JSON.stringify({result,actual,archivedAt:state.now})]);
   saved+=inserted.rowCount||0;
  }
 }
 return saved;
}
