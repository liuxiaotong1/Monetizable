'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from '@/components/i18n/locale-provider';
import './yelan.css';
import {chooseHero,useHero} from './hero-preference';
export default function YelanViewer({celebrate=false,failed=false,victoryDate,onCelebrationComplete}:{celebrate?:boolean;failed?:boolean;victoryDate?:string;onCelebrationComplete?:()=>void;locale?:'zh'|'en'}){
 const locale=useLocale(),frame=useRef<HTMLIFrameElement>(null),hero=useHero(),[ready,setReady]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 const c={zh:{choose:'选择伙伴',female:'星澜',roll:'玩骰子',hint:'悬停或点击角色 · 玩骰子',win:'判断正确！Boss 已击败',credit:'原创角色 · Meshy / Mesh2Motion'},en:{choose:'Choose your companion',female:'Astra',roll:'Play dice',hint:'Hover or tap your hero to play',win:'Correct call! Boss defeated',credit:'Original heroes · Meshy / Mesh2Motion'},fr:{choose:'Choisissez votre partenaire',female:'Astra',roll:'Jouer aux dés',hint:'Survolez ou touchez votre personnage',win:'Bonne prévision ! Boss vaincu',credit:'Personnages originaux · Meshy / Mesh2Motion'}}[locale];
 const outcome=celebrate?'win':failed?'loss':undefined;
 useEffect(()=>{setReady(false);setError(false)},[hero,outcome,attempt]);
 useEffect(()=>{if(ready){setError(false);return}const timer=setTimeout(()=>setError(true),25000);return()=>clearTimeout(timer)},[ready,hero,outcome,attempt]);
 useEffect(()=>{const listen=(e:MessageEvent)=>{if(e.origin!==location.origin||e.source!==frame.current?.contentWindow)return;if(e.data?.type==='monetizable-hero-ready')setReady(true);if(e.data?.type==='monetizable-hero-error')setError(true);if(e.data?.type==='monetizable-battle-complete'&&e.data?.outcome==='win')onCelebrationComplete?.()};addEventListener('message',listen);return()=>removeEventListener('message',listen)},[onCelebrationComplete]);
 const cast=()=>frame.current?.contentWindow?.postMessage({type:'monetizable-cast'},location.origin);
 useEffect(()=>{if(!celebrate||!ready)return;const t=setTimeout(()=>onCelebrationComplete?.(),10000);return()=>clearTimeout(t)},[celebrate,ready,onCelebrationComplete]);
 return <div className="yelan-stage companion-stage" data-status={ready?'ready':'loading'}>
 <div className="companion-select" aria-label={c.choose}>{['supercharlie','female'].map(id=><button key={id} aria-pressed={hero===id} onClick={()=>{if(hero!==id){setReady(false);chooseHero(id as 'supercharlie'|'female')}}}>{id==='supercharlie'?'SuperCharlie':c.female}</button>)}</div>
 <iframe ref={frame} key={`${hero}:${outcome||'idle'}:${attempt}`} title={hero==='female'?c.female:'SuperCharlie'} src={`/heroes/index.html?hero=${hero}&locale=${locale}${outcome?`&outcome=${outcome}`:''}`} className="companion-frame"/>
 {!ready&&<div className="companion-loading" role="status"><span>{error?({zh:'角色加载暂时失败',en:'Your hero could not load',fr:'Le personnage n’a pas pu être chargé'}[locale]):({zh:'正在准备你的伙伴…',en:'Preparing your companion…',fr:'Votre partenaire se prépare…'}[locale])}</span>{error&&<button onClick={()=>setAttempt(n=>n+1)}>{({zh:'重新加载角色',en:'Reload hero',fr:'Recharger le personnage'}[locale])}</button>}</div>}
 {celebrate&&ready&&<div className="companion-win" role="status"><span>✦ ✧ ✦</span><strong>{c.win}</strong><small>{victoryDate}</small></div>}
 <div className="companion-footer"><button onClick={cast} disabled={!ready}>⚄ {c.roll}</button><small>{c.hint}</small><small>{c.credit}</small></div>
 </div>
}
