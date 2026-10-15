'use client';
import {LocalizeTree} from '@/components/i18n/locale-provider';
import {useEffect,useState} from 'react';
import {LineChart} from './charts';
import type {parseDollarIndex} from '@/lib/quest/dollar-index';
type Feed=ReturnType<typeof parseDollarIndex>;
export default function DxyChart({interval,locale}:{interval:string;locale:'zh'|'en'}){
 const zh=locale==='zh';const [feed,setFeed]=useState<Feed>();const [failed,setFailed]=useState(false);const [attempt,retry]=useState(0);
 useEffect(()=>{const controller=new AbortController();async function read(){try{const response=await fetch('/api/market/dxy?interval='+encodeURIComponent(interval),{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(25000)])});if(!response.ok)throw Error();const next=await response.json() as Feed;if(next.symbol!=='DXY'||next.interval!==interval||!next.points?.length)throw Error();if(!controller.signal.aborted){setFeed(next);setFailed(false);}}catch{if(!controller.signal.aborted)setFailed(true);}}void read();const timer=setInterval(()=>void read(),60000);return()=>{controller.abort();clearInterval(timer);};},[interval,attempt]);
 if(!feed)return <LocalizeTree>{<div className="watchlist-chart-status" role="status">{failed?<><strong>{zh?'美元指数行情暂时不可用':'Dollar index data unavailable'}</strong><button className="secondary" onClick={()=>retry(n=>n+1)}>{zh?'重试':'Retry'}</button></>:<span>{zh?'正在读取美元指数…':'Loading dollar index…'}</span>}</div>}</LocalizeTree>;
 const format=(date:string)=>new Intl.DateTimeFormat(zh?'zh-CN':'en-GB',{timeZone:'America/New_York',month:'2-digit',day:'2-digit',...(interval==='D'?{}:{hour:'2-digit',minute:'2-digit',hourCycle:'h23' as const})}).format(new Date(date));
 const last=feed.points.at(-1)!;const stale=Date.now()-Date.parse(last.date)>4*86400000;
 return <LocalizeTree>{<div className="dxy-price-chart"><div className="dxy-price-heading"><div><span>DXY · {zh?'美元指数':'U.S. Dollar Index'}</span><strong>{last.value.toFixed(3)} <small>{zh?'点':'points'}</small></strong></div><span>{format(last.date)} ET{stale?(zh?' · 来源待更新':' · Awaiting source update'):''}</span></div><LineChart values={feed.points.map(p=>({...p,date:format(p.date)}))} color="#a899ff" height={230} labels locale={locale}/><p>{zh?'Yahoo Finance 公开参考行情；可能延迟，最新周期尚未收盘。':'Yahoo Finance public reference data; prices may be delayed and the latest period may be incomplete.'}</p><small>{zh?'取得于 ':'Retrieved '} {new Date(feed.fetchedAt).toLocaleString(zh?'zh-CN':'en-GB',{timeZone:'America/New_York'})} ET</small>{failed&&<p role="status">{zh?'刷新中断，保留上次行情与时间。':'Refresh interrupted; retaining the last quote and timestamp.'}</p>}</div>}</LocalizeTree>;
}
