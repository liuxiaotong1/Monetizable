'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from '@/components/i18n/locale-provider';
import HeroOutcome from '@/components/quest/hero-outcome';
import {useDialogFocus} from '@/components/quest/use-dialog-focus';
import DeckVictory from '@/components/quest/deck-victory';
import '@/components/quest/hero-experience.css';
import './product-tour.css';
type Bounds={top:number;left:number;width:number;height:number};
const steps=[
 {view:'today',selector:'#en-judgment .scenario-choices, #judgment .direction-selector, #en-judgment, #judgment',title:['Make your call','留下你的判断','Faites votre prévision'],text:['Tap Up, Sideways or Down. Add one reason below, then save your call.','点击偏多、震荡或偏空，在下方写一句理由，再封存判断。','Touchez Hausse, Range ou Baisse. Ajoutez une raison, puis enregistrez.']},
 {view:'events',selector:'.boss-picks, .boss-quest-header, .boss-quest',title:['Challenge the next Boss','挑战下一个事件 Boss','Défiez le prochain Boss'],text:['Read the release and consensus. Tap Below, Equal or Above to make your prediction.','先看数据发布时间和市场预期，再点击低于、符合或高于预期。','Lisez la publication et le consensus. Choisissez en dessous, égal ou au-dessus.']},
 {view:'learn',selector:'.en-choices, .quiz-choices, .swipe-actions, .swipe-deck, .card-stage, .premium-gate',title:['Turn a question into a skill','把问号变成技能','Transformez une question en compétence'],text:['Tap an answer to flip. Read the explanation; swipe left to review or right when understood.','点击答案翻面，读完解释后左滑复习，右滑表示已学会。','Touchez une réponse pour retourner la carte. À gauche pour revoir ; à droite si compris.']},
] as const;
export default function ProductTour({onFinish}:{zh:boolean;onFinish:()=>void}){
 const locale=useLocale(),lang=locale==='zh'?1:locale==='fr'?2:0,[index,setIndex]=useState(0),[bounds,setBounds]=useState<Bounds|null>(null),[demo,setDemo]=useState<'win'|'loss'|null>(null),[intro,setIntro]=useState<0|1|null>(0),[introDone,setIntroDone]=useState(false),target=useRef<HTMLElement|null>(null);
 const demoPanel=useRef<HTMLDivElement>(null);useDialogFocus(demoPanel,!!demo,()=>setDemo(null));
 const current=steps[index],t=(en:string,zh:string,fr:string)=>[en,zh,fr][lang];
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(demo)setDemo(null);else onFinish()}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[demo,onFinish]);
 useEffect(()=>{
  const original=document.documentElement.style.scrollPaddingBottom;document.documentElement.style.scrollPaddingBottom='310px';return()=>{document.documentElement.style.scrollPaddingBottom=original}
 },[]);
 useEffect(()=>{
  if(intro!==null)return;
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
 useEffect(()=>{
  if(intro===null)return;
  let next:ReturnType<typeof setTimeout>|undefined;document.documentElement.classList.add('quest-battle-demo');const boss=intro===0?'dragon':'beetle';setIntroDone(false);window.scrollTo({top:0,behavior:'instant'});
  const complete=(e:Event)=>{if((e as CustomEvent).detail?.boss===boss){setIntroDone(true);if(intro===0)next=setTimeout(()=>setIntro(1),1100)}};
  addEventListener('monetizable-tutorial-battle-complete',complete);
  const frame=requestAnimationFrame(()=>{document.querySelector('.en-hero,.hero-yelan')?.scrollIntoView({block:'start',behavior:'instant'});dispatchEvent(new CustomEvent('monetizable-tutorial-battle',{detail:{boss}}))});
  return()=>{clearTimeout(next);document.documentElement.classList.remove('quest-battle-demo');cancelAnimationFrame(frame);removeEventListener('monetizable-tutorial-battle-complete',complete);dispatchEvent(new CustomEvent('monetizable-tutorial-battle',{detail:{boss:null}}))}
 },[intro]);
 if(intro!==null)return <div className="product-tour compact-tour"><section className="tour-popover compact-tour-panel tour-battle-intro" role="dialog" aria-modal="false" aria-labelledby="tour-battle-title"><button className="tour-close" onClick={onFinish} aria-label={t('Close tour','关闭引导','Fermer le guide')}>×</button><span className="eyebrow">{t('VICTORY DEMO · NO SCORE SAVED','胜利演示 · 不保存成绩','DÉMO DE VICTOIRE · SANS SCORE')}</span><h2 id="tour-battle-title">{intro===0?t('A correct call. Water dragon defeated!','预判成功，击败水龙！','Bonne prévision : le dragon est vaincu !'):t('Another win. Break the Beetle King’s armor!','再下一城，击破甲虫王！','Nouvelle victoire : brisez l’armure du Roi Scarabée !')}</h2><p>{t('Your chosen hero is fighting at the top of the page. This simulates tomorrow’s result; real wins require verified data.','你选择的伙伴正在首页顶部战斗。这是次日预判成功的模拟；真实胜利以核实数据为准。','Votre partenaire combat en haut de la page. Ceci simule le résultat du lendemain ; une vraie victoire exige des données vérifiées.')}</p><div className="tour-controls"><button onClick={()=>{setIntroDone(false);dispatchEvent(new CustomEvent('monetizable-tutorial-battle',{detail:{boss:intro===0?'dragon':'beetle'}}))}}>{t('↻ Replay','↻ 重播','↻ Rejouer')}</button><button className="primary" onClick={()=>setIntro(intro===0?1:null)}>{intro===0?t('Next: Beetle King →','下一场：甲虫王 →','Suivant : Roi Scarabée →'):t('Start the guided quest →','开始任务引导 →','Commencer le guide →')}</button></div><small aria-live="polite">{introDone?t('Demo complete','演示已完成','Démonstration terminée'):t('Demo playing on your hero’s stage','角色舞台正在播放演示','La démonstration se joue sur votre scène')}</small></section></div>;
 return <>
 <div className="product-tour compact-tour">
 {bounds&&bounds.height>0&&<><div className="tour-spotlight" style={bounds}/><div className="tour-mini-pointer" style={{top:Math.max(74,bounds.top-29),left:Math.min(bounds.left+8,Math.max(8,innerWidth-260))}}>{t('↓ Tap here on the page','↓ 在页面这里点击','↓ Touchez ici sur la page')}</div></>}
 <section className="tour-popover compact-tour-panel" role="dialog" aria-modal="false" aria-labelledby="tour-heading" style={bounds&&bounds.left>420?{left:18,right:'auto'}:undefined}>
 <button className="tour-close" onClick={onFinish} aria-label={t('Close tour','关闭引导','Fermer le guide')}>×</button>
 <span className="eyebrow">{t('YOUR FIRST QUEST','你的第一个任务','VOTRE PREMIÈRE QUÊTE')} · {index+1}/3</span>
 <h2 id="tour-heading">{current.title[lang]}</h2><p>{current.text[lang]}</p>
 <div className="tour-demo-actions"><button onClick={()=>setDemo('win')}>{index===2?t('✦ Preview completion','✦ 预览通关','✦ Voir la réussite'):t('⚔ Preview my victory','⚔ 预览我的胜利','⚔ Voir ma victoire')}</button>{index<2&&<button onClick={()=>setDemo('loss')}>{t('A missed call?','如果未命中？','Et si je me trompe ?')}</button>}</div>
 <div className="tour-controls"><button className="tour-back" onClick={()=>index?setIndex(index-1):onFinish()}>{index?t('← Back','← 上一步','← Retour'):t('Skip','跳过','Passer')}</button><button className="primary tour-next" onClick={()=>index===2?onFinish():setIndex(index+1)}>{index===2?t('Ready to explore ✓','开始探索 ✓','À vous de jouer ✓'):t('Next →','下一步 →','Suivant →')}</button></div>
 </section></div>
 {demo&&<div className="tour-demo-backdrop" onClick={()=>setDemo(null)}><div ref={demoPanel} role="dialog" aria-modal="true" aria-label={t('Tutorial demo','教程演示','Démonstration')} onClick={e=>e.stopPropagation()}>{index===2?<><DeckVictory demo/><button className="primary" onClick={()=>setDemo(null)}>{t('Back to the page','返回页面','Revenir à la page')}</button></>:<HeroOutcome result={demo} boss={index===1?'beetle':'dragon'} demo onClose={()=>setDemo(null)}/>}</div></div>}
 </>
}
