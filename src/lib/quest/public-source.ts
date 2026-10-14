import {refreshNative} from './native-feed';
import {sessionFor,marketDate} from './domain';
import {reportScheduleContext} from './agent-report';
import {learningCards} from './learning';
import type {QuestState} from './types';
import fallback from '@/data/public-feed.json';
// Bundled foundation only; all changing public data is now refreshed into Supabase by this site.
export interface PublicFeed {version:number;exportedAt:string;state:QuestState;reports:unknown;intelligence:unknown;stale?:boolean}
function normalize(input:unknown):PublicFeed {
 const value=structuredClone(input) as PublicFeed;if(value?.version!==1||!value.state||!Array.isArray(value.state.bars)||!Array.isArray(value.state.cards))throw Error('公开资料格式无效');
 const now=new Date(),src=value.state;
 const state:QuestState={mode:'live',now:now.toISOString(),session:sessionFor(now),bars:src.bars,events:src.events||[],forecasts:src.forecasts||[],sources:src.sources||[],cards:src.cards.length?src.cards:learningCards,learningUpdate:src.learningUpdate?{...src.learningUpdate,status:src.learningUpdate.date===marketDate(now)?'ready':'stale'}:undefined,dailyCardIds:[],progress:[],reviews:[],xp:0,settings:{watchlist:[],threshold:.3,notifications:{daily:true,events:true,results:true},displayTimeZone:'Europe/Paris'},notices:[],weeklySummary:'开始记录自己的判断与学习。'};
 return {version:1,exportedAt:value.exportedAt,state,reports:{...(value.reports as object||{reports:[]}),schedule:reportScheduleContext(now)},intelligence:value.intelligence||{sources:[]}};
}
export async function getPublicFeed():Promise<PublicFeed> {
 return refreshNative(normalize(fallback));
}
