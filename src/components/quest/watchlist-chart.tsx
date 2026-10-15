"use client";
import {useLocale,LocalizeTree} from '@/components/i18n/locale-provider';
import { useEffect, useRef, useState, useId } from 'react';
import {knownStock,type StockMatch} from '@/lib/quest/stock-symbols';
import type { Bar, Settings, WatchItem } from '@/lib/quest/types';
import './watchlist-chart.css';
import DxyChart from './dxy-chart';
import {DXY_SOURCE} from '@/lib/quest/dollar-index';
type Exchange = NonNullable<WatchItem['exchange']>;
const legacyExchange=(symbol:string):Exchange=>['IBM','JPM','DIS','KO','BAC','XOM','V','BRK.B'].includes(symbol)?'NYSE':'NASDAQ';
export default function WatchlistChart({settings,onSave,selected,onSelect,locale='en',latest,busy=false}:{settings:Settings;onSave:(settings:Settings)=>Promise<unknown>;selected:string;onSelect:(symbol:string)=>void;locale?:'en'|'zh';latest?:Bar;busy?:boolean}) {
  const language=useLocale();
  const zh=locale==='zh',id=useId(),host=useRef<HTMLDivElement>(null);
  const [ticker,setTicker]=useState(''),[interval,setInterval]=useState('D'),[attempt,retry]=useState(0),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[error,setError]=useState('');
  const [searching,setSearching]=useState(false),[matches,setMatches]=useState<StockMatch[]>([]);
  const repairAttempt=useRef('');
  const watch=settings.watchlist.filter(item=>item.symbol!=='QQQ').map(item=>{const match=knownStock(item.symbol);return match?{...item,symbol:match.symbol,exchange:match.exchange}:item;}).filter((item,index,list)=>list.findIndex(w=>w.symbol===item.symbol)===index);
  const canonicalSelected=knownStock(selected)?.symbol||selected;
  useEffect(()=>{const key=JSON.stringify(settings.watchlist);if(busy||repairAttempt.current===key||key===JSON.stringify(watch))return;repairAttempt.current=key;void onSave({...settings,watchlist:watch});},[settings,watch,busy,onSave]);
  const active=watch.find(item=>item.symbol===canonicalSelected),symbol=canonicalSelected==='QQQ'||active?canonicalSelected:'QQQ',venue=symbol==='QQQ'?'NASDAQ':active?.exchange||legacyExchange(symbol),chartSymbol=venue+':'+symbol;
  const url=symbol==='DXY'?DXY_SOURCE:'https://www.tradingview.com/symbols/'+venue+'-'+encodeURIComponent(symbol)+'/';
  useEffect(()=>{if(selected!==symbol)onSelect(symbol);},[selected,symbol,onSelect]);
  useEffect(()=>{
    const container=host.current;if(!container||symbol==='DXY')return;let disposed=false,frame:HTMLIFrameElement|null=null;
    setLoading(true);setFailed(false);
    const ready=()=>{if(!disposed){setLoading(false);setFailed(false);clearTimeout(timer);}};
    const observer=new MutationObserver(()=>{const next=container.querySelector('iframe');if(next&&next!==frame){frame=next;frame.title=(zh?'参考行情图表：':'Reference price chart: ')+chartSymbol;frame.addEventListener('load',ready);}});
    observer.observe(container,{childList:true,subtree:true});
    const script=document.createElement('script');script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';script.async=true;
    script.textContent=JSON.stringify({autosize:true,symbol:chartSymbol,interval,timezone:'America/New_York',theme:'dark',style:'1',locale:zh?'zh_CN':language==='fr'?'fr':'en',allow_symbol_change:false,withdateranges:true,hide_side_toolbar:true,save_image:false,calendar:false,support_host:'https://www.tradingview.com'});
    const timeout=()=>{if(!disposed){setLoading(false);setFailed(true);}};script.onerror=timeout;const timer=setTimeout(timeout,25000);
    const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';widget.style.height='100%';container.replaceChildren(widget,script);
    return()=>{disposed=true;clearTimeout(timer);observer.disconnect();frame?.removeEventListener('load',ready);container.replaceChildren();};
  },[chartSymbol,symbol,interval,zh,language,attempt]);
  async function saveMatch(match:StockMatch){
    setError('');
    if(match.symbol==='QQQ'||watch.some(item=>item.symbol===match.symbol)){onSelect(match.symbol);setTicker('');setMatches([]);return;}
    if(watch.length>=5){setError(zh?'最多 5 个自选标的，请先移除一个。':'Up to five watchlist symbols. Remove one first.');return;}
    const result=await onSave({...settings,watchlist:[...watch,{symbol:match.symbol,exchange:match.exchange,irUrl:'',weeklyNote:''}]});
    if(result!==false){onSelect(match.symbol);setTicker('');setMatches([]);}else setError(zh?'保存失败，请重试。':'Could not save. Please retry.');
  }
  async function add(){
    if(searching||busy)return;
    setSearching(true);setError('');setMatches([]);
    try{
      const response=await fetch('/api/market/symbols?q='+encodeURIComponent(ticker.trim()));
      if(!response.ok)throw Error();
      const data=await response.json() as {matches:StockMatch[]};
      const exact=data.matches.find(m=>m.symbol===ticker.trim().toUpperCase());
      if(exact||data.matches.length===1)await saveMatch(exact||data.matches[0]);
      else if(data.matches.length)setMatches(data.matches);
      else setError(zh?'未找到标的；支持美股、ETF 和 DXY 美元指数。':'No symbol found. Try a US stock, ETF, or DXY dollar index.');
    }catch{setError(zh?'暂时无法确认标的，请稍后重试。':'Could not verify the underlying. Please retry.');}
    finally{setSearching(false);}
  }
  async function remove(item:WatchItem){const result=await onSave({...settings,watchlist:watch.filter(w=>w.symbol!==item.symbol)});if(result!==false&&symbol===item.symbol)onSelect('QQQ');}
  return <LocalizeTree>{<section className="watchlist-observatory" aria-label={zh?'自选标的与行情图表':'Watchlist & price chart'}>
    <header><div><span className="eyebrow">🔭 {zh?'市场望远镜':'MARKET OBSERVATORY'}</span><h2>{zh?'自选标的与图表':'Your watchlist & chart'}</h2></div><span>{zh?'QQQ + 最多 5 个自选标的':'QQQ + up to 5 symbols'}</span></header>
    <form className="watchlist-add" onSubmit={event=>{event.preventDefault();void add();}}><label htmlFor={id+'-ticker'}>{zh?'添加自选标的':'Add a symbol'}<input id={id+'-ticker'} value={ticker} onChange={event=>setTicker(event.target.value)} maxLength={60} placeholder={zh?"AAPL / DXY / 美元指数":"Apple / AAPL / DXY"} autoCapitalize="characters" autoComplete="off" /></label><button className="primary" type="submit" disabled={busy||searching||!ticker.trim()}>{searching?(zh?'确认标的…':'Finding symbol…'):(zh?'+ 添加并查看':'+ Add & view')}</button></form>
    <p className="watchlist-caption">{zh?'支持公司名称、股票代码或 DXY / 美元指数，自动匹配图表来源。':'Enter a company name, stock ticker, or DXY dollar index. The chart source is matched automatically.'}</p>
    {!!matches.length&&<div className="watchlist-search-results" aria-label={zh?'选择搜索结果':'Choose a search result'}>{matches.map(match=><button type="button" key={match.exchange+match.symbol} disabled={busy||searching} onClick={()=>void saveMatch(match)}><strong>{match.symbol}</strong><span>{match.name} · {match.exchange}</span></button>)}</div>}
    {error&&<p className="watchlist-error" role="alert">{error}</p>}
    <div className="watchlist-symbols"><button type="button" aria-pressed={symbol==='QQQ'} onClick={()=>onSelect('QQQ')}>QQQ</button>{watch.map(item=><div key={item.symbol}><button type="button" aria-pressed={symbol===item.symbol} onClick={()=>onSelect(item.symbol)}>{item.symbol}</button><button className="watch-remove" type="button" disabled={busy} aria-label={(zh?'移除 ':'Remove ')+item.symbol} onClick={()=>void remove(item)}>×</button></div>)}</div>
    <div className="watchlist-toolbar"><strong>{symbol==='DXY'?'DXY · Yahoo Finance':chartSymbol}</strong><div aria-label={zh?'图表周期':'Chart interval'}>{[['D',zh?'日线':'Daily'],['60',zh?'1 小时':'1 hour'],['15',zh?'15 分钟':'15 min']].map(([value,label])=><button type="button" key={value} aria-pressed={interval===value} onClick={()=>setInterval(value)}>{label}</button>)}</div></div>
    {symbol==='QQQ'&&latest&&<p className="watchlist-caption">{zh?'QQQ 最近确认收盘：':'QQQ latest verified close: '} ${latest.close.toFixed(2)} · {latest.date}</p>}
    <div className="watchlist-chart-stage">{symbol==='DXY'?<DxyChart key={interval} interval={interval} locale={locale}/>:<><div ref={host} className="tradingview-widget-container watchlist-chart-host"/>{(loading||failed)&&<div className="watchlist-chart-status" role="status">{failed?<><strong>{zh?'参考图表暂时无法加载':'Reference chart unavailable'}</strong><button className="secondary" type="button" onClick={()=>retry(n=>n+1)}>{zh?'重试连接':'Retry'}</button><a href={url} target="_blank" rel="noopener noreferrer">{zh?'打开行情来源 ↗':'Open price source ↗'}</a></>:<span>{zh?'正在连接图表…':'Connecting chart…'}</span>}</div>}</>}</div>
    <footer><a href={url} target="_blank" rel="noopener noreferrer">{symbol} {zh?'参考图表':'chart'} ↗</a><span>{symbol==='DXY'?'Yahoo Finance':'TradingView'} · {zh?'参考行情可能延迟':'Reference prices may be delayed'}</span></footer>
    <p className="watchlist-caption">{zh?'切换标的同步页面末尾的交易前 checklist；今日判断、剧本与战报仍以 QQQ 为准。自选股保存到当前浏览器，登录后随账号同步。':'Switch the chart underlying to update the pre-trade checklist at the end of this page. Daily predictions and reviews remain tied to QQQ. Your watchlist stays in this browser and syncs with your account when signed in.'}</p>
  </section>}</LocalizeTree>;
}
