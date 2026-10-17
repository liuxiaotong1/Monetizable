'use client';
import {useState} from 'react';
import {useLocale} from '@/components/i18n/locale-provider';
import {useHero} from './hero-preference';
import './hero-experience.css';
export default function HeroOutcome({result='win',demo=false,onClose,compact=false,boss='dragon'}:{result?:'win'|'loss';demo?:boolean;onClose?:()=>void;compact?:boolean;boss?:'dragon'|'beetle'}){
 const hero=useHero(),locale=useLocale(),[replay,setReplay]=useState(0);
 const c={zh:{win:'Boss 已击败！',loss:'这次未命中，经验已拾取。',hint:'回看事实，找到下一次进步的线索。',demo:'教程演示 · 不保存成绩',replay:'重播',close:'回到任务'},en:{win:'Boss defeated!',loss:'A missed call. A new lesson.',hint:'Review the evidence and prepare your next step.',demo:'Tutorial demo · no score saved',replay:'Replay',close:'Back to the quest'},fr:{win:'Boss vaincu !',loss:'Prévision manquée. Leçon gagnée.',hint:'Revenez aux faits et préparez la suite.',demo:'Démo · aucun résultat enregistré',replay:'Rejouer',close:'Revenir à la quête'}}[locale];
 return <section className={`hero-outcome ${compact?'is-compact':''}`} aria-label={result==='win'?c.win:c.loss}><header><small>{hero==='female'?(locale==='zh'?'星澜':'Astra'):'SuperCharlie'}{demo?` · ${c.demo}`:''}</small><h3>{c[result]}</h3></header><iframe key={`${hero}:${replay}`} title={`${hero} ${result}`} src={`/heroes/index.html?hero=${hero}&locale=${locale}&outcome=${result}&boss=${boss}`} className="outcome-frame"/><p>{c.hint}</p><footer><button className="secondary" onClick={()=>setReplay(n=>n+1)}>{c.replay}</button>{onClose&&<button className="primary" onClick={onClose}>{c.close}</button>}</footer></section>
}
