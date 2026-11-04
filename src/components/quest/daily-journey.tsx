'use client';
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {useLocale} from '@/components/i18n/locale-provider';
import './daily-journey.css';

export type JourneyView='today'|'events'|'learn';
export const journeyViews:JourneyView[]=['today','events','learn'];
const copy={
 zh:{title:'今天，走完一条清楚的练习路线',intro:'先留下自己的预判，用重大事件补全市场背景，再用知识卡巩固理解。收盘后回来，伙伴会用结果陪你复盘。',steps:[
 {title:'每日冒险',task:'盘前选方向，收盘看反馈',why:'参考纳斯达克图表，封存方向和理由。核实收盘后，把原始判断与结果对照。',output:'留下判断 → 获得伙伴复盘'},
 {title:'事件 Boss',task:'读懂影响市场预期的大事',why:'查看财报、利率与经济数据，比较公布结果与预期，为你的判断补充背景。',output:'发现线索 → 理解市场预期'},
 {title:'知识卡牌',task:'把市场里的问号变成新技能',why:'每天学习五张卡，选答案、看讲解，巩固刚遇到的金融概念，再带回下一次预判。',output:'理解概念 → 改进下一次判断'}],done:'已探索',open:'展开这一站',next:['已看完，继续事件 Boss','已看完，继续知识卡牌','完成学习，回到每日冒险'],again:['继续事件 Boss','继续知识卡牌','回到每日冒险'],progress:'今日探索',saved:'今天的探索已记录',mark:'看完这一站后，记录进度并继续。'},
 en:{title:'One clear route through your trading practice',intro:'Make your own call, add context with major events, then strengthen your understanding with cards. Return after the close for your companion’s debrief.',steps:[
 {title:'Daily Quest',task:'Choose before the bell. Review after the close.',why:'Use the Nasdaq chart to seal a direction and a reason. Compare your original call with the verified close.',output:'Record a call → Get companion feedback'},
 {title:'Event Boss',task:'Understand what is moving expectations.',why:'Explore earnings, rates and economic releases. Compare results with expectations to add context to your call.',output:'Find clues → Understand expectations'},
 {title:'Knowledge Deck',task:'Turn market questions into new skills.',why:'Learn five cards a day: choose, read the explanation and carry the concept into your next prediction.',output:'Learn a concept → Improve your next call'}],done:'Explored',open:'Open this stop',next:['Mark explored · Continue to Event Boss','Mark explored · Continue to Knowledge Deck','Finish learning · Return to Daily Quest'],again:['Continue to Event Boss','Continue to Knowledge Deck','Return to Daily Quest'],progress:'Today’s exploration',saved:'Today’s exploration is recorded',mark:'After exploring this stop, save your progress and continue.'},
 fr:{title:'Un parcours clair pour votre pratique du trading',intro:'Formulez votre prévision, éclairez-la avec les grands événements, puis consolidez vos connaissances avec les cartes. Après la clôture, retrouvez le bilan de votre partenaire.',steps:[
 {title:'Quête du jour',task:'Choisir avant la séance. Relire après la clôture.',why:'Appuyez-vous sur le graphique du Nasdaq pour sceller une direction et une raison. Comparez votre prévision à la clôture vérifiée.',output:'Noter une prévision → Recevoir un retour'},
 {title:'Boss des marchés',task:'Comprendre ce qui fait évoluer les attentes.',why:'Explorez résultats, taux et données économiques. Comparez les publications aux attentes pour éclairer votre jugement.',output:'Repérer les indices → Comprendre les attentes'},
 {title:'Cartes pédagogiques',task:'Transformer les questions en nouvelles compétences.',why:'Cinq cartes par jour : choisissez, lisez l’explication et réutilisez ce concept dans votre prochaine prévision.',output:'Comprendre un concept → Affiner sa prévision'}],done:'Exploré',open:'Ouvrir cette étape',next:['Noter ma progression · Passer aux Boss','Noter ma progression · Passer aux cartes','Terminer · Revenir à la quête du jour'],again:['Passer aux Boss','Passer aux cartes','Revenir à la quête du jour'],progress:'Exploration du jour',saved:'Votre exploration du jour est enregistrée',mark:'Après cette étape, enregistrez votre progression et continuez.'}
};

export function useJourneyNavigation(ready:boolean){
 const [view,setView]=useState<JourneyView>(()=>{if(typeof window==='undefined')return 'today';const requested=new URLSearchParams(location.search).get('view');return requested==='events'||requested==='learn'?requested:'today';});
 const navigate=useCallback((next:JourneyView)=>{
  setView(next);
  const url=new URL(location.href);url.searchParams.set('view',next);url.hash='journey-'+next;
  history.replaceState(null,'',url);
  requestAnimationFrame(()=>{const target=document.getElementById('journey-'+next);target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});target?.focus({preventScroll:true});});
 },[]);
 useEffect(()=>{
  if(!ready)return;
  const requested=new URLSearchParams(location.search).get('view');
  const initial:JourneyView=requested==='events'||requested==='learn'?requested:'today';
  setView(initial);
  const frame=requestAnimationFrame(()=>{if(initial!=='today'&&(!location.hash||location.hash.startsWith('#journey-')))document.getElementById('journey-'+initial)?.scrollIntoView({block:'start'});});
  if(!('IntersectionObserver' in window))return()=>cancelAnimationFrame(frame);
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting){const next=(entry.target as HTMLElement).dataset.journey as JourneyView;if(journeyViews.includes(next))setView(next);}
  },{rootMargin:'-15% 0px -65% 0px'});
  document.querySelectorAll('[data-journey]').forEach(el=>observer.observe(el));
  return()=>{cancelAnimationFrame(frame);observer.disconnect();};
 },[ready]);
 return {view,navigate};
}

export function JourneyOverview({view,completed,navigate}:{view:JourneyView;completed:string[];navigate:(view:JourneyView)=>void}){
 const locale=useLocale(),c=copy[locale==='zh'?'zh':locale==='fr'?'fr':'en'];
 return <section className="quest-route-overview" aria-labelledby="quest-route-title"><div className="quest-route-intro"><span>{c.progress} · {completed.length}/3</span><h1 id="quest-route-title">{c.title}</h1><p>{c.intro}</p></div><nav aria-label={c.progress} className="quest-route-map">{journeyViews.map((id,i)=><button type="button" key={id} data-tour-nav={id} aria-current={view===id?'location':undefined} onClick={()=>navigate(id)}><span className="quest-route-number">{completed.includes(id)?'✓':String(i+1).padStart(2,'0')}</span><strong>{c.steps[i].title}</strong><small>{c.steps[i].task}</small></button>)}</nav></section>;
}

export function JourneySection({id,active,reached,completed,busy,onComplete,navigate,children}:{id:JourneyView;active:boolean;reached:boolean;completed:boolean;busy:boolean;onComplete:(id:JourneyView)=>Promise<unknown>;navigate:(id:JourneyView)=>void;children:ReactNode}){
 const locale=useLocale(),c=copy[locale==='zh'?'zh':locale==='fr'?'fr':'en'],index=journeyViews.indexOf(id),step=c.steps[index];
 const root=useRef<HTMLElement>(null),[visited,setVisited]=useState(id==='today'||active||reached);
 useEffect(()=>{if(active||reached)setVisited(true);},[active,reached]);
 useEffect(()=>{
  if(visited)return;
  if(!('IntersectionObserver' in window)){setVisited(true);return;}
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisited(true);observer.disconnect();}},{rootMargin:'400px 0px'});
  if(root.current)observer.observe(root.current);
  return()=>observer.disconnect();
 },[visited]);
 async function finish(){if(!completed){const saved=await onComplete(id);if(!saved)return;}navigate(journeyViews[(index+1)%3]);}
 return <section ref={root} id={'journey-'+id} data-journey={id} className="quest-route-section" tabIndex={-1} aria-labelledby={'journey-title-'+id}><header className="quest-route-section-heading"><span className="quest-route-number">{String(index+1).padStart(2,'0')}</span><div><h2 id={'journey-title-'+id}>{step.title}<small>{completed?'✓ '+c.done:''}</small></h2><p>{step.why}</p><span className="quest-route-output">✦ {step.output}</span></div></header><div className="quest-route-content">{visited||active||reached?children:<button type="button" className="secondary" onClick={()=>setVisited(true)}>{c.open} →</button>}</div><footer className="quest-route-checkpoint"><p>{completed?c.saved:c.mark}</p><button className="primary" type="button" disabled={busy} onClick={()=>void finish()}>{completed?c.again[index]:c.next[index]} →</button></footer></section>;
}

export function revealJourneyTarget(id:string){
 const target=document.getElementById(id);
 let parent=target?.parentElement;
 while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}
 requestAnimationFrame(()=>target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));
}
export function JourneyResources({title,children}:{title:string;children:ReactNode}){
 const root=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const reveal=()=>{const id=decodeURIComponent(location.hash.slice(1));if(!id)return;const target=document.getElementById(id);if(target&&root.current?.contains(target)){root.current.open=true;requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));}};reveal();addEventListener('hashchange',reveal);return()=>removeEventListener('hashchange',reveal);},[]);
 return <details ref={root} className="quest-route-tools"><summary>{title}</summary>{children}</details>;
}
