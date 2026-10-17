'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from '@/components/i18n/locale-provider';
import './yelan.css';
export default function YelanViewer({celebrate=false,victoryDate,onCelebrationComplete}:{celebrate?:boolean;victoryDate?:string;onCelebrationComplete?:()=>void;locale?:'zh'|'en'}){
 const locale=useLocale(),frame=useRef<HTMLIFrameElement>(null),[hero,setHero]=useState('supercharlie'),[ready,setReady]=useState(false);
 const c={zh:{choose:'选择伙伴',female:'星澜',roll:'玩骰子',hint:'悬停或点击角色 · 玩骰子',win:'判断正确！Boss 已击败',credit:'原创角色 · Meshy / Mesh2Motion'},en:{choose:'Choose your companion',female:'Astra',roll:'Play dice',hint:'Hover or tap your hero to play',win:'Correct call! Boss defeated',credit:'Original heroes · Meshy / Mesh2Motion'},fr:{choose:'Choisissez votre partenaire',female:'Astra',roll:'Jouer aux dés',hint:'Survolez ou touchez votre personnage',win:'Bonne prévision ! Boss vaincu',credit:'Personnages originaux · Meshy / Mesh2Motion'}}[locale];
 useEffect(()=>{const saved=localStorage.getItem('monetizable-hero');if(saved==='female')setHero(saved)},[]);
 useEffect(()=>{const listen=(e:MessageEvent)=>{if(e.origin===location.origin&&e.source===frame.current?.contentWindow&&e.data?.type==='monetizable-hero-ready')setReady(true)};addEventListener('message',listen);return()=>removeEventListener('message',listen)},[]);
 const cast=()=>frame.current?.contentWindow?.postMessage({type:'monetizable-cast'},location.origin);
 useEffect(()=>{if(!celebrate||!ready)return;frame.current?.contentWindow?.postMessage({type:'monetizable-cast'},location.origin);const t=setTimeout(()=>onCelebrationComplete?.(),4400);return()=>clearTimeout(t)},[celebrate,ready,onCelebrationComplete]);
 return <div className="yelan-stage companion-stage" data-status={ready?'ready':'loading'}>
 <div className="companion-select" aria-label={c.choose}>{['supercharlie','female'].map(id=><button key={id} aria-pressed={hero===id} onClick={()=>{if(hero!==id){setReady(false);setHero(id);localStorage.setItem('monetizable-hero',id)}}}>{id==='supercharlie'?'SuperCharlie':c.female}</button>)}</div>
 <iframe ref={frame} key={hero} title={hero==='female'?c.female:'SuperCharlie'} src={`/heroes/index.html?hero=${hero}&locale=${locale}`} className="companion-frame"/>
 {celebrate&&ready&&<div className="companion-win" role="status"><span>✦ ✧ ✦</span><strong>{c.win}</strong><small>{victoryDate}</small></div>}
 <div className="companion-footer"><button onClick={cast} disabled={!ready}>⚄ {c.roll}</button><small>{c.hint}</small><small>{c.credit}</small></div>
 </div>
}
