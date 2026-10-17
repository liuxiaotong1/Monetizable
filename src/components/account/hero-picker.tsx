'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from '@/components/i18n/locale-provider';
import {chooseHero,useHero,type HeroId} from '@/components/quest/hero-preference';
import {useDialogFocus} from '@/components/quest/use-dialog-focus';
import '@/components/quest/hero-experience.css';
export default function HeroPicker({onContinue,onClose}:{onContinue:()=>void;onClose:()=>void}){
 const locale=useLocale(),selected=useHero(),frame=useRef<HTMLIFrameElement>(null),dialog=useRef<HTMLElement>(null),[ready,setReady]=useState(false);
 const c={zh:{title:'选一位伙伴，开始你的冒险。',hint:'悬停角色玩骰子，也可以点击互动。',female:'星澜',next:'选好了，开始教程 →',close:'关闭选角',loading:'角色加载中…'},en:{title:'Choose your partner. Begin your quest.',hint:'Hover over your hero to play dice, or tap to interact.',female:'Astra',next:'Meet my hero · start the tour →',close:'Close character selection',loading:'Loading your hero…'},fr:{title:'Choisissez votre partenaire. À vous de jouer.',hint:'Survolez le personnage ou touchez-le pour jouer aux dés.',female:'Astra',next:'Mon personnage est prêt · commencer →',close:'Fermer la sélection',loading:'Chargement du personnage…'}}[locale];
 useDialogFocus(dialog,true,onClose);
 useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[]);
 useEffect(()=>{const fn=(e:MessageEvent)=>{if(e.origin===location.origin&&e.source===frame.current?.contentWindow&&e.data?.type==='monetizable-hero-ready')setReady(true)};addEventListener('message',fn);return()=>removeEventListener('message',fn)},[]);
 function select(id:HeroId){if(id!==selected){setReady(false);chooseHero(id)}}
 return <section ref={dialog} className="hero-picker" role="dialog" aria-modal="true" aria-labelledby="pick-hero-title"><button className="hero-picker-close" aria-label={c.close} onClick={onClose}>×</button><header><small>MONETIZABLE</small><h2 id="pick-hero-title">{c.title}</h2><p>{c.hint}</p></header><iframe ref={frame} key={selected} className="picker-frame" title={selected==='female'?c.female:'SuperCharlie'} src={`/heroes/index.html?hero=${selected}&locale=${locale}&framing=selection`}/><div className="picker-options" aria-label={c.title}>{(['supercharlie','female'] as const).map(id=><button key={id} aria-pressed={selected===id} onClick={()=>select(id)} onPointerEnter={e=>{if(e.pointerType==='mouse'&&selected===id)frame.current?.contentWindow?.postMessage({type:'monetizable-cast'},location.origin)}}>{id==='female'?c.female:'SuperCharlie'}</button>)}</div><button className="primary" disabled={!ready} onClick={onContinue}>{ready?c.next:c.loading}</button></section>
}
