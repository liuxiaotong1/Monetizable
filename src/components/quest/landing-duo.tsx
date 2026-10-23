'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from '@/components/i18n/locale-provider';
import InViewReveal from './in-view-reveal';
import './landing-duo.css';

const copy={
 en:{title:'Meet your quest companions',astra:'Astra',charlie:'Charlie',example:'Example · demo data',accuracy:'Monthly accuracy',sample:'3 / 5 verified calls',boss:'Market Boss',battle:'Predict · battle',streak:'Learning streak',days:'days',loading:'Your 3D companions are getting ready…',play:'Tap a companion to roll the dice',fallback:'Your companions · preview',frame:'Interactive 3D Astra and Charlie'},
 fr:{title:'Vos partenaires de quête',astra:'Astra',charlie:'Charlie',example:'Exemple · données fictives',accuracy:'Précision du mois',sample:'3 / 5 prévisions',boss:'Boss du marché',battle:'Prévoir · combattre',streak:'Série quotidienne',days:'jours',loading:'Vos partenaires 3D se préparent…',play:'Touchez un personnage pour lancer le dé',fallback:'Vos partenaires · aperçu',frame:'Astra et Charlie en 3D interactive'},
 zh:{title:'你的冒险双搭档',astra:'星澜',charlie:'查理',example:'示例 · 演示数据',accuracy:'月度命中率',sample:'3 / 5 次已核实',boss:'市场 Boss',battle:'预判 · 战斗',streak:'连续打卡',days:'天',loading:'3D 伙伴准备中…',play:'点击伙伴，试试今天的骰子',fallback:'你的冒险伙伴 · 预览',frame:'可互动的星澜与查理 3D 双角色'}
};
export default function LandingDuo(){
 const locale=useLocale(),c=copy[locale],stage=useRef<HTMLElement>(null),frame=useRef<HTMLIFrameElement>(null),visible=useRef(false);
 const [mounted,setMounted]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{const el=stage.current;if(!el)return;const notify=()=>frame.current?.contentWindow?.postMessage({type:'hero-duo-visibility',visible:visible.current&&!document.hidden},location.origin);const observer=new IntersectionObserver(entries=>{visible.current=entries.some(e=>e.isIntersecting);if(visible.current)setMounted(true);notify();},{rootMargin:'120px 0px'});observer.observe(el);document.addEventListener('visibilitychange',notify);return()=>{observer.disconnect();document.removeEventListener('visibilitychange',notify);};},[]);
 useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.origin!==location.origin||event.source!==frame.current?.contentWindow)return;if(event.data?.type==='hero-duo-ready'){setReady(true);setFailed(false);}if(event.data?.type==='hero-duo-error'){setFailed(true);setReady(false);}};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
 return <section ref={stage} className={`landing-duo ${ready?'is-ready':''}`} aria-label={c.title} translate="no">
  <div className="duo-backdrop" aria-hidden="true"><span/><span/></div>
  <div className="duo-models">
   <div className="duo-posters" aria-hidden={ready}><img src="/heroes/astra-portrait.webp" alt={c.astra} width={640} height={960} fetchPriority="high" decoding="async"/><img src="/heroes/supercharlie-portrait.webp" alt={c.charlie} width={640} height={960} fetchPriority="high" decoding="async"/></div>
   {mounted&&<iframe ref={frame} src={`/heroes/duo.html?locale=${locale}&v=20261023`} title={c.frame} className="duo-frame" onLoad={()=>frame.current?.contentWindow?.postMessage({type:'hero-duo-visibility',visible:visible.current&&!document.hidden},location.origin)} onError={()=>setFailed(true)} tabIndex={ready?0:-1}/>}
  </div>
  <div className="duo-proof" aria-label={c.example}>
   <InViewReveal index={0} className="duo-orbit duo-orbit-score"><a className="duo-circle duo-score" href="#first-prediction"><span className="duo-circle-inner"><strong>60<small>%</small></strong><span>{c.accuracy}</span><small>{c.sample}</small></span></a></InViewReveal>
   <InViewReveal index={1} className="duo-orbit duo-orbit-boss"><a className="duo-circle duo-boss" href="#landing-event-demo"><span className="duo-circle-inner"><img src="/homepage/battle-action.png" alt="" width={570} height={340} loading="lazy"/><strong>{c.boss}</strong><small>{c.battle}</small></span></a></InViewReveal>
   <InViewReveal index={2} className="duo-orbit duo-orbit-streak"><a className="duo-circle duo-streak" href="#landing-knowledge-demo"><span className="duo-circle-inner"><strong>3<small> {c.days}</small></strong><span>{c.streak}</span><small aria-hidden="true">✦ ✦ ✦</small></span></a></InViewReveal>
  </div>
  <div className="duo-names" aria-hidden="true"><span>✦ {c.astra}</span><span>✦ {c.charlie}</span></div>
  <div className="duo-caption"><span>{c.example}</span><span role="status">{ready?c.play:failed?c.fallback:c.loading}</span></div>
 </section>;
}
