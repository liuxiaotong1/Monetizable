"use client";
import {LocalizeTree,useLocale} from '@/components/i18n/locale-provider';
import {marketProductName} from '@/lib/quest/market-label';
import {useId,useState} from 'react';
import './entry-score.css';
type Mode='stocks'|'options';
const signals=[['levels','突破 / 回踩 / 支撑阻力','Breakout / retest / key levels'],['vwap','VWAP / 均线','VWAP / moving averages'],['momentum','动量 / 相对成交量','Momentum / relative volume'],['breadth','权重股 / 市场广度','Heavyweights / market breadth'],['rates','美债收益率 / DXY','Treasury yields / DXY'],['event','数据 / 财报催化','Economic data / earnings catalyst'],['other','其它信号','Other signal']];
export default function EntryScore({locale='en',symbol='QQQ'}:{locale?:'en'|'zh';symbol?:string}){
  const zh=locale==='zh',id=useId(),[open,setOpen]=useState(false);
  return <LocalizeTree>{<section className="entry-checklist" aria-label={zh?'交易前五问':'Five-question pre-trade checklist'}>
    <span className="eyebrow">🧭 {zh?'交易前 · 先问自己五个问题':'BEFORE YOU TRADE · FIVE QUESTIONS'}</span>
    <h2>{zh?'先准备，再入场。':'Prepare before you enter.'}</h2>
    <label className="entry-opt-in"><input type="checkbox" checked={open} aria-controls={id} aria-expanded={open} onChange={event=>setOpen(event.target.checked)}/><span>{zh?'今日准备交易，展开入场评估':'I plan to trade today — open the entry checklist'}</span></label>
    {!open&&<p className="entry-note">{zh?'不交易也是一种选择。准备下单时，再检查事件、信号与风险。':'Sitting out is a choice, too. Review events, signals and risk when you plan to trade.'}</p>}
    <div id={id} hidden={!open}><Checklist key={symbol} symbol={symbol} zh={zh}/></div>
  </section>}</LocalizeTree>;
}
function Checklist({symbol,zh}:{symbol:string;zh:boolean}){
  const language=useLocale(),shown=symbol==='QQQ'?marketProductName(zh?'zh':language):symbol;
  const [mode,setMode]=useState<Mode>('stocks'),[checks,setChecks]=useState<boolean[]>([false,false,false,false,false]),[notes,setNotes]=useState(['','','','','']),[selected,setSelected]=useState<string[]>([]);
  const questions=zh?[
    ['是否结合重大事件做判断？','核对数据、FOMC、财报和公布时间。哪些可能支持或推翻你的观点？'],
    ['交易方向与持有周期是否清楚？','写下偏多 / 偏空、日内 / 多日，以及这笔交易的逻辑，避免把短线亏损临时改成长线。'],
    ['是否有明确、可观察的入场信号？','选择依据，并写出具体触发条件。美债和美元可提供背景，不能单独代替价格确认。'],
    ['是否提前写好退出与失效条件？','计划止损 / 止盈或时间退出；什么变化说明原来的逻辑已失效？'],
    ['仓位、最大亏损与执行成本是否可承受？',mode==='stocks'?'检查股数、入场到止损距离、跳空风险、流动性和预期盈亏比。':'检查合约数量、到期日、IV、Delta / Gamma / Theta、买卖价差，以及策略最大亏损和盈亏比。'],
  ]:[
    ['Have I considered the major events?','Check economic releases, FOMC, earnings and their timing. What could support or invalidate your view?'],
    ['Are my direction and holding period clear?','State bullish / bearish, intraday / multi-day, and your thesis. Avoid turning a losing short-term trade into an unplanned investment.'],
    ['Do I have an observable entry trigger?','Choose your evidence and describe the precise trigger. Yields and the dollar offer context; price confirmation still matters.'],
    ['Have I planned exits and invalidation?','Define your stop, profit or time-based exit, and what would invalidate the original thesis.'],
    ['Can I afford the size, loss and execution costs?',mode==='stocks'?'Check share count, entry-to-stop distance, gap exposure, liquidity and reward / risk.':'Check contracts, expiration, IV, Delta / Gamma / Theta, bid–ask spread, strategy maximum loss and reward / risk.'],
  ];
  const placeholders=zh?['事件与时间，例如 CPI；无重要事件也请写下核对结果','方向、周期与理由','例如：回踩关键支撑后重新站上 VWAP，且成交量确认','失效条件、退出价位或时间','股数 / 合约数、可承受最大亏损、执行成本']:['Event and time, or your finding that no major event is scheduled','Direction, timeframe and thesis','E.g. retest holds support, then recovers VWAP with volume confirmation','Invalidation, exit levels or time limit','Shares / contracts, affordable maximum loss and execution costs'];
  const complete=checks.filter((checked,i)=>checked&&notes[i].trim()).length;
  return <LocalizeTree>{<>
    <div className="entry-context"><div className="entry-mode" aria-label={zh?'交易模式':'Trading mode'}>{(['stocks','options'] as const).map(value=><button type="button" key={value} aria-pressed={mode===value} onClick={()=>{if(mode!==value){setMode(value);setChecks(previous=>previous.map((v,i)=>i===4?false:v));setNotes(previous=>previous.map((v,i)=>i===4?'':v));}}}>{value==='stocks'?(zh?'美股交易':'US stocks'):(zh?'期权交易':'Options')}</button>)}</div><strong>{shown} · {complete}/5 {zh?'已核对':'reviewed'}</strong></div>
    <p className="entry-note">{zh?'这是手动交易前检查，不提供胜率或买卖建议。写下具体依据后勾选“已核对”；内容仅保留在本次页面中。':'A manual preparation checklist, not a win probability or trade recommendation. Write specific evidence, then mark each question reviewed. These notes last only for this page visit.'}</p>
    <div className="entry-questions">{questions.map(([question,detail],i)=><fieldset key={i}><legend><span>{i+1}</span>{question}</legend><p>{detail}</p>{i===0&&<a href="?view=events">{zh?'查看事件 Boss ↗':'Open Event Boss ↗'}</a>}{i===2&&<div className="entry-signals" aria-label={zh?'入场信号依据':'Entry signal evidence'}>{signals.map(([value,cn,en])=><button type="button" key={value} aria-pressed={selected.includes(value)} onClick={()=>setSelected(previous=>previous.includes(value)?previous.filter(v=>v!==value):[...previous,value])}>{zh?cn:en}</button>)}</div>}<label className="entry-answer"><span>{zh?'你的具体计划':'Your specific plan'}</span><textarea value={notes[i]} maxLength={800} placeholder={placeholders[i]} onChange={event=>{setNotes(previous=>previous.map((note,index)=>index===i?event.target.value:note));setChecks(previous=>previous.map((v,index)=>index===i?false:v));}}/></label><label className="entry-reviewed"><input type="checkbox" disabled={!notes[i].trim()} checked={checks[i]&&!!notes[i].trim()} onChange={event=>setChecks(previous=>previous.map((v,index)=>index===i?event.target.checked:v))}/>{zh?'已核对并写下计划':'Reviewed and planned'}</label></fieldset>)}</div>
    <p className="entry-check-status" role="status">{complete===5?(zh?'✓ 五问已核对。仍需自行判断是否交易，并遵守风险计划。':'✓ All five reviewed. Decide independently whether to trade and follow your risk plan.'):(zh?`还有 ${5-complete} 个问题待核对；没有信号时可以等待。`:`${5-complete} questions remain. Waiting is an option when the trigger is absent.`)}</p>
    <button type="button" className="secondary" onClick={()=>{setChecks([false,false,false,false,false]);setNotes(['','','','','']);setSelected([]);}}>{zh?'重置本次 checklist':'Reset this checklist'}</button>
  </>}</LocalizeTree>;
}
