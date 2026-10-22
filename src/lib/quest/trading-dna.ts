import type {DisciplinePlan} from './discipline-plan';
import {addDays} from './domain';
import {weeklyTracking} from './weekly-tracking';
import type {Judgment,PredictionMonth,QuestState,Review} from './types';
export function predictionRecords(state:QuestState){const byId=new Map<string,Judgment>();for(const review of state.reviews)if(review.judgmentSnapshot)byId.set(review.judgmentSnapshot.id,review.judgmentSnapshot);for(const week of state.trackingWeeks||[])for(const day of week.days)if(day.judgment)byId.set(day.judgment.id,day.judgment);if(state.judgment)byId.set(state.judgment.id,state.judgment);return [...byId.values()].filter(j=>j.eligible&&j.date<=state.session.nextDate&&Number.isFinite(Date.parse(j.lockedAt))&&Date.parse(j.lockedAt)<=Date.parse(state.now)+60000).sort((a,b)=>b.date.localeCompare(a.date)||b.lockedAt.localeCompare(a.lockedAt)).filter((call,index,all)=>all.findIndex(other=>other.date===call.date)===index);}
/** Compute before restricting archive access. Dates are the target session, not lock/review timestamps. */
export function monthlyPredictionAccuracy(state:QuestState):PredictionMonth[]{
 const months=new Map<string,PredictionMonth>();
 const monthFor=(month:string)=>{let summary=months.get(month);if(!summary){summary={month,recorded:0,verified:0,matched:0,pending:0};months.set(month,summary);}return summary;};
 monthFor(state.session.date.slice(0,7));
 const reviews=new Map<string,Review>(),reviewKey=(id:string,date:string,forecastId:string)=>JSON.stringify([id,date,forecastId]);
 for(const review of state.reviews){const id=review.judgmentId||review.judgmentSnapshot?.id;if(id&&typeof review.matched==='boolean')reviews.set(reviewKey(id,review.date,review.forecastId),review);}
 for(const call of predictionRecords(state)){
  const summary=monthFor(call.date.slice(0,7)),review=reviews.get(reviewKey(call.id,call.date,call.forecastId));
  summary.recorded++;
  if(review){summary.verified++;if(review.matched)summary.matched++;}else summary.pending++;
 }
 for(const summary of months.values())if(summary.verified)summary.accuracy=Math.round(100*summary.matched/summary.verified);
 return [...months.values()].sort((a,b)=>b.month.localeCompare(a.month));
}
/** Restrict the visible window, never delete the user's saved records. */
export function historyWindow(state:QuestState,premium:boolean){const predictionMonths=monthlyPredictionAccuracy(state);if(premium)return {...state,predictionMonths};const cutoff=addDays(state.session.date,-6),reviews=state.reviews.filter(r=>r.date>=cutoff),judgments=predictionRecords(state).filter(j=>j.date>=cutoff);return {...state,predictionMonths,reviews,trackingWeeks:weeklyTracking({...state,reviews},judgments).map(week=>({...week,days:week.days.filter(day=>day.date>=cutoff)}))};}
export function tradingDNA(state:QuestState,premium=false,plan?:DisciplinePlan){
 const cutoff=addDays(state.session.date,-6),calls=predictionRecords(state).filter(j=>(premium||j.date>=cutoff)&&(!plan||Date.parse(j.lockedAt)>=Date.parse(plan.since))),reviewById=new Map<string,Review>();
 for(const r of state.reviews)if(typeof r.matched==='boolean'&&(r.judgmentId||r.judgmentSnapshot?.id))reviewById.set(r.judgmentId||r.judgmentSnapshot!.id,r);
 const verified=calls.flatMap(call=>{const review=reviewById.get(call.id);return review&&review.date===call.date&&review.forecastId===call.forecastId?[{call,review}]:[];}),high=verified.filter(v=>v.call.confidence==='high'),reflected=verified.filter(v=>!!v.review.completedAt),reasons=calls.filter(j=>j.reason.trim().length>0),conditions=calls.filter(j=>/\b(if|unless|above|below|support|resistance|invalidate|threshold|si|seuil|invalidation)\b|résistance|突破|支撑|阻力|跌破|失效|如果|价位/.test(j.reason.toLowerCase()));
 const count=calls.length,rate=(n:number,total=count)=>total?Math.round(n/total*100):0,directions={bullish:rate(calls.filter(j=>j.direction==='bullish').length),neutral:rate(calls.filter(j=>j.direction==='neutral').length),bearish:rate(calls.filter(j=>j.direction==='bearish').length)};
 const metrics={reasons:rate(reasons.length),conditions:rate(conditions.length),reflection:rate(reflected.length,verified.length),highConfidence:rate(calls.filter(j=>j.confidence==='high').length),matched:verified.length?rate(verified.filter(v=>v.review.matched).length,verified.length):undefined};
 const ready=count>=5,score=ready&&verified.length>=3?Math.round(plan?plan.rules.reduce((sum,rule)=>sum+(rule==='reason'?metrics.reasons:rule==='condition'?metrics.conditions:metrics.reflection),0)/plan.rules.length:metrics.reasons*.3+metrics.conditions*.4+metrics.reflection*.3):undefined;
 const mission=verified.length&&metrics.reflection<50?'reflect':metrics.conditions<50?'condition':high.length>=5&&high.filter(v=>!v.review.matched).length>=3?'calibrate':'countercase';
 return {calls,verified,count,directions,metrics,ready,score,highVerified:high.length,highMatched:high.filter(v=>v.review.matched).length,mission,reflected:reflected.length};
}
