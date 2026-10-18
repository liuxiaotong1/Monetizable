'use client';
import {useEffect,useRef,useState} from 'react';
import type {AdventureSection,QuestState} from '@/lib/quest/types';
import {useLocale} from '@/components/i18n/locale-provider';
import {useHero} from './hero-preference';
const copy={
 zh:{next:'今天这一站尚未完成，先从这里开始？',title:'让伙伴带你开局',tap:'点击角色，听一句鼓励',roll:'掷骰选起点',rolling:'掷骰中…',again:'再掷一次',go:'开始这站任务',all:'今天三站已完成！可以自由重温。',hint:'只推荐学习顺序，由你决定是否出发。',names:{today:'今日预判',events:'事件 Boss',learn:'知识卡牌'},cheers:['别急，我陪你从一个好问题开始。掷个骰子，看看今天先去哪？','做得好！每一次有依据的判断，都在让你变强。','先看风险，再找机会。今天这一步，我们一起走。']},
 en:{next:'This quest is still open today. Start here?',title:'Let your hero pick a starting point',tap:'Tap your hero for encouragement',roll:'Roll for a quest',rolling:'Rolling…',again:'Roll again',go:'Start this quest',all:'All three quests are complete! Revisit any you like.',hint:'A suggestion for your learning order. You choose where to go.',names:{today:'Daily Quest',events:'Event Boss',learn:'Knowledge Deck'},cheers:['Let’s start with one good question. I’ll roll the dice for our next quest.','Nice work! Every reasoned prediction makes you stronger.','Risk first, opportunity second. Let’s take the next step together.']},
 fr:{next:'Cette quête reste à faire aujourd’hui. On commence ici ?',title:'Votre partenaire vous propose un départ',tap:'Touchez votre personnage pour un encouragement',roll:'Lancer le dé de quête',rolling:'Lancer en cours…',again:'Relancer le dé',go:'Commencer cette quête',all:'Les trois quêtes sont terminées ! Revisitez celle de votre choix.',hint:'Une suggestion pour apprendre. Vous choisissez votre destination.',names:{today:'Quête du jour',events:'Boss économique',learn:'Cartes de connaissances'},cheers:['On commence par une bonne question ? Je lance le dé pour notre prochaine quête.','Bien joué ! Chaque prévision argumentée vous rend plus fort.','Le risque d’abord, les opportunités ensuite. Avançons ensemble.']}
};
export default function CompanionQuest({state,onRoll,tapCount,ready}:{ready:boolean;state?:QuestState;onRoll:()=>void;tapCount:number;anchor:{x:number;y:number}}){
 const locale=useLocale(),hero=useHero(),c=copy[locale],timer=useRef<ReturnType<typeof setTimeout>|null>(null),rollingRef=useRef(false),[rolling,setRolling]=useState(false),[result,setResult]=useState<{face:number;quest:AdventureSection;all:boolean}|null>(null),[talk,setTalk]=useState(false),[line,setLine]=useState(''),[rollCount,setRollCount]=useState(0);
 const name=hero==='female'?(locale==='zh'?'星澜':'Astra'):(locale==='zh'?'查理':'SuperCharlie');
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const done=state?.adventure?.date===state?.session.date?state?.adventure?.sections||[]:[];
 function roll(){if(rollingRef.current||!ready)return;rollingRef.current=true;const number=new Uint32Array(1);crypto.getRandomValues(number);const face=number[0]%6+1,sections:AdventureSection[]=['today','events','learn'],remaining=sections.filter(s=>!done.includes(s)),pool=remaining.length?remaining:sections;setRolling(true);setTalk(true);setRollCount(n=>n+1);setResult(null);onRoll();timer.current=setTimeout(()=>{setResult({face,quest:pool[Math.floor((face-1)*pool.length/6)],all:remaining.length===0});setRolling(false);rollingRef.current=false},2800)}
 const rollAction=useRef(roll);useEffect(()=>{rollAction.current=roll});
 useEffect(()=>{if(tapCount>0){setTalk(true);rollAction.current()}},[tapCount]);
 const sentence=result?(locale==='zh'?`你今天的幸运数字是 ${result.face}。`:locale==='fr'?`Votre chiffre porte-bonheur du jour est le ${result.face}.`:`Your lucky number is ${result.face} today`):c.cheers[Math.max(0,rollCount-1)%c.cheers.length];
 useEffect(()=>{if(!talk)return;setLine('');if(matchMedia('(prefers-reduced-motion: reduce)').matches){setLine(sentence);return}let n=0;const id=setInterval(()=>{n+=1;setLine(sentence.slice(0,n));if(n>=sentence.length)clearInterval(id)},28);return()=>clearInterval(id)},[sentence,talk,tapCount]);
 function open(quest:AdventureSection){const target=quest==='today'?(document.getElementById('judgment')||document.getElementById('en-judgment')):null;if(target){target.scrollIntoView({behavior:'smooth',block:'start'});return}dispatchEvent(new CustomEvent('monetizable-open-quest',{detail:{view:quest}}))}
 return <div className="companion-dialogue-ui" aria-label={c.title}>
 {talk?<aside className="companion-speech"><header><strong>{name}</strong><button aria-label={locale==='zh'?'收起对白':locale==='fr'?'Fermer le dialogue':'Close dialogue'} onClick={()=>setTalk(false)}>×</button></header><p aria-hidden="true">{line}<span className="speech-caret">▍</span></p><span className="sr-only" role="status">{sentence}</span><i className="speech-tail"/></aside>:<small className="companion-tap-hint">✧ {c.tap}</small>}
 <div className="companion-dice-hud"><button className={`companion-roll ${rolling?'is-rolling':''}`} disabled={rolling||!ready} onClick={roll}><span aria-hidden="true">{rolling?'⚄':result?['⚀','⚁','⚂','⚃','⚄','⚅'][result.face-1]:'⚅'}</span>{rolling?c.rolling:result?c.again:c.roll}</button>
 <div aria-live="polite">{result&&<div className="companion-recommendation"><strong>✦ {c.names[result.quest]}</strong><p>{result.all?c.all:c.next}</p><button onClick={()=>open(result.quest)}>{c.go} →</button></div>}</div></div>
 </div>
}
