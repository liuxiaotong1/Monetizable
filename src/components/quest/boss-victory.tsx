'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import {useLocale} from '@/components/i18n/locale-provider';
import {useBilling} from '@/components/account/billing-access';
import {readBrowserRecord} from '@/lib/quest/browser-store';
import {predictionResult} from '@/lib/quest/event-prediction';
import BossAvatar from './boss-avatar';
import type {MarketEvent,EventKind} from '@/lib/quest/types';
import './boss-victory.css';
const copy={en:{title:'Boss defeated!',text:'Your prediction matched the official release. Now discover why.',demo:'Tutorial demo · no score saved',replay:'Replay celebration',close:'Continue exploring'},fr:{title:'Boss vaincu !',text:'Votre prévision correspond au résultat officiel. Découvrez maintenant pourquoi.',demo:'Démonstration · aucun résultat enregistré',replay:'Rejouer la célébration',close:'Continuer à explorer'},zh:{title:'Boss 挑战成功！',text:'你的预测与官方公布结果一致。接下来看看背后的原因。',demo:'引导演示 · 不计入成绩',replay:'再庆祝一次',close:'继续探索'}};
export function BossVictory({demo=false,onClose,kind="CPI"}:{demo?:boolean;onClose?:()=>void;kind?:EventKind}){
 const c=copy[useLocale()];const [burst,setBurst]=useState(0);
 return <section className="boss-victory" role="status"><div className="boss-victory-burst" key={burst} aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} style={{'--angle':`${i*15}deg`,'--delay':`${i%4*60}ms`} as CSSProperties}/>)}</div><div className="boss-defeated" aria-hidden="true">⚔️ <BossAvatar kind={kind}/> ✨</div><h3>{c.title}</h3><p>{c.text}</p>{demo&&<small>{c.demo}</small>}<button type="button" className="secondary" onClick={()=>setBurst(v=>v+1)}>{c.replay}</button>{onClose&&<button type="button" className="primary" onClick={onClose}>{c.close}</button>}</section>;
}
export default function ConfirmedBossVictory({events}:{events:MarketEvent[]}){
 const {access}=useBilling(),[id,setId]=useState<string>();
 useEffect(()=>{const check=()=>{try{const wins=(readBrowserRecord().eventPredictions||[]).filter(p=>{const event=events.find(e=>e.id===p.eventId);return event&&predictionResult(p,event)?.matched;});const next=wins.find(p=>!localStorage.getItem(`boss-victory:${p.eventId}:${p.savedAt}`));setId(next?`${next.eventId}:${next.savedAt}`:undefined);}catch{}};check();window.addEventListener('quest-progress',check);return()=>window.removeEventListener('quest-progress',check);},[events,access.signedIn]);
 if(!id)return null;
 return <BossVictory kind={events.find(e=>id.startsWith(e.id+":"))?.kind} onClose={()=>{try{localStorage.setItem(`boss-victory:${id}`,'seen');}catch{}setId(undefined);}}/>;
}
