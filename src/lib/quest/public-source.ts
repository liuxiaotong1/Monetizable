import {refreshNative} from './native-feed';
import {unstable_cache} from 'next/cache';
import {sessionFor,marketDate} from './domain';
import {reportScheduleContext} from './agent-report';
import {learningCards} from './learning';
import type {QuestState} from './types';
import fallback from '@/data/public-feed.json';
// Fixed upstream and fixed endpoint. No request-controlled URL, path or headers.
const SOURCE='https://qqq-quest-yoyo.liuxiaotong268.chatgpt.site/api/public-feed';
export interface PublicFeed {version:number;exportedAt:string;state:QuestState;reports:unknown;intelligence:unknown;stale?:boolean}
function normalize(input:unknown):PublicFeed {
 const value=structuredClone(input) as PublicFeed;if(value?.version!==1||!value.state||!Array.isArray(value.state.bars)||!Array.isArray(value.state.cards))throw Error('公开资料格式无效');
 const now=new Date(),src=value.state;
 const state:QuestState={mode:'live',now:now.toISOString(),session:sessionFor(now),bars:src.bars,events:src.events||[],forecasts:src.forecasts||[],sources:src.sources||[],cards:src.cards.length?src.cards:learningCards,learningUpdate:src.learningUpdate?{...src.learningUpdate,status:src.learningUpdate.date===marketDate(now)?'ready':'stale'}:undefined,dailyCardIds:[],progress:[],reviews:[],xp:0,settings:{watchlist:[],threshold:.3,notifications:{daily:true,events:true,results:true},displayTimeZone:'Europe/Paris'},notices:[],weeklySummary:'开始记录自己的判断与学习。'};
 return {version:1,exportedAt:value.exportedAt,state,reports:{...(value.reports as object||{reports:[]}),schedule:reportScheduleContext(now)},intelligence:value.intelligence||{sources:[]}};
}
const fetchShared=unstable_cache(async()=>{
 const token=process.env.QUEST_SOURCE_SITE_TOKEN;if(!token)throw Error('公开资料后台尚未连接');
 const response=await fetch(SOURCE,{headers:{'OAI-Sites-Authorization':`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('公开资料后台暂不可用');return normalize(await response.json());
},['qqq-public-feed-v1'],{revalidate:60});
export async function getPublicFeed():Promise<PublicFeed> {
 try{return await refreshNative(normalize(await fetchShared()));}catch{
  const feed=normalize(fallback);feed.stale=true;
  feed.state.sources.push({name:'公开数据连接',status:'delayed',message:'保留上次公开快照，后台连接恢复后自动更新。',lastSuccess:feed.exportedAt});return await refreshNative(feed);
 }
}
