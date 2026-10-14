"use client";
import { useEffect, useRef, useState, useId } from 'react';
import type { Bar, Settings, WatchItem } from '@/lib/quest/types';
import './watchlist-chart.css';
type Exchange = NonNullable<WatchItem['exchange']>;
const legacyExchange=(symbol:string):Exchange=>['IBM','JPM','DIS','KO','BAC','XOM','V','BRK.B'].includes(symbol)?'NYSE':'NASDAQ';
export default function WatchlistChart({settings,onSave,selected,onSelect,locale='en',latest,busy=false}:{settings:Settings;onSave:(settings:Settings)=>Promise<unknown>;selected:string;onSelect:(symbol:string)=>void;locale?:'en'|'zh';latest?:Bar;busy?:boolean}) {
  const zh=locale==='zh',id=useId(),host=useRef<HTMLDivElement>(null);
  const [ticker,setTicker]=useState(''),[exchange,setExchange]=useState<Exchange>('NASDAQ'),[interval,setInterval]=useState('D'),[attempt,retry]=useState(0),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[error,setError]=useState('');
  const watch=settings.watchlist.filter(item=>item.symbol!=='QQQ');
  const active=watch.find(item=>item.symbol===selected),symbol=selected==='QQQ'||active?selected:'QQQ',venue=symbol==='QQQ'?'NASDAQ':active?.exchange||legacyExchange(symbol),chartSymbol=venue+':'+symbol;
  const url='https://www.tradingview.com/symbols/'+venue+'-'+encodeURIComponent(symbol)+'/';
  useEffect(()=>{if(selected!==symbol)onSelect(symbol);},[selected,symbol,onSelect]);
  useEffect(()=>{
    const container=host.current;if(!container)return;let disposed=false,frame:HTMLIFrameElement|null=null;
    setLoading(true);setFailed(false);
    const ready=()=>{if(!disposed){setLoading(false);setFailed(false);clearTimeout(timer);}};
    const observer=new MutationObserver(()=>{const next=container.querySelector('iframe');if(next&&next!==frame){frame=next;frame.title=(zh?'参考行情图表：':'Reference price chart: ')+chartSymbol;frame.addEventListener('load',ready);}});
    observer.observe(container,{childList:true,subtree:true});
    const script=document.createElement('script');script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';script.async=true;
    script.textContent=JSON.stringify({autosize:true,symbol:chartSymbol,interval,timezone:'America/New_York',theme:'dark',style:'1',locale:zh?'zh_CN':'en',allow_symbol_change:false,withdateranges:true,hide_side_toolbar:true,save_image:false,calendar:false,support_host:'https://www.tradingview.com'});
    const timeout=()=>{if(!disposed){setLoading(false);setFailed(true);}};script.onerror=timeout;const timer=setTimeout(timeout,25000);
    const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';widget.style.height='100%';container.replaceChildren(widget,script);
    return()=>{disposed=true;clearTimeout(timer);observer.disconnect();frame?.removeEventListener('load',ready);container.replaceChildren();};
  },[chartSymbol,interval,zh,attempt]);
  async function add(){
    const value=ticker.trim().toUpperCase();setError('');
    if(!/^[A-Z][A-Z0-9]{0,5}(?:[.-][A-Z0-9]{1,2})?$/.test(value)){setError(zh?'请输入有效股票代码，例如 NVDA、AAPL 或 BRK.B。':'Enter a ticker such as NVDA, AAPL or BRK.B.');return;}
    if(value==='QQQ'||watch.some(item=>item.symbol===value)){onSelect(value);setTicker('');return;}
    if(watch.length>=5){setError(zh?'最多 5 个自选股，请先移除一个。':'Up to five watchlist stocks. Remove one first.');return;}
    const result=await onSave({...settings,watchlist:[...watch,{symbol:value,exchange,irUrl:'',weeklyNote:''}]});
    if(result!==false){onSelect(value);setTicker('');}else setError(zh?'保存失败，请重试。':'Could not save. Please retry.');
  }
  async function remove(item:WatchItem){const result=await onSave({...settings,watchlist:watch.filter(w=>w.symbol!==item.symbol)});if(result!==false&&symbol===item.symbol)onSelect('QQQ');}
  return <section className="watchlist-observatory" aria-label={zh?'自选股与行情图表':'Watchlist & price chart'}>
    <header><div><span className="eyebrow">🔭 {zh?'市场望远镜':'MARKET OBSERVATORY'}</span><h2>{zh?'自选股与图表':'Your watchlist & chart'}</h2></div><span>{zh?'QQQ + 最多 5 个自选股':'QQQ + up to 5 stocks'}</span></header>
    <form className="watchlist-add" onSubmit={event=>{event.preventDefault();void add();}}><label htmlFor={id+'-ticker'}>{zh?'添加自选股':'Add a stock'}<input id={id+'-ticker'} value={ticker} onChange={event=>setTicker(event.target.value)} maxLength={9} placeholder="NVDA / AAPL / TSLA" autoCapitalize="characters" autoComplete="off" /></label><label htmlFor={id+'-exchange'}>{zh?'交易所':'Exchange'}<select id={id+'-exchange'} value={exchange} onChange={event=>setExchange(event.target.value as Exchange)}><option>NASDAQ</option><option>NYSE</option><option>AMEX</option></select></label><button className="primary" type="submit" disabled={busy||!ticker.trim()}>{zh?'+ 添加并查看':'+ Add & view'}</button></form>
    {error&&<p className="watchlist-error" role="alert">{error}</p>}
    <div className="watchlist-symbols"><button type="button" aria-pressed={symbol==='QQQ'} onClick={()=>onSelect('QQQ')}>QQQ</button>{watch.map(item=><div key={item.symbol}><button type="button" aria-pressed={symbol===item.symbol} onClick={()=>onSelect(item.symbol)}>{item.symbol}</button><button className="watch-remove" type="button" disabled={busy} aria-label={(zh?'移除 ':'Remove ')+item.symbol} onClick={()=>void remove(item)}>×</button></div>)}</div>
    <div className="watchlist-toolbar"><strong>{chartSymbol}</strong><div aria-label={zh?'图表周期':'Chart interval'}>{[['D',zh?'日线':'Daily'],['60',zh?'1 小时':'1 hour'],['15',zh?'15 分钟':'15 min']].map(([value,label])=><button type="button" key={value} aria-pressed={interval===value} onClick={()=>setInterval(value)}>{label}</button>)}</div></div>
    {symbol==='QQQ'&&latest&&<p className="watchlist-caption">{zh?'QQQ 最近确认收盘：':'QQQ latest verified close: '} ${latest.close.toFixed(2)} · {latest.date}</p>}
    <div className="watchlist-chart-stage"><div ref={host} className="tradingview-widget-container watchlist-chart-host"/>{(loading||failed)&&<div className="watchlist-chart-status" role="status">{failed?<><strong>{zh?'参考图表暂时无法加载':'Reference chart unavailable'}</strong><button className="secondary" type="button" onClick={()=>retry(n=>n+1)}>{zh?'重试连接':'Retry'}</button><a href={url} target="_blank" rel="noopener noreferrer">{zh?'打开行情来源 ↗':'Open price source ↗'}</a></>:<span>{zh?'正在连接图表…':'Connecting chart…'}</span>}</div>}</div>
    <footer><a href={url} target="_blank" rel="noopener noreferrer">{symbol} {zh?'参考图表':'chart'} ↗</a><span>TradingView · {zh?'参考行情可能延迟':'Reference prices may be delayed'}</span></footer>
    <p className="watchlist-caption">{zh?'切换标的同步下方入场评分；今日判断、剧本与战报仍以 QQQ 为准。自选股保存到当前浏览器，登录后随账号同步。':'Switch the chart underlying to update the entry score below. Daily predictions and reviews remain tied to QQQ. Your watchlist stays in this browser and syncs with your account when signed in.'}</p>
  </section>;
}
