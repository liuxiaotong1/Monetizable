import 'server-only';
import {database} from '@/lib/account/db';
import type {RefreshClock} from './feed-plan';

const SNAPSHOT_KEY='public-feed-snapshot';
export interface FeedMeta {snapshotAt?:string;newsAt?:string;valuesAt?:string}
export interface RefreshSignals {snapshotUpdatedAt?:string;barsFetchedAt?:string;lastBarDate?:string;clocks:RefreshClock[]}

function iso(value:unknown){const time=new Date(value as string).getTime();return Number.isFinite(time)?new Date(time).toISOString():undefined;}

export async function readFeedMeta():Promise<FeedMeta> {
 const {rows}=await database().query("SELECT key,updated_at FROM quest_shared_data WHERE key IN ('public-feed-snapshot','news-native','event-values-native')");
 const meta:FeedMeta={};
 for(const row of rows){
  const at=iso(row.updated_at);
  if(row.key==='public-feed-snapshot')meta.snapshotAt=at;
  if(row.key==='news-native')meta.newsAt=at;
  if(row.key==='event-values-native')meta.valuesAt=at;
 }
 return meta;
}

export async function readSharedBody<T>(key:string):Promise<T|undefined> {
 const {rows}=await database().query('SELECT body FROM quest_shared_data WHERE key=$1',[key]);
 return rows[0]?.body as T|undefined;
}

export async function writeSnapshot(body:unknown){
 await database().query("INSERT INTO quest_shared_data(key,body) VALUES($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET body=EXCLUDED.body,updated_at=now()",[SNAPSHOT_KEY,JSON.stringify(body)]);
}

export async function readHealthSummary():Promise<{status?:string;learning?:{status?:string;count?:number};issues?:{sources:{name:string;status:string;message:string}[];overdue:string[]}}> {
 const {rows}=await database().query("SELECT body->>'status' AS status, body->'learning' AS learning, body->'issues' AS issues FROM quest_shared_data WHERE key='refresh-health'");
 return rows[0]||{};
}

/** Clock fields only. Large JSON bodies stay in the database. */
export async function loadRefreshSignals():Promise<RefreshSignals> {
 const {rows}=await database().query(`SELECT key,updated_at,
  CASE WHEN key='market-bars' THEN body->>'fetchedAt' END AS fetched_at,
  CASE WHEN key='market-bars' THEN (
    SELECT elem->>'date' FROM jsonb_array_elements(COALESCE(body->'bars','[]'::jsonb)) elem
    WHERE elem->>'symbol'='QQQ' ORDER BY elem->>'date' DESC LIMIT 1
  ) END AS last_bar,
  CASE WHEN key IN ('public-feed-snapshot','market-bars') THEN NULL ELSE NULLIF(body->>'version','') END AS version,
  CASE WHEN key IN ('public-feed-snapshot','market-bars') THEN NULL ELSE body->>'attemptedAt' END AS attempted_at,
  CASE WHEN key IN ('public-feed-snapshot','market-bars') THEN NULL ELSE NULLIF(body->>'error','') END AS error
 FROM quest_shared_data
 WHERE key IN ('public-feed-snapshot','news-native','event-values-native','market-bars','bea-calendar-native','fed-calendar-native')
  OR key LIKE 'calendar-native:%' OR key LIKE 'major-earnings:%' OR key LIKE 'history-native:%' OR key LIKE 'release-native:%'`);
 const signals:RefreshSignals={clocks:[]};
 for(const row of rows){
  if(row.key==='public-feed-snapshot')signals.snapshotUpdatedAt=iso(row.updated_at);
  else if(row.key==='market-bars'){signals.barsFetchedAt=row.fetched_at||undefined;signals.lastBarDate=row.last_bar||undefined;}
  else signals.clocks.push({key:row.key,version:row.version==null?undefined:Number(row.version),attemptedAt:row.attempted_at||undefined,error:row.error||undefined});
 }
 return signals;
}
