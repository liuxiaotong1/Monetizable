import {sessionFor,scoreForecast,sessionReady} from './domain';
import {assignDaily,answerCard,classifyCard,conceptKey,beginLearningVisit} from './learning-engine';
import {dailyAdventure,completeAdventure} from './adventure';
import {weeklyTracking} from './weekly-tracking';
import type {QuestState,QuestCommand,Settings,Judgment,Forecast,CardProgress,Review,AdventureProgress,LearningCard} from './types';
const key='qqq-quest-public:v1';
const defaults:Settings={watchlist:[],threshold:.3,notifications:{daily:true,events:true,results:true},displayTimeZone:'Europe/Paris'};
export interface BrowserRecord {version:1;judgments:Judgment[];forecasts:Forecast[];cards:LearningCard[];progress:CardProgress[];notes:Record<string,Partial<Review>>;settings:Settings;xp:number;rewards:string[];learningDays:Record<string,string[]>;learningVisitId?:string;adventure?:AdventureProgress;readNotices:string[]}
export function emptyBrowserRecord():BrowserRecord{return {version:1,judgments:[],forecasts:[],cards:[],progress:[],notes:{},settings:structuredClone(defaults),xp:0,rewards:[],learningDays:{},readNotices:[]};}
export function readBrowserRecord():BrowserRecord {const raw=localStorage.getItem(key);if(!raw)return emptyBrowserRecord();try {const value=JSON.parse(raw);if(value.version!==1||!Array.isArray(value.judgments)||!Array.isArray(value.progress))throw Error();return {...emptyBrowserRecord(),...value};}catch {throw Error('本机记录暂时无法读取，请保留浏览器数据后重试。');}}
export function saveBrowserRecord(record:BrowserRecord){try{localStorage.setItem(key,JSON.stringify(record));}catch{throw Error('浏览器未允许保存或空间不足，本次记录尚未保存。请开启本地存储后重试。');}}
export function hydrateBrowserState(shared:QuestState,record:BrowserRecord):QuestState {
 const state=structuredClone(shared),date=state.session.date;
 state.settings=record.settings;state.xp=record.xp;state.progress=record.progress;state.learningVisitId=record.learningVisitId;
 state.cards=[...state.cards,...record.cards.filter(c=>!state.cards.some(s=>s.id===c.id))];
 state.forecasts=[...record.forecasts,...state.forecasts.filter(f=>!record.forecasts.some(s=>s.id===f.id))];
 state.judgment=record.judgments.find(j=>j.date===date);
 state.forecast=state.forecasts.filter(f=>f.date===date).sort((a,b)=>b.version-a.version).find(f=>!state.judgment||f.id===state.judgment.forecastId);
 state.reviews=[];
 for(const day of [...new Set(state.forecasts.map(f=>f.date))]) {
  const judgment=record.judgments.find(j=>j.date===day),actual=state.bars.find(b=>b.symbol==='QQQ'&&b.date===day);
  const forecast=judgment?state.forecasts.find(f=>f.id===judgment.forecastId):state.forecasts.filter(f=>f.date===day).sort((a,b)=>b.version-a.version)[0];
  if(actual&&forecast&&sessionReady(day,new Date(state.now))&&sessionReady(day,new Date(actual.fetchedAt)))state.reviews.push({...scoreForecast(forecast,actual,judgment),...record.notes[`review:${day}`]});
 }
 state.reviews.sort((a,b)=>b.date.localeCompare(a.date));
 record.learningDays[date]=assignDaily(state.cards,record.progress,date,record.learningDays[date]||[],undefined,record.learningVisitId);
 state.dailyCardIds=record.learningDays[date];state.dailyCardReasons={};
 state.adventure=dailyAdventure(record.adventure,state.now);
 state.trackingWeeks=weeklyTracking(state,record.judgments);
 state.weeklySummary=state.trackingWeeks[0]?.summary||'从今天开始记录自己的判断与复盘。';
 state.notices=state.events.filter(e=>Date.parse(e.at)>Date.parse(state.now)&&Date.parse(e.at)-Date.parse(state.now)<=30*60000).map(e=>({id:`event:${e.id}`,title:e.title,body:'重大事件将在30分钟内公布，先核对情景和风险。',at:e.at,href:'/?view=events',read:record.readNotices.includes(`event:${e.id}`)}));
 return state;
}
export function applyBrowserCommand(shared:QuestState,record:BrowserRecord,cmd:QuestCommand,now=shared.now):QuestState {
 const current=hydrateBrowserState({...shared,now,session:sessionFor(new Date(now))},record),date=current.session.date;
 const award=(id:string,xp:number)=>{if(!record.rewards.includes(id)){record.rewards.push(id);record.xp+=xp;}};
 if(cmd.type==='learningVisit'){if(record.learningVisitId!==cmd.visitId){beginLearningVisit(record.progress,cmd.visitId);record.learningVisitId=cmd.visitId;}}
 else if(cmd.type==='judgment'){
  if(record.judgments.some(j=>j.date===date))throw Error('今天的判断已经封存，无法覆盖。');
  const forecast=current.forecasts.find(f=>f.id===cmd.forecastId&&f.date===date);
  if(!forecast||!current.session.isTradingDay||Date.parse(now)>=Date.parse(current.session.openAt)||Date.parse(forecast.createdAt)>=Date.parse(current.session.openAt))throw Error('盘前判断已经截止，请等待下一交易日。');
  if(!cmd.reason.trim())throw Error('请写一句判断理由。');
  const judgment:Judgment={id:`judgment:${date}`,date,forecastId:forecast.id,direction:cmd.direction,confidence:cmd.confidence,reason:cmd.reason.trim().slice(0,2000),createdAt:now,lockedAt:now,eligible:true};
  record.judgments.push(judgment);record.forecasts.push(structuredClone(forecast));award(`judgment:${date}`,10);
 }else if(cmd.type==='card'){
  const card=current.cards.find(c=>c.id===cmd.cardId);if(!card)throw Error('卡牌不存在。');
  let p=record.progress.find(p=>p.cardId===card.id);if(!p){p={cardId:card.id,bookmarked:false,skipped:false,intervalDays:0,correctCount:0,attempts:0};record.progress.push(p);}
  if(!record.cards.some(c=>c.id===card.id))record.cards.push(structuredClone(card));
  if(cmd.action==='bookmark')p.bookmarked=true;
  if(cmd.action==='skip')p.skipped=true;
  if(cmd.action==='answer'){
   if(cmd.answerIndex===undefined)throw Error('请先选择答案。');
   const result=answerCard(p,card,cmd.answerIndex,card.answerIndex,card.choices.length,now,record.learningVisitId);Object.assign(p,result.progress);delete p.dueDate;if(result.award)award(`card:${date}:${conceptKey(card)}`,result.award);
  }
  if(cmd.action==='review'||cmd.action==='master'){const result=classifyCard(p,card,cmd.action,now,record.learningVisitId);Object.assign(p,result);delete p.dueDate;delete p.reviewVisitId;if(!result.masteredAt)delete p.masteredAt;}
  if(cmd.action==='reset'){for(const item of record.progress.filter(x=>(x.conceptId||x.cardId)===conceptKey(card))){delete item.masteredAt;delete item.lastDispositionAt;delete item.lastDispositionVisitId;delete item.reviewVisitId;item.learningStatus='review';item.reviewPending=true;}}
 }else if(cmd.type==='review'){
  if(!current.reviews.some(r=>r.id===cmd.reviewId))throw Error('战报不存在。');
  if(!cmd.lesson.trim())throw Error('请写一句教训。');
  record.notes[cmd.reviewId]={traded:cmd.traded,tradeReason:cmd.tradeReason.slice(0,2000),tradeResult:cmd.tradeResult.slice(0,2000),lesson:cmd.lesson.slice(0,2000),completedAt:record.notes[cmd.reviewId]?.completedAt||now};award(`review:${cmd.reviewId}`,20);
 }else if(cmd.type==='walkthrough'){record.adventure=completeAdventure(record.adventure,cmd.section,now);award(`walk:${date}:${cmd.section}`,5);}
 else if(cmd.type==='settings'){if(cmd.settings.watchlist.length>5||!Number.isFinite(cmd.settings.threshold)||cmd.settings.threshold<=0)throw Error('设置格式无效。');record.settings=structuredClone(cmd.settings);}
 else if(cmd.type==='notice'){if(!record.readNotices.includes(cmd.noticeId))record.readNotices.push(cmd.noticeId);}
 return hydrateBrowserState(current,record);
}
