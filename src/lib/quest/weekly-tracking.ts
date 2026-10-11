import { addDays, sessionFor, type CalendarOverride } from "./domain";
import type { Direction, Judgment, QuestState, Review } from "./types";
export interface TrackingDay {date:string;status:"correct"|"incorrect"|"pending"|"unscored"|"missing"|"upcoming"|"open"|"holiday";judgment?:Judgment;review?:Review}
export interface TrackingWeek {start:string;end:string;days:TrackingDay[];recorded:number;scored:number;correct:number;pending:number;completed:number;hitRate?:number;summary:string;keywords:{label:string;count:number}[]}
export function trackingWeekStart(date:string){const day=new Date(`${date}T12:00:00Z`).getUTCDay();return addDays(date,-((day+6)%7));}
export function weeklyTracking(state:Pick<QuestState,"session"|"now"|"reviews">,history:Judgment[],overrides:CalendarOverride[]=[]):TrackingWeek[]{
 const judgments=new Map<string,Judgment>();
 for(const r of state.reviews)if(r.judgmentSnapshot)judgments.set(r.date,r.judgmentSnapshot);
 for(const j of history)if(j&&j.date<=state.session.date)judgments.set(j.date,j);
 const current=trackingWeekStart(state.session.date);
 const earliest=[current,...[...judgments.keys(),...state.reviews.map(r=>r.date)].filter(d=>d<=state.session.date).map(trackingWeekStart)].sort()[0];
 const starts:string[]=[];
 for(let start=current;start>=earliest;start=addDays(start,-7))starts.push(start);
 const names:Record<Direction,string>={bullish:"偏多",neutral:"震荡",bearish:"偏空"};
 return starts.map(start=>{
  const days:TrackingDay[]=Array.from({length:5},(_,i)=>{
   const date=addDays(start,i),session=sessionFor(new Date(`${date}T12:00:00Z`),overrides),judgment=judgments.get(date);
   const review=state.reviews.find(r=>r.date===date&&(!judgment||(r.judgmentId===judgment.id&&r.forecastId===judgment.forecastId)));
   const status:TrackingDay["status"]=!session.isTradingDay?"holiday":date>state.session.date?"upcoming":!judgment?(state.now<session.openAt?"open":"missing"):!judgment.eligible?"unscored":typeof review?.matched==="boolean"?(review.matched?"correct":"incorrect"):"pending";
   return {date,status,judgment,review};
  });
  const recorded=days.filter(d=>d.judgment).length,scored=days.filter(d=>d.status==="correct"||d.status==="incorrect").length,correct=days.filter(d=>d.status==="correct").length,pending=days.filter(d=>d.status==="pending").length,completed=days.filter(d=>d.review?.completedAt).length;
  const hitRate=scored?Math.round(correct/scored*100):undefined;
  const distribution=(Object.keys(names) as Direction[]).map(direction=>({direction,count:days.filter(d=>d.judgment?.direction===direction).length})).filter(x=>x.count).map(x=>`${names[x.direction]} ${x.count} 次`).join("、");
  const high=days.filter(d=>d.judgment?.confidence==="high"&&["correct","incorrect"].includes(d.status));
  const uncovered=days.filter(d=>["correct","incorrect"].includes(d.status)&&d.review?.rangeCovered===false).length;
  const summary=recorded?`本周记录 ${recorded} 次判断${distribution?`（${distribution}）`:""}。${scored?`已核对 ${scored} 次，方向一致 ${correct} 次，命中率 ${hitRate}%。`:"暂无可评分结果，命中率暂不计算。"}${pending?`另有 ${pending} 次等待行情核对。`:""}已完成 ${completed} 次复盘。${high.length?`高信心判断已核对 ${high.length} 次，其中 ${high.filter(d=>d.status==="correct").length} 次方向一致。`:""}${uncovered?`有 ${uncovered} 次情景区间未完全覆盖实际高低点，可结合原始条件继续复盘。`:""}`:"本周尚无封存判断。每天留下方向与理由，收盘结果确认后会自动汇总在这里。";
  const topics:[string,RegExp][]=[["利率 / 美债",/利率|美债|收益率|降息|加息|yield|rate/i],["通胀",/通胀|CPI|PCE|inflation/i],["就业",/就业|非农|失业|payroll|jobs/i],["财报 / 盈利",/财报|盈利|EPS|earnings/i],["技术价位",/支撑|阻力|均线|突破|回踩|MA\d|RSI|MACD/i],["风险情绪",/风险|情绪|risk.off|risk.on/i],["能源 / 油价",/油价|原油|能源|oil/i]];
  const keywords=topics.map(([label,pattern])=>({label,count:days.filter(d=>d.judgment&&pattern.test(d.judgment.reason)).length})).filter(x=>x.count).sort((a,b)=>b.count-a.count);
  return {start,end:addDays(start,4),days,recorded,scored,correct,pending,completed,hitRate,summary,keywords};
 });
}
