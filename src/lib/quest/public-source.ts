import 'server-only';
import {refreshNative} from './native-feed';
import {fromSnapshot,publishLearning,type PublicFeedSnapshot} from './feed-snapshot';
import {readFeedMeta,readSharedBody,type FeedMeta} from './feed-store';
import {applyEventValues,type EventValuesFeed} from './event-values';
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
const MEMORY_MS=5*60*1000,SNAPSHOT_MS=20*60*1000;
interface Memory {savedAt:number;meta:FeedMeta;feed:PublicFeed}
let memory:Memory|undefined,loading:Promise<PublicFeed>|undefined;
function remember(feed:PublicFeed,meta:FeedMeta){memory={savedAt:Date.now(),meta,feed};return feed;}
async function overlayFresh(feed:PublicFeed,meta:FeedMeta){
 if(meta.newsAt&&Date.parse(meta.newsAt)>Date.parse(feed.exportedAt)){
  const stored=await readSharedBody<{body?:PublicFeed['intelligence']}>('news-native');
  if(stored?.body){feed.intelligence=stored.body;publishLearning(feed.state,feed.intelligence);}
 }
 if(meta.valuesAt&&Date.parse(meta.valuesAt)>Date.parse(feed.exportedAt)){
  const stored=await readSharedBody<{body?:EventValuesFeed}>('event-values-native');
  if(stored?.body){feed.state.events=applyEventValues(feed.state.events,stored.body);publishLearning(feed.state,feed.intelligence);}
 }
 return feed;
}
async function readSnapshot(meta:FeedMeta){
 const snapshot=await readSharedBody<PublicFeedSnapshot>('public-feed-snapshot');
 if(!snapshot||snapshot.version!==1)return;
 const feed=await overlayFresh(fromSnapshot(snapshot,foundationFeed()),meta);
 return remember(feed,meta);
}
async function loadPublicFeed():Promise<PublicFeed> {
 const meta=await readFeedMeta();
 if(memory&&meta.snapshotAt&&meta.snapshotAt===memory.meta.snapshotAt&&meta.newsAt===memory.meta.newsAt&&meta.valuesAt===memory.meta.valuesAt){
  memory.savedAt=Date.now();return memory.feed;
 }
 if(memory&&meta.snapshotAt&&meta.snapshotAt===memory.meta.snapshotAt){
  const feed=await overlayFresh(structuredClone(memory.feed),meta);
  return remember(feed,meta);
 }
 if(meta.snapshotAt&&Date.now()-Date.parse(meta.snapshotAt)<SNAPSHOT_MS){
  const feed=await readSnapshot(meta);
  if(feed)return feed;
 }
 const feed=await refreshNative(foundationFeed());
 return remember(feed,await readFeedMeta().catch(()=>meta));
}
/** Reads stay on the in-memory or stored snapshot. Provider refresh stays on the scheduler. */
export async function getPublicFeed():Promise<PublicFeed> {
 try{
  if(memory&&Date.now()-memory.savedAt<MEMORY_MS)return structuredClone(memory.feed);
  if(!loading)loading=loadPublicFeed().finally(()=>{loading=undefined;});
  return structuredClone(await loading);
 }catch{return memory?structuredClone(memory.feed):foundationFeed();}
}
/** Notification planning reads the latest snapshot and does not start another provider refresh. */
export async function readCachedFeed():Promise<PublicFeed|undefined> {
 try{
  if(memory?.meta.snapshotAt&&Date.now()-memory.savedAt<MEMORY_MS)return structuredClone(memory.feed);
  const meta=await readFeedMeta();
  if(!meta.snapshotAt)return;
  const feed=await readSnapshot(meta);
  return feed?structuredClone(feed):undefined;
 }catch{return memory?.feed?structuredClone(memory.feed):undefined;}
}
/** Scheduled work starts from the foundation without running the refresh twice. */
export function foundationFeed():PublicFeed {return normalize(fallback);}
