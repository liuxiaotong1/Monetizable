import {updateDailyContent} from './daily-content';
import type {PublicFeed} from './public-source';
import type {HistoryPoint,MarketEvent,QuestState} from './types';

export interface KindHistory {history:HistoryPoint[];historySource?:MarketEvent['historySource']}
export interface PublicFeedSnapshot {
 version:1;
 exportedAt:string;
 bars?:QuestState['bars'];
 patches:Record<string,Partial<MarketEvent>>;
 added:MarketEvent[];
 removed:string[];
 historyByKind:Record<string,KindHistory>;
 sources:QuestState['sources'];
 forecasts:QuestState['forecasts'];
 intelligence:PublicFeed['intelligence'];
 reports?:{reports?:unknown;dailyStatus?:unknown;reportDate?:unknown};
}

const sharedFields=new Set(['history','historySource']);
function changedFields(base:MarketEvent,next:MarketEvent){
 const patch:Partial<MarketEvent>={};
 for(const key of new Set([...Object.keys(base),...Object.keys(next)] as (keyof MarketEvent)[])){
  if(sharedFields.has(key))continue;
  if(JSON.stringify(base[key])!==JSON.stringify(next[key]))(patch as Record<string,unknown>)[key]=next[key];
 }
 return patch;
}
function lean(event:MarketEvent):MarketEvent {
 const {history,historySource,...rest}=event;
 return {...rest,history:[]};
}
function kindHistory(events:MarketEvent[]){
 const history:Record<string,KindHistory>={};
 for(const event of events){
  if(!event.history?.length)continue;
  const current=history[event.kind];
  if(!current||event.history.length>=current.history.length)history[event.kind]={history:event.history,historySource:event.historySource};
 }
 return history;
}

/** Keep one copy of each price history and only the event fields that differ from the bundled feed. */
export function toSnapshot(feed:PublicFeed,baseline:{events:MarketEvent[];bars:QuestState['bars']}):PublicFeedSnapshot {
 const base=new Map(baseline.events.map(event=>[event.id,event]));
 const seen=new Set<string>();
 const patches:Record<string,Partial<MarketEvent>>={};
 const added:MarketEvent[]=[];
 for(const event of feed.state.events){
  seen.add(event.id);
  const prior=base.get(event.id);
  if(!prior){added.push(lean(event));continue;}
  const patch=changedFields(prior,event);
  if(Object.keys(patch).length)patches[event.id]=patch;
 }
 const baselineHistory=new Map<string,string>();
 for(const event of baseline.events){
  if(!event.history?.length||baselineHistory.has(event.kind))continue;
  baselineHistory.set(event.kind,JSON.stringify({history:event.history,historySource:event.historySource??null}));
 }
 const historyByKind=kindHistory(feed.state.events);
 for(const [kind,value] of Object.entries(historyByKind)){
  if(baselineHistory.get(kind)===JSON.stringify({history:value.history,historySource:value.historySource??null}))delete historyByKind[kind];
 }
 const reports=feed.reports as {reports?:unknown;dailyStatus?:unknown;reportDate?:unknown};
 return {
  version:1,
  exportedAt:feed.exportedAt,
  bars:JSON.stringify(feed.state.bars)===JSON.stringify(baseline.bars)?undefined:feed.state.bars,
  patches,added,removed:baseline.events.filter(event=>!seen.has(event.id)).map(event=>event.id),historyByKind,
  sources:feed.state.sources,forecasts:feed.state.forecasts,intelligence:feed.intelligence,
  reports:{reports:reports?.reports,dailyStatus:reports?.dailyStatus,reportDate:reports?.reportDate},
 };
}

export function publishLearning(state:QuestState,intelligence:unknown){
 const sources=(intelligence as {sources?:{id?:string;status?:string;items?:{title:string;url:string;publishedAt?:string}[]}[]}|undefined)?.sources||[];
 state.learningHeadlines=sources.filter(source=>source.id!=='polymarket'&&source.status==='ready').flatMap(source=>(source.items||[]).map(item=>({title:item.title,url:item.url,publishedAt:item.publishedAt})));
 updateDailyContent(state);
}

/** Rebuild the public feed from the bundled baseline plus the compact snapshot. Mutates `baseline`. */
export function fromSnapshot(snapshot:PublicFeedSnapshot,baseline:PublicFeed):PublicFeed {
 if(snapshot.bars?.length)baseline.state.bars=snapshot.bars;
 const removed=new Set(snapshot.removed||[]);
 const events=new Map<string,MarketEvent>();
 for(const event of baseline.state.events){
  if(removed.has(event.id))continue;
  const patch=snapshot.patches?.[event.id];
  const next=patch?{...event,...patch}:event;
  const history=snapshot.historyByKind?.[next.kind];
  if(history){next.history=history.history;if(history.historySource)next.historySource=history.historySource;}
  events.set(next.id,next);
 }
 for(const event of snapshot.added||[]){
  const history=snapshot.historyByKind?.[event.kind];
  events.set(event.id,{...event,history:history?.history||event.history||[],historySource:history?.historySource||event.historySource});
 }
 baseline.state.events=[...events.values()].sort((a,b)=>a.at.localeCompare(b.at));
 baseline.state.sources=snapshot.sources||baseline.state.sources;
 baseline.state.forecasts=snapshot.forecasts||baseline.state.forecasts;
 baseline.intelligence=snapshot.intelligence??baseline.intelligence;
 baseline.exportedAt=snapshot.exportedAt||baseline.exportedAt;
 if(snapshot.reports)baseline.reports={...(baseline.reports as object),...snapshot.reports,schedule:(baseline.reports as {schedule?:unknown}).schedule};
 publishLearning(baseline.state,baseline.intelligence);
 return baseline;
}
