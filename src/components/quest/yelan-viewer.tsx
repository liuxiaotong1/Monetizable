'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from '@/components/i18n/locale-provider';
import './yelan.css';
import CompanionQuest from './companion-quest';
import type {QuestState,Review} from '@/lib/quest/types';
import {predictionBattleOutcome} from '@/lib/quest/battle-result';
import {useHero} from './hero-preference';
export default function YelanViewer({celebrate=false,review,onCelebrationComplete,state}:{state?:QuestState;celebrate?:boolean;review?:Review;onCelebrationComplete?:()=>void;locale?:'zh'|'en'}){
 const locale=useLocale(),frame=useRef<HTMLIFrameElement>(null),hero=useHero(),[ready,setReady]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 const c={zh:{choose:'选择伙伴',female:'星澜',roll:'玩骰子',hint:'悬停或点击角色 · 玩骰子',win:'判断正确！Boss 已击败'},en:{choose:'Choose your companion',female:'Astra',roll:'Play dice',hint:'Hover or tap your hero to play',win:'Correct call! Boss defeated'},fr:{choose:'Choisissez votre partenaire',female:'Astra',roll:'Jouer aux dés',hint:'Survolez ou touchez votre personnage',win:'Bonne prévision ! Boss vaincu'}}[locale];
 const [battleDone,setBattleDone]=useState(false),[tapCount,setTapCount]=useState(0),[anchor,setAnchor]=useState({x:50,y:16});
 const outcome=predictionBattleOutcome(review);
 useEffect(()=>{setReady(false);setError(false);setBattleDone(false)},[hero,outcome,attempt,review?.id]);
 useEffect(()=>{if(ready){setError(false);return}const timer=setTimeout(()=>setError(true),25000);return()=>clearTimeout(timer)},[ready,hero,outcome,attempt]);
 useEffect(()=>{const listen=(e:MessageEvent)=>{if(e.origin!==location.origin||e.source!==frame.current?.contentWindow)return;if(e.data?.type==='monetizable-hero-anchor'&&Number.isFinite(e.data.x)&&Number.isFinite(e.data.y))setAnchor(previous=>Math.abs(previous.x-e.data.x)<.6&&Math.abs(previous.y-e.data.y)<.6?previous:{x:Math.min(95,Math.max(5,e.data.x)),y:Math.min(85,Math.max(5,e.data.y))});if(e.data?.type==='monetizable-hero-tap')setTapCount(n=>n+1);if(e.data?.type==='monetizable-hero-ready'||e.data?.type==='monetizable-restored-ready')setReady(true);if(e.data?.type==='monetizable-hero-error'||e.data?.type==='monetizable-restored-error')setError(true);if(e.data?.type==='monetizable-battle-complete'||e.data?.type==='monetizable-restored-complete')setBattleDone(true);if((e.data?.type==='monetizable-battle-complete'||e.data?.type==='monetizable-restored-complete')&&e.data?.outcome==='win'&&outcome==='win'){onCelebrationComplete?.()}};addEventListener('message',listen);return()=>removeEventListener('message',listen)},[onCelebrationComplete,outcome]);
 const cast=()=>{setBattleDone(false);frame.current?.contentWindow?.postMessage({type:'monetizable-cast'},location.origin)};
 useEffect(()=>{if(outcome!=='win'||!celebrate||!ready)return;const t=setTimeout(()=>onCelebrationComplete?.(),10000);return()=>clearTimeout(t)},[outcome,celebrate,ready,onCelebrationComplete]);
 const asset=`/heroes/${hero==='female'?'female':'supercharlie'}-fast-20261019.glb.gz`;
 return <div className="yelan-stage companion-stage" data-outcome={outcome||'idle'} data-status={ready?'ready':'loading'}>
 <link rel="preload" href={asset} as="fetch" crossOrigin="anonymous"/>
 <div className="companion-select companion-name"><strong>{hero==='female'?c.female:(locale==='zh'?'查理':'SuperCharlie')}</strong></div>
 <div className="companion-scene">{!ready&&!outcome&&<img className="companion-loading-portrait" alt="" src={hero==='female'?'/heroes/astra-portrait.webp':'/heroes/supercharlie-portrait.webp'}/>}<iframe ref={frame} key={`${hero}:${outcome||'idle'}:${attempt}:${review?.id||'idle'}:${review?.judgmentId||''}`} title={hero==='female'?c.female:(locale==='zh'?'查理':'SuperCharlie')} src={outcome?`/battle-demo/embed.html?embed=1&chrome=${outcome==='win'?'celebration':'compact'}&hero=${hero}&locale=${locale}&outcome=${outcome}&boss=dragon`:`/heroes/index.html?hero=${hero}&locale=${locale}`} className="companion-frame"/> {(!outcome||battleDone)&&<CompanionQuest ready={ready} state={state} tapCount={tapCount} anchor={anchor} onRoll={()=>{frame.current?.contentWindow?.postMessage({type:'monetizable-roll-dice'},location.origin)}}/>}
 </div>
 {!ready&&<div className="companion-loading" role="status"><span>{error?({zh:'角色加载暂时失败',en:'Your hero could not load',fr:'Le personnage n’a pas pu être chargé'}[locale]):({zh:'正在准备你的伙伴…',en:'Preparing your companion…',fr:'Votre partenaire se prépare…'}[locale])}</span>{error&&<button onClick={()=>setAttempt(n=>n+1)}>{({zh:'重新加载角色',en:'Reload hero',fr:'Recharger le personnage'}[locale])}</button>}</div>}

 {outcome&&<div className="companion-footer"><button onClick={cast} disabled={!ready}>{({zh:'重播战斗演出',en:'Replay the battle',fr:'Rejouer le combat'}[locale])}</button></div>}

 </div>
}
