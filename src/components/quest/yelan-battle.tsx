'use client';
import {useLocale} from '@/components/i18n/locale-provider';
import BossAvatar from './boss-avatar';
export default function YelanBattle({active,date}:{active:boolean;date:string}){
 const locale=useLocale();const c={en:{title:'Yelan defeated the Market Boss!',hint:'Your verified direction was correct. Time to review the evidence.'},fr:{title:'Yelan a vaincu le Boss du marché !',hint:'Votre direction a été confirmée. Revenons aux faits.'},zh:{title:'夜兰击败了市场 Boss！',hint:'方向判断已核对正确，现在回看事实过程。'}}[locale];
 return <div className={`yelan-battle ${active?'is-striking':''}`} role="status"><div className="yelan-battle-story"><small>{date}</small><strong>{c.title}</strong><span>{c.hint}</span></div><div className="yelan-battle-arena" aria-hidden="true"><b className="hydro-die">⚄</b><i className="hydro-strike"/><div className="market-boss"><BossAvatar kind="GDP"/><div className="boss-health"><i/></div></div><span className="battle-stars">✦ ✧ ✦</span></div></div>;
}
