"use client";
import CardText from "./card-text";
import {cleanCardText,displayLearningCard} from "@/lib/quest/learning-copy";
import DeckVictory,{useDeckCompletion} from './deck-victory';
import {LocalizeTree} from '@/components/i18n/locale-provider';
import { shuffledIndices } from "@/lib/quest/shuffle";
import KnowledgeExplanation from "./knowledge-explanation";
import InvestmentStyle from "./investment-style";
import { useCardSwipe } from "./use-card-swipe";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, BookOpen, Bookmark, Check, Sparkles, Layers3, RotateCcw, Brain, Landmark, ScrollText, Lightbulb, CheckCircle2, ChartNoAxesCombined, CalendarDays } from "lucide-react";
import type { Category, LearningCard, QuestState } from "@/lib/quest/types";
import { conceptKey, learningThemes, learningQueue, masteredConcepts, nextCardId } from "@/lib/quest/learning-engine";
import { categoryNames, SourceLink, answeredOn, type ViewProps, type RunCommand } from "./shared";
const categoryIcons={earnings:Landmark,options:Layers3,history:ScrollText,technical:ChartNoAxesCombined,events:CalendarDays};
type Tab="daily"|"library"|"collection"|"mastered";
function queueFor(state:QuestState,tab:Tab,theme:Category|"all"){
 return learningQueue(state.cards,state.progress,state.session.date,tab==="daily"?state.dailyCardIds:undefined,theme==="all"?undefined:theme,state.learningVisitId);
}
export default function Learning({state,run,busy}:ViewProps){
 const [tab,setTab]=useState<Tab>("daily"),[theme,setTheme]=useState<Category|"all">("all"),[activeId,setActiveId]=useState<string>();
 const deck=useDeckCompletion(state);
 const visit=useRef<string>(undefined), starting=useRef(false);
 const [ready,setReady]=useState(false),[visitFailed,setVisitFailed]=useState(false);
 useEffect(()=>{
  if(ready||visitFailed||starting.current||busy)return;
  visit.current??=crypto.randomUUID();starting.current=true;
  void run({type:"learningVisit",visitId:visit.current}).then(saved=>{if(saved)setReady(true);else setVisitFailed(true);}).finally(()=>{starting.current=false;});
 },[ready,visitFailed,busy,run]);
 const mastered=masteredConcepts(state.cards,state.progress);
 const queue=queueFor(state,tab,theme);
 const catalogue=state.cards.filter(c=>(theme==="all"||c.category===theme)&&(tab!=="collection"||state.progress.some(p=>p.cardId===c.id&&p.bookmarked))&&(tab!=="mastered"||mastered.has(conceptKey(c))));
 const automatic=tab==="daily"||tab==="library";
 const card=ready?(automatic?(queue.find(c=>c.id===activeId)||queue[0]):catalogue.find(c=>c.id===activeId)):undefined;
 const done=state.dailyCardIds.filter(id=>state.progress.some(p=>p.cardId===id&&answeredOn(p.lastDispositionAt,state.session.date))).length;
 const update=state.learningUpdate;
 function switchTab(next:Tab){setTab(next);setActiveId(undefined);}
 async function classify(action:"review"|"master"){
  if(!card||busy)return;
  const before=queue.map(c=>c.id),current=card.id;
  const saved=await run({type:"card",cardId:current,action});
  if(saved){const remaining=queueFor(saved,tab,theme).map(c=>c.id);if(automatic)deck.finish(current,remaining);setActiveId(automatic?nextCardId(before,current,remaining):undefined);}
 }
 return <LocalizeTree>{<>
  <div className="page-intro learning-intro"><span className="eyebrow">FIVE PATHS · ONE CURIOUS MIND</span><h1>先问一个好问题，<span>再解锁新理解。</span></h1><p>五条学习路线。先选答案，再翻面看解释；左滑，下次回来复习一次，右滑标记掌握。</p></div>
  <InvestmentStyle locale="zh"/>
  <div className="learning-topic-grid">{learningThemes.map(category=>{const Icon=categoryIcons[category],all=state.cards.filter(c=>c.category===category),count=all.filter(c=>mastered.has(conceptKey(c))).length;return <button key={category} className={`learning-topic theme-${category} ${theme===category?"active":""}`} aria-pressed={theme===category} onClick={()=>{setTheme(theme===category?"all":category);setActiveId(undefined);}}><Icon size={23}/><strong>{categoryNames[category]}</strong><span>{all.length} 道题 · {count} 已掌握</span><div className="xp-track"><span style={{width:`${all.length?count/all.length*100:0}%`}}/></div></button>;})}</div>
  <section className="learning-update panel"><div><span className="eyebrow">TODAY’S WATCH & LEARN</span><h3>今日五股 · 财报学习篮子</h3></div>{update?<><div className="learning-stocks">{update.stocks.map(stock=><a key={stock.symbol} href={stock.sourceUrl} title={stock.reason} target="_blank" rel="noreferrer"><strong>{stock.symbol}</strong><span>{stock.name}</span></a>)}</div><p className="muted">{update.selectionBasis}</p><small className={update.status==="stale"?"learning-stale":"muted"}>{update.status==="ready"?"今日新题已入库":"保留上次成功题库，等待今日更新"} · {update.date} 美东 · 新增批次 {update.count} 题</small></>:<p className="muted">基础题库已就绪，等待首次每日新题同步。五股按纳斯达克100 ETF 相关性与近期财报关注度选取，并附选择依据。</p>}</section>
  <div className="learning-nav"><div className="segmented">{([["daily","今日练习"],["library","全部题库"],["collection","我的收藏"],["mastered","已掌握"]] as [Tab,string][]).map(([value,label])=><button key={value} className={tab===value?"active":""} onClick={()=>switchTab(value)}>{label}</button>)}</div><span className="learning-total"><BookOpen size={15}/>{state.cards.length} 道题 · {mastered.size} 个概念已掌握</span></div>
  {theme!=="all"&&<button className="text-button" onClick={()=>{setTheme("all");setActiveId(undefined);}}>正在学习：{categoryNames[theme]} · 显示全部方向 ×</button>}
  <div className="learning-layout"><section className="card-stage"><div className="deck-heading"><span>{tab==="daily"?"DAILY QUEST":tab==="mastered"?"MASTERED CONCEPTS":"EXPLORE YOUR DECK"}</span><span>{tab==="daily"?`${done} / ${state.dailyCardIds.length} 已完成`:`${automatic?queue.length:catalogue.length} 道${automatic?"可练习":"可查看"}`}</span></div>
   {deck.completed?<DeckVictory count={deck.completed} onContinue={deck.close}/>:!ready?<div className="deck-complete" role="status"><p>{visitFailed?"暂时无法整理练习，请重试。":"正在整理新题与本次复习…"}</p>{visitFailed&&<button className="secondary" disabled={busy} onClick={()=>setVisitFailed(false)}>重试</button>}</div>:card?<QuizCard key={`${state.mode}:${card.id}`} card={card} state={state} run={run} busy={busy} mastered={mastered.has(conceptKey(card))} onClassify={classify}/>:<div className="deck-complete"><span><CheckCircle2 size={42}/></span><h2>{automatic?"这组练习已完成。":"选择一张卡，回看你的知识。"}</h2><p>{automatic?"左滑的题下次回来复习一次，已掌握的概念不再自动出现。也可以切换方向，探索更多新题。":"可以回看题目与讲解，不改变复习安排。"}</p>{tab==="daily"&&<button className="primary" onClick={()=>switchTab("library")}>继续探索全部题库 <ArrowRight size={16}/></button>}</div>}
  </section><aside className="learning-side"><div className="panel"><span className="eyebrow">YOUR LEARNING ROUTE</span><h3>{tab==="daily"?"今天的知识任务":tab==="mastered"?"已经掌握的概念":tab==="collection"?"你的收藏册":"按兴趣自由练习"}</h3><p className="muted">{tab==="daily"?"每天每个方向一张新题，加上你主动安排的本次复习。周末也可以继续。":"点击题目进入。收藏独立于掌握状态，不会改变复习安排。"}</p><div className="daily-card-list learning-scroll-list">{(automatic?queue:catalogue).map((c,index)=><button key={c.id} className={c.id===card?.id?"active":""} onClick={()=>setActiveId(c.id)} disabled={busy}><span>{mastered.has(conceptKey(c))?<Check size={15}/>:String(index+1).padStart(2,"0")}</span><div><strong>{c.title}</strong><small>{categoryNames[c.category]}{c.symbol?` · ${c.symbol}`:""}</small></div></button>)}{!(automatic?queue:catalogue).length&&<p className="muted">这个方向暂时没有待处理卡片。</p>}</div></div><div className="wisdom-note"><Brain size={24}/><h3>答错也能学会。</h3><p>答题记录理解过程；是否需要复习，由你决定。左滑，下次回来再见一次，右滑告别重复。已掌握页可手动重新加入复习。</p></div></aside></div>
 </>}</LocalizeTree>;
}
function QuizCard({card:rawCard,state,run,busy,mastered,onClassify}:{card:LearningCard;state:QuestState;run:RunCommand;busy:boolean;mastered:boolean;onClassify:(action:"review"|"master")=>Promise<void>}){
 const card=displayLearningCard(rawCard);
 const answering=useRef(false);
 const choiceOrder=shuffledIndices(card.choices.length,`${state.learningVisitId || state.session.date}:${card.id}:choices`);
 const [celebrate,setCelebrate]=useState(false),[front,setFront]=useState(false);
 useEffect(()=>{if(!celebrate)return;const timer=setTimeout(()=>setCelebrate(false),1400);return()=>clearTimeout(timer);},[celebrate]);
 const progress=state.progress.find(p=>p.cardId===card.id);
 const answered=progress?.lastAnswerIndex!==undefined && (progress.lastAnswerVisitId===state.learningVisitId || mastered);
 const revealed=(answered||mastered)&&!front,chosen=answered?progress?.lastAnswerIndex:undefined;
 const swipeHandlers=useCardSwipe(answered&&!mastered&&!busy,action=>onClassify(action),card.id);
 async function answer(index:number){
  if(busy||answering.current)return;answering.current=true;
  try{await run({type:"card",cardId:card.id,action:"answer",answerIndex:index});}finally{answering.current=false;}
 }
 const Icon=categoryIcons[card.category];
 return <LocalizeTree>{<><div className="swipe-deck"><article className={`knowledge-card quiz-first ${card.category} ${revealed?"is-flipped":""}`} {...swipeHandlers.handlers}>
  {celebrate&&<div className="quiz-fireworks" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{"--angle":`${i*20}deg`,"--delay":`${i%3*70}ms`} as React.CSSProperties}/>)}</div>}
  <div className="card-header"><span><Icon size={16}/>{categoryNames[card.category]}</span><button className="icon-button" disabled={busy||progress?.bookmarked} aria-label={progress?.bookmarked?"已收藏":"收藏这张卡"} onClick={()=>void run({type:"card",cardId:card.id,action:"bookmark"})}><Bookmark size={17} fill={progress?.bookmarked?"currentColor":"none"}/></button></div>
  <div className="card-emblem"><Icon size={39} strokeWidth={1.2}/><span className="card-emblem-orbit"/></div><span className="card-level">{mastered?"已掌握 · 手动回看":progress?.attempts?"巩固理解":"新知识"} · {card.difficulty===1?"入门":card.difficulty===2?"进阶":"深入"}{card.symbol?` · ${card.symbol}`:""}</span><h2><CardText>{card.title}</CardText></h2>{card.asOf&&<p className="card-reason">资料日期 {card.asOf}</p>}<p className="card-question"><CardText>{card.question}</CardText></p>
  {front&&<button className="text-button quiz-return" type="button" onClick={()=>setFront(false)}>返回讲解 ↻</button>}{!revealed?<div className="quiz-front"><p className="quiz-instruction">{front?"仅回看题目；答题记录保持不变":"选一个答案，解锁讲解"}</p><div className="quiz-choices">{choiceOrder.map((originalIndex,index)=><button key={originalIndex} disabled={busy||answered||mastered} onClick={()=>void answer(originalIndex)}><span>{String.fromCharCode(65+index)}</span>{card.choices[originalIndex]}<ArrowRight size={15}/></button>)}</div>{!front&&<button type="button" className="card-dont-know" disabled={busy||answered||mastered} onClick={()=>void answer(-1)}>我不知道 · 看讲解</button>}</div>:<div className="card-back quiz-reveal" aria-live="polite"><button className="text-button quiz-return" type="button" onClick={()=>setFront(true)}>↶ 返回正面，回看题目</button><div className="answer-explanation"><strong>{chosen===undefined?"已掌握的知识":chosen===card.answerIndex?"答对了 · 理解再进一步":"记住这个关键条件"}</strong><p>正确答案 {String.fromCharCode(65+choiceOrder.indexOf(card.answerIndex))}：{card.choices[card.answerIndex]}</p>{chosen!==undefined&&chosen>=0&&chosen!==card.answerIndex&&<small>你的选择：{card.choices[chosen]}</small>}<p><CardText>{card.answerExplanation}</CardText></p></div><div className="card-analogy"><Lightbulb size={19}/><p><CardText>{card.analogy}</CardText></p></div><p><CardText>{card.explanation}</CardText></p><div className="card-example"><span>用一个例子记住</span><p><CardText>{card.example}</CardText></p></div><KnowledgeExplanation card={card} locale="zh"/><div className="card-sources">{card.sources.map(source=><SourceLink key={source.url} href={source.url}>{cleanCardText(source.title)||"参考资料"}</SourceLink>)}</div>{card.asOf&&<p className="muted">资料截至 {card.asOf} · 后续数据可能修订</p>}</div>}
  <div className="card-footer"><span>纳斯达克100 ETF · 知识卡牌</span><Sparkles size={14}/></div>
 </article></div>{mastered?<button className="next-card" disabled={busy} onClick={()=>void run({type:"card",cardId:card.id,action:"reset"})}><RotateCcw size={15}/>重新加入复习</button>:<><div className="swipe-actions"><button className="swipe-skip" disabled={busy||swipeHandlers.pending||!answered} onClick={()=>swipeHandlers.swipe("review")}><ArrowLeft size={17}/>还不熟 · 下次复习一次</button><button className="swipe-save" disabled={busy||swipeHandlers.pending||!answered} onClick={()=>swipeHandlers.swipe("master")}><Check size={17}/>已掌握 · 不再出现<ArrowRight size={17}/></button></div><p className="swipe-hint">{answered?"在卡片上左滑复习 · 右滑掌握，也可以点按钮":"先选答案，随后才能选择复习或掌握"}</p></>}</>}</LocalizeTree>;
}
