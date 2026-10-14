"use client";
import { useEffect, useState } from 'react';
import './entry-score.css';
const dimensions = [
  {weight:35,zh:'QQQ 价格结构',en:'QQQ price structure',detailZh:'突破、回踩确认、VWAP、关键支撑阻力',detailEn:'Breakouts, confirmed retests, VWAP and key support / resistance'},
  {weight:20,zh:'市场内部强度',en:'Market internals',detailZh:'NVDA、MSFT 等权重股及市场广度',detailEn:'Heavyweights such as NVDA / MSFT and market breadth'},
  {weight:15,zh:'DXY 与美债收益率',en:'DXY & Treasury yields',detailZh:'是否支持所选方向，尤其实际收益率',detailEn:'Whether dollar and yields support your direction, especially real yields'},
  {weight:15,zh:'动量与成交量',en:'Momentum & volume',detailZh:'突破是否伴随相对成交量及持续动量',detailEn:'Relative volume and sustained momentum behind a breakout'},
  {weight:15,zh:'期权定价与风险收益',en:'Options pricing & reward / risk',detailZh:'IV、Delta、Theta、流动性与预期盈亏比',detailEn:'IV, Delta, Theta, liquidity and expected reward / risk'},
];
const initial=[2,2,1,1,0];
export default function EntryScore({locale='en',symbol='QQQ'}:{locale?:'en'|'zh';symbol?:string}) {
  const zh=locale==='zh',[mode,setMode]=useState<'stocks'|'options'>('stocks'),[scores,setScores]=useState({stocks:[...initial],options:[...initial]});
  useEffect(()=>setScores({stocks:[...initial],options:[...initial]}),[symbol]);
  const values=scores[mode],setValues=(update:(previous:number[])=>number[])=>setScores(previous=>({...previous,[mode]:update(previous[mode])}));
  const activeDimensions=dimensions.map((item,i)=>i===0?{...item,zh:symbol+' 价格结构',en:symbol+' price structure',detailZh:mode==='stocks'?'周线 / 日线趋势、突破回踩、关键支撑阻力与 VWAP':'盘中突破、回踩确认、VWAP 与关键支撑阻力',detailEn:mode==='stocks'?'Weekly / daily trend, breakout retests, key levels and VWAP':'Intraday breakouts, confirmed retests, VWAP and key levels'}:i===1&&symbol!=='QQQ'?{...item,detailZh:'同业股票、行业 ETF 与市场广度，观察是否支持所选方向',detailEn:'Sector peers, sector ETFs and market breadth supporting your direction'}:i===4&&mode==='stocks'?{...item,zh:'风险收益与交易执行',en:'Reward / risk & execution',detailZh:'入场与止损距离、仓位、流动性、预期盈亏比与跳空风险',detailEn:'Entry-to-stop distance, position size, liquidity, reward / risk and gap exposure'}:i===4?{...item,detailZh:'IV、Delta / Gamma、Theta、到期时间、价差与流动性、策略最大亏损和盈亏比',detailEn:'IV, Delta / Gamma, Theta, expiration, bid–ask spread, liquidity and strategy risk / reward'}:item);
  const score=dimensions.reduce((total,item,i)=>total+item.weight*values[i]/2,0);
  return <section className="entry-score" aria-label={zh?'五维入场评分':'Five-dimension entry score'}>
    <header><div><span className="eyebrow">🎯 {zh?'五维入场评分 · 示范模型':'FIVE-DIMENSION ENTRY SCORE · DEMO MODEL'}</span><h2>{zh?'交易条件评分':'Trade conditions score'}</h2></div><div className="entry-total" role="status" aria-live="polite"><strong>{score}</strong><span>/100</span><p>{score>=80?(zh?'更多条件一致':'More conditions aligned'):(zh?'等待更多确认':'Wait for more confirmation')}</p></div></header>
    <div className="entry-context"><div className="entry-mode" aria-label={zh?'交易模式':'Trading mode'}>{(['stocks','options'] as const).map(value=><button type="button" key={value} aria-pressed={mode===value} onClick={()=>setMode(value)}>{value==='stocks'?(zh?'美股交易':'US stocks'):(zh?'期权交易':'Options')}</button>)}</div><span>{zh?'观察标的：':'Underlying: '}<strong>{symbol}</strong></span></div><p className="entry-note">{zh?'按每项 0 / 1 / 2 分调整，观察不同条件对决策的影响。权重是建议的启发式规则，未经回测验证。初始 70 分是演示设置，不是实时市场评估，也不代表胜率或下单建议。':'Adjust each dimension to 0 / 1 / 2 to explore how conditions change the score. Suggested heuristic weights, not backtested. The initial 70 is a demo, not a live market assessment, win probability or instruction to trade.'}</p>
    <div className="entry-dimensions">{activeDimensions.map((item,i)=><fieldset key={item.en}><legend>{zh?item.zh:item.en} <span>({item.weight}%)</span></legend><div className="entry-points">{item.weight*values[i]/2}/{item.weight}</div><p>{zh?item.detailZh:item.detailEn}</p><div className="entry-options">{(zh?['不支持','中性','支持']:['Not supportive','Neutral','Supportive']).map((label,value)=><button type="button" key={value} aria-pressed={values[i]===value} onClick={()=>setValues(previous=>previous.map((v,index)=>index===i?value:v))}><span>{value}</span>{label}</button>)}</div><div className="entry-bar" aria-hidden="true"><i style={{width:values[i]*50+'%'}}/></div></fieldset>)}</div>
    <button className="secondary" type="button" onClick={()=>setValues(()=>[...initial])}>{zh?'重置评分':'Reset score'}</button>
  </section>;
}
