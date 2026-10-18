'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from '@/components/i18n/locale-provider';
import {victoryKey} from '@/lib/account/onboarding';
import OnboardingVictory from './onboarding-victory';
import '@/components/quest/hero-experience.css';
import './product-tour.css';
type Bounds={top:number;left:number;width:number;height:number};
const steps=[
 {view:'today',selector:'#en-judgment .scenario-choices, #judgment .direction-selector, #en-judgment, #judgment',title:['Make your call','留下你的判断','Faites votre prévision'],text:['Tap Up, Sideways or Down. Add one reason below, then save your call.','点击偏多、震荡或偏空，在下方写一句理由，再封存判断。','Touchez Hausse, Range ou Baisse. Ajoutez une raison, puis enregistrez.']},
 {view:'events',selector:'.boss-picks, .boss-quest-header, .boss-quest',title:['Challenge the next Boss','挑战下一个事件 Boss','Défiez le prochain Boss'],text:['Read the release and consensus. Tap Below, Equal or Above to make your prediction.','先看数据发布时间和市场预期，再点击低于、符合或高于预期。','Lisez la publication et le consensus. Choisissez en dessous, égal ou au-dessus.']},
 {view:'learn',selector:'.en-choices, .quiz-choices, .swipe-actions, .swipe-deck, .card-stage, .premium-gate',title:['Turn a question into a skill','把问号变成技能','Transformez une question en compétence'],text:['Tap an answer to flip. Read the explanation; swipe left to review or right when understood.','点击答案翻面，读完解释后左滑复习，右滑表示已学会。','Touchez une réponse pour retourner la carte. À gauche pour revoir ; à droite si compris.']},
] as const;
export default function ProductTour({onFinish,userId}:{zh:boolean;onFinish:()=>void;userId:string}){
 const locale=useLocale(),lang=locale==='zh'?1:locale==='fr'?2:0,[index,setIndex]=useState(0),[bounds,setBounds]=useState<Bounds|null>(null),[intro,setIntro]=useState(()=>{try{return localStorage.getItem(victoryKey(userId))!=='done'}catch{return true}}),target=useRef<HTMLElement|null>(null);
 const current=steps[index],t=(en:string,zh:string,fr:string)=>[en,zh,fr][lang];
 useEffect(()=>{if(intro)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onFinish()};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[intro,onFinish]);
 useEffect(()=>{const original=document.documentElement.style.scrollPaddingBottom;document.documentElement.style.scrollPaddingBottom='310px';return()=>{document.documentElement.style.scrollPaddingBottom=original}},[]);
 useEffect(()=>{
  if(intro)return;
  let scrolled=false,navigated=false,raf=0;
  const visible=(selector:string)=>selector.split(',').flatMap(s=>Array.from(document.querySelectorAll<HTMLElement>(s.trim()))).find(el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden');
  const locate=()=>{
   if(!navigated){const nav=visible(`.sidebar [data-tour-nav="${current.view}"], .mobile-nav [data-tour-nav="${current.view}"], .bottom-nav [data-tour-nav="${current.view}"]`);if(nav){navigated=true;if(!nav.classList.contains('active'))nav.click()}}
   const el=visible(current.selector);target.current=el||null;if(!el){setBounds(null);return}
   if(!scrolled){const top=el.getBoundingClientRect().top+scrollY-100;window.scrollTo({top:Math.max(0,top),behavior:'instant'});scrolled=true}
   const r=el.getBoundingClientRect(),top=Math.max(75,r.top-6),left=Math.max(8,r.left-6),height=Math.max(0,Math.min(r.bottom+6,innerHeight-290)-top),b={top,left,width:Math.min(r.width+12,innerWidth-left-8),height};
   setBounds(old=>old&&Object.keys(b).every(k=>Math.abs(old[k as keyof Bounds]-b[k as keyof Bounds])<1)?old:b)
  };
  const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(locate)};locate();const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});addEventListener('resize',schedule);addEventListener('scroll',schedule,true);return()=>{observer.disconnect();cancelAnimationFrame(raf);removeEventListener('resize',schedule);removeEventListener('scroll',schedule,true)}
 },[current,intro]);
 const rememberVictory=()=>{try{localStorage.setItem(victoryKey(userId),'done')}catch{}};
 if(intro)return <OnboardingVictory onDone={rememberVictory} onContinue={()=>{rememberVictory();setIntro(false)}} onClose={onFinish}/>;
 return <div className="product-tour compact-tour">
 {bounds&&bounds.height>0&&<><div className="tour-spotlight" style={bounds}/><div className="tour-mini-pointer" style={{top:Math.max(74,bounds.top-29),left:Math.min(bounds.left+8,Math.max(8,innerWidth-260))}}>{t('↓ Tap here on the page','↓ 在页面这里点击','↓ Touchez ici sur la page')}</div></>}
 <section className="tour-popover compact-tour-panel" role="dialog" aria-modal="false" aria-labelledby="tour-heading" style={bounds&&bounds.left>420?{left:18,right:'auto'}:undefined}>
 <button className="tour-close" onClick={onFinish} aria-label={t('Close tour','关闭引导','Fermer le guide')}>×</button>
 <span className="eyebrow">{t('YOUR FIRST QUEST','你的第一个任务','VOTRE PREMIÈRE QUÊTE')} · {index+1}/3</span>
 <h2 id="tour-heading">{current.title[lang]}</h2><p>{current.text[lang]}</p>
 <div className="tour-demo-actions"><button onClick={()=>setIntro(true)}>{t('⚔ Preview Boss victory','⚔ 预览打败 Boss','⚔ Aperçu de la victoire contre le Boss')}</button></div>
 <div className="tour-controls"><button className="tour-back" onClick={()=>index?setIndex(index-1):onFinish()}>{index?t('← Back','← 上一步','← Retour'):t('Skip','跳过','Passer')}</button><button className="primary tour-next" onClick={()=>index===2?onFinish():setIndex(index+1)}>{index===2?t('Ready to explore ✓','开始探索 ✓','À vous de jouer ✓'):t('Next →','下一步 →','Suivant →')}</button></div>
 </section></div>
}
