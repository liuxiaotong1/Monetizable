"use client";
import {ArrowUpRight,ArrowDownRight,ArrowRightLeft,Check,Flag} from 'lucide-react';
import {useLocale} from '@/components/i18n/locale-provider';
import type {Direction,Forecast} from '@/lib/quest/types';
const copy={
 fr:{group:'Choisir un scénario de marché',hint:'Choisissez votre scénario. Une raison suffit pour commencer.',range:'Zone du scénario',choose:'Choisir ce scénario',equipped:'Scénario équipé',picked:'Votre scénario',prompt:'Ajoutez votre raison ci-dessous pour sceller votre prévision.',names:{bullish:'Haussier',neutral:'En range',bearish:'Baissier'},titles:{bullish:'Cap sur la hausse',neutral:'Tenir la zone',bearish:'Guetter le repli'},tests:{bullish:'À confirmer : tenir au-dessus de',neutral:'À observer : évoluer entre',bearish:'À confirmer : casser sous'},and:'et'},
 en:{group:'Choose a market scenario',hint:'Choose your scenario. One reason is enough to begin.',range:'Scenario zone',choose:'Choose this scenario',equipped:'Scenario equipped',picked:'Your scenario',prompt:'Add your reason below to lock in your call.',names:{bullish:'Bullish',neutral:'Range-bound',bearish:'Bearish'},titles:{bullish:'Ride the breakout',neutral:'Hold the range',bearish:'Watch the pullback'},tests:{bullish:'Confirm: hold above',neutral:'Watch: stay between',bearish:'Confirm: break below'},and:'and'},
 zh:{group:'选择你的市场剧本',hint:'选一个剧本，写下一条依据。你的下一关，从判断开始。',range:'剧本参考区间',choose:'选择这个剧本',equipped:'已装备此剧本',picked:'你的剧本',prompt:'在下方补上一句理由，再封存你的判断。',names:{bullish:'偏多',neutral:'震荡',bearish:'偏空'},titles:{bullish:'向上闯关',neutral:'守住区间',bearish:'下行侦察'},tests:{bullish:'确认线索：守住阻力上方',neutral:'观察线索：价格往返于',bearish:'确认线索：跌破支撑'},and:'至'}
};
export default function ScenarioChoices({forecast,value,onChange,disabled=false}:{forecast:Forecast;value:Direction;onChange:(direction:Direction)=>void;disabled?:boolean}){
 const locale=useLocale(),text=copy[locale],money=(n:number)=>new Intl.NumberFormat(locale==='fr'?'fr-FR':locale==='zh'?'zh-CN':'en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
 const order:Direction[]=['bullish','neutral','bearish'];
 return <div className="scenario-quest" translate="no">
  <p className="scenario-quest-hint"><Flag size={16} aria-hidden="true"/>{text.hint}</p>
  <div className="scenario-choices" role="group" aria-label={text.group}>
   {order.map((direction,index)=>{const scenario=forecast.scenarios.find(item=>item.direction===direction);if(!scenario)return null;const selected=direction===value;const Icon=direction==='bullish'?ArrowUpRight:direction==='bearish'?ArrowDownRight:ArrowRightLeft;
    return <button type="button" key={direction} className={`scenario-choice ${direction}`} aria-pressed={selected} disabled={disabled} onClick={()=>onChange(direction)}>
     <span className="scenario-choice-top"><span className="scenario-choice-icon"><Icon size={36} strokeWidth={2.4} aria-hidden="true"/></span><span className="scenario-choice-number">0{index+1} · {text.names[direction]}</span>{selected&&<Check className="scenario-choice-check" size={19} aria-hidden="true"/>}</span>
     <span className="scenario-choice-title">{text.titles[direction]}</span>
     <span className="scenario-choice-test">{text.tests[direction]} <strong>{direction==='bullish'?money(forecast.levels.resistance):direction==='bearish'?money(forecast.levels.support):`${money(forecast.levels.support)} ${text.and} ${money(forecast.levels.resistance)}`}</strong></span>
     <span className="scenario-choice-range"><small>{text.range}</small><strong>{money(scenario.low)} — {money(scenario.high)}</strong></span>
     <span className="scenario-choice-action">{selected?<><Check size={16} aria-hidden="true"/>{text.equipped}</>:<>{text.choose}<Icon size={17} aria-hidden="true"/></>}</span>
    </button>;
   })}
  </div>
  <p className="scenario-equipped" role="status"><span>{text.picked} : <strong>{text.names[value]}</strong></span><span>{text.prompt}</span></p>
 </div>;
}
