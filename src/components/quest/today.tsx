"use client";
import TradingDNA from "./trading-dna";
import AIPredictionReview from "./ai-prediction-review";
import PredictionFocus from "./prediction-focus";
import MonthlyAccuracy from "./monthly-accuracy";
import {readPredictionDraft} from "@/lib/quest/guest-access";
import ScenarioChoices from "./scenario-choices";
import {LocalizeTree,useLocale} from '@/components/i18n/locale-provider';
import { pendingJudgment } from "@/lib/quest/pending-judgment";
import EntryScore from "./entry-score";
import { predictionSession } from "@/lib/quest/prediction-window";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDialogFocus } from "./use-dialog-focus";
import { ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Check, LockKeyhole, Flag, BookOpen, Target, Clock3, Swords, CheckCircle2, Trophy } from "lucide-react";
import type { Direction, Judgment, Review } from "@/lib/quest/types";
import WeeklyTracking from "./weekly-tracking";
import YelanViewer from "./yelan-viewer";
import FirstQuestHero from "./first-quest-hero";
import NextQuestPrompt from "./next-quest-prompt";
import {useAdventureStage} from "./hero-preference";
import WatchlistChart from "./watchlist-chart";
import { LineChart } from "./charts";
import { SectionHeading, directionNames, dollars, dualTime, answeredOn, type ViewProps } from "./shared";
import { nextEvent } from "@/lib/quest/event-view";
import { marketContext } from "@/lib/quest/market-context";
export default function Today({state,run,busy,navigate}:ViewProps) {
 const [activeSymbol,setActiveSymbol]=useState("QQQ");
 const [direction,setDirection]=useState<Direction|null>(null); const [confidence,setConfidence]=useState<Judgment["confidence"]>("medium"); const [reason,setReason]=useState(""); const [expanded,setExpanded]=useState(false); const [reviewing,setReviewing]=useState<Review|null>(null);
 const next=nextEvent(state.events,state.now); const f=state.forecast; const market=marketContext(state); const {bars,latest,change,levels}=market;
 const todayLocked=state.trackingWeeks?.flatMap(w=>w.days).find(d=>d.date===state.session.date)?.judgment;
 const targetSession=predictionSession(state); const judgment=state.judgment; const review=state.reviews[0]; const finishedCards=state.dailyCardIds.filter(id=>state.progress.some(p=>p.cardId===id&&answeredOn(p.lastDispositionAt,state.session.date))).length;
 useEffect(()=>{const draft=readPredictionDraft();if(draft&&draft.date===targetSession.date&&!judgment){setDirection(draft.direction);setConfidence(draft.confidence);setReason(draft.reason);}},[targetSession.date,judgment]);
 const pending=pendingJudgment(state);
 const personalReview=!!review&&typeof review.matched==="boolean";
 const adventureStage=useAdventureStage();
 const tasks=[{label:"锁定今日判断",done:!!todayLocked||!!judgment},{label:"完成收盘复盘",done:!!review?.completedAt},{label:"学完今日卡牌",done:finishedCards>=state.dailyCardIds.length&&finishedCards>0}];
 const closed=!state.session.isTradingDay||new Date(state.now)>=new Date(state.session.openAt);
 if(adventureStage==='landing')return <FirstQuestHero state={state}/>;
 return <LocalizeTree>{<>
 <PredictionFocus state={state} id="judgment" direction={direction} onDirection={setDirection} confidence={confidence} onConfidence={setConfidence} reason={reason} onReason={setReason} busy={busy} onSeal={async()=>{if(f&&direction)return run({type:"judgment",forecastId:f.id,direction,confidence,reason});}}/>
 <MonthlyAccuracy state={state}/>
 {pending?<section className="hero hero-yelan"><div className="hero-copy"><span className="eyebrow"><LockKeyhole size={16}/> {pending.date} · 已封存的盘前判断</span><h1>你的判断<span>{directionNames[pending.direction]} · 待核对</span></h1><p>{pending.reason}</p><p className="hero-yelan-line">封存于 {dualTime(pending.lockedAt)} · 有效盘前判断。等待该交易日收盘及完整日线确认后评分。</p><button className="primary" onClick={()=>document.getElementById("judgment-journal")?.scrollIntoView({behavior:"smooth",block:"start"})}>查看封存记录 <ChevronRight size={16}/></button>{review&&<button className="text-button historical-report-link" onClick={()=>setReviewing(review)}>回看 {review.date} 历史战报 <ChevronRight size={14}/></button>}</div><YelanViewer state={state}/></section>:personalReview&&review?<HeroReview key={`${state.mode}:${review.id}:${review.matched}`} review={review} state={state} onNotes={()=>setReviewing(review)}/>:(<section className="hero hero-yelan"><div className="hero-copy"><NextQuestPrompt/></div><YelanViewer state={state}/></section>)}
 {pending&&personalReview&&review&&<AIPredictionReview id="hero-review-facts" review={review} forecast={state.forecasts.find(f=>f.id===review.forecastId)} onNotes={()=>setReviewing(review)}/>}
 <div className="daily-progress"><div className="progress-title"><Flag size={17}/><strong>今日任务</strong><span>{tasks.filter(t=>t.done).length} / 3 完成</span></div><div className="task-checks">{tasks.map((t,i)=><button key={t.label} onClick={()=>i===2?navigate("learn"):i===1&&review?setReviewing(review):document.getElementById("judgment")?.scrollIntoView({behavior:"smooth"})}><span className={t.done?"task-dot done":"task-dot"}>{t.done?<Check size={10}/>:i+1}</span>{t.label}<span className="task-xp">{i===2?"答对 +5 XP":`+${i===0?10:20} XP`}</span></button>)}</div></div>
 <TradingDNA state={state}/>
 <div id="daily-market-chart" style={{scrollMarginTop:80}}><WatchlistChart locale="zh" settings={state.settings} onSave={settings=>run({type:"settings",settings})} selected={activeSymbol} onSelect={setActiveSymbol} latest={latest} busy={busy}/></div>
 {state.mode==="live"&&state.session.isTradingDay&&state.now>=state.session.closeAt&&review?.date!==state.session.date&&<section className="empty-inline" role="status"><Clock3 size={20}/><div><strong>{state.session.date} 已收盘 · 等待完整日线确认</strong><p>收盘 20 分钟后自动尝试同步，取得有效数据就核对今天封存的判断。下方保留最近一次战报。</p></div></section>}
 <div className="today-columns"><div className="today-main">
 <SectionHeading index="02" title="本周地图" subtitle="先看方向，再看脚下"/>
 <section className="panel weekly-panel"><div className="panel-top"><div><span className="eyebrow">THE BIG PICTURE</span><h3>纳斯达克100 ETF · 本周探索</h3></div><span className={`badge ${state.mode==="demo"||market.fresh?"purple":"gold"}`}>{state.mode==="demo"?"示例日线":latest?market.fresh?"日线已同步":"历史记录 · 待更新":"等待日线"}</span></div><p className="weekly-view">{state.mode==="demo"&&f?f.weeklyView:market.weeklyView}</p>{latest?<><div className="market-chart"><div className="quote"><strong>{dollars(latest.close)}</strong>{change!==undefined&&<span className={change>=0?"positive":"negative"}>{change>=0?"+":""}{change.toFixed(2)}% <span>{latest.date} 收盘</span></span>}</div><LineChart values={bars.slice(-30).map(b=>({date:b.date,value:b.close}))}/></div><p className="data-caption">{state.mode==="demo"?"示例日线":latest.source} · 截至 {latest.date} · 取得时间 {dualTime(latest.fetchedAt)}</p></>:null}{levels&&<><div className="levels"><div><span>近 5 日支撑</span><strong>{dollars(levels.support)}</strong></div><div><span>近 5 日阻力</span><strong>{dollars(levels.resistance)}</strong></div><div><span>20 日均线</span><strong>{dollars(levels.ma20)}</strong></div></div><div className="invalidation"><Flag size={14}/><p><strong>改变观点的条件</strong>{market.invalidation}</p></div><p className="data-caption">均线 = 最近 20 个收盘的均值；支撑 / 阻力 = 最近 5 日低 / 高点。周度地图全天可查看。</p></>}
 <details className="week-details"><summary>上周总结与自选股 <ChevronRight size={14}/></summary><p>{state.weeklySummary||"周度记录积累后生成总结。"}</p>{state.settings.watchlist.length?state.settings.watchlist.map(w=><div className="watch-row" key={w.symbol}><strong>{w.symbol}</strong><span>{w.weeklyNote||"暂无周度笔记"}</span><small>{w.earningsAt?`财报 ${new Date(w.earningsAt).toLocaleDateString("zh-CN",{timeZone:"America/New_York"})}`:"财报日期待确认"}</small></div>):<p>在上方“自选股与图表”中添加最多 5 个自选股并切换图表。</p>}</details></section>
 <SectionHeading index="03" title={f?.date!==state.session.date?"下一交易日准备":"今日剧本"} subtitle="条件先行，保持开放" action={<button className="text-button" onClick={()=>setExpanded(!expanded)}>{expanded?"收起依据":"数据与版本"} <ChevronRight size={14}/></button>}/>
 {f?<><p className="scenario-intro">{f.summary}</p><ScenarioChoices forecast={f} value={judgment?.direction??direction} onChange={setDirection} disabled={busy||!!judgment||Date.parse(state.now)>=Date.parse(targetSession.openAt)}/><div className="data-caption"><Clock3 size={12}/>基于 {f.dataAsOf.includes("T")?`${new Date(f.dataAsOf).toLocaleDateString("zh-CN",{timeZone:"America/New_York"})} ${dualTime(f.dataAsOf)}`:f.dataAsOf} 的已取得数据 · {f.source==="ai"?"AI 情景解读":f.source==="demo"?"示例剧本":"规则情景 · AI 尚未连接"} · v{f.version}</div>{expanded&&<div className="data-details"><h4>依据与版本记录</h4><p>ATR14：{dollars(f.levels.atr14)}。方向判定阈值：±{f.threshold.toFixed(2)}%。</p>{f.scenarios.map(s=><p key={s.direction}><strong>{directionNames[s.direction]}：</strong>{s.basis}</p>)}{state.forecasts.filter(v=>v.date===f.date).map(v=><p key={v.id}>v{v.version} · {dualTime(v.createdAt)} · {v.summary}</p>)}<small>日线可验证收盘与高低区间，无法确认盘中条件的触发顺序。</small></div>}</>:<section className="empty-inline"><Target size={22}/><div><strong>{market.ready?closed?"盘前封存窗口已结束":"日线已同步，等待盘前剧本":"等待完整日线"}</strong><p>{market.ready?closed?"本周地图仍可查看。今日开盘后不补造盘前预测，下一交易日 08:00 ET 准备新剧本。":"今日剧本在交易日 08:00 ET 至开盘前生成；如果已到时间，可点击上方“同步行情”。":"后台使用免费公开日线。上游延迟或限流时保留已有记录，取得完整数据后再生成剧本。"}</p></div></section>}
 </div><aside className="today-aside">
 <section className="learning-teaser"><div className="panel-top"><BookOpen size={21}/><span className="badge gold">五个方向 · 每日新题</span></div><h3>今天，点亮一点新技能。</h3><p>把市场里的问号，变成你的知识装备。</p><div className="mini-cards"><span>δ</span><span>EPS</span><span>✦</span></div><button className="text-button" onClick={()=>navigate("learn")}>抽取今日卡牌 <ArrowUpRight size={15}/></button></section>
 <section className="next-boss"><div className="panel-top"><span className="eyebrow">NEXT CHALLENGE</span><Swords size={17}/></div>{next?<><h3>{next.title}</h3><p>{new Date(next.at).toLocaleDateString("zh-CN",{month:"long",day:"numeric",timeZone:"America/New_York"})} · {dualTime(next.at)}</p></>:<><h3>下一场事件正在确认</h3><p>官方日历同步后展示。</p></>}<button className="text-button" onClick={()=>navigate("events")}>打开事件地图 <ChevronRight size={14}/></button></section>
 </aside></div>
 <div id="judgment-journal" className="journal-wide"><WeeklyTracking state={state} onReview={setReviewing}/></div>
 <EntryScore locale="zh" symbol={activeSymbol}/>
 {reviewing&&<ReviewDialog review={reviewing} state={state} onClose={()=>setReviewing(null)} run={run} busy={busy}/>}
 </>}</LocalizeTree>;
}
function HeroReview({review,state,onNotes}:{review:Review;state:ViewProps["state"];onNotes:()=>void}) {
 const locale=useLocale();
 const labels=locale==="zh"?{review:"查看 AI 复盘",unlocked:"复盘关卡已解锁。和伙伴一起拆解市场线索，装备下一关。"}:locale==="fr"?{review:"Voir le bilan IA",unlocked:"Le bilan est débloqué. Décodez les indices avec votre partenaire et préparez la prochaine quête."}:{review:"View AI debrief",unlocked:"Debrief unlocked. Decode the clues with your partner and equip your next quest."};
 const correct=review.matched===true;
 const [showFacts,setShowFacts]=useState(!correct);
 const reveal=useCallback(()=>setShowFacts(true),[]);
 return <LocalizeTree>{<section className={`hero-report ${correct?"verified":""}`} aria-label="收盘战报">
  <div className="hero hero-yelan">
   <div className="hero-copy"><span className="eyebrow">{correct?<Trophy size={16}/>:<Target size={16}/>} {review.date===state.session.date?"今日收盘战报":"最近收盘战报"} · {review.date}</span>
    {!correct&&<h1>{correct?<>恭喜！方向判断<span>正确！</span></>:review.matched===false?<>这次方向<span>未命中</span></>:<>收盘已确认<span>本次未评分</span></>}</h1>}
    <p>{labels.unlocked}</p>
    {!correct&&<p className="hero-yelan-line">{correct?"✦ 伙伴与你庆祝这次方向判断！":"✦ 伙伴陪你回到证据，继续积累经验。"}</p>}
    <button className="primary" aria-expanded={showFacts} aria-controls="hero-review-facts" onClick={()=>{reveal();requestAnimationFrame(()=>document.getElementById("hero-review-facts")?.scrollIntoView({behavior:"smooth",block:"start"}));}}>{labels.review}<ChevronRight size={16}/></button>
   </div>
   <YelanViewer state={state} review={review} celebrate={correct&&!showFacts} onCelebrationComplete={reveal}/>
  </div>
  {showFacts&&<AIPredictionReview id="hero-review-facts" review={review} forecast={state.forecasts.find(f=>f.id===review.forecastId)} onNotes={onNotes}/>}
 </section>}</LocalizeTree>;
}
function ReviewDialog({review,state,onClose,run,busy}:{review:Review;state:ViewProps["state"];onClose:()=>void;run:ViewProps["run"];busy:boolean}) {
 const dialogRef=useRef<HTMLElement>(null);useDialogFocus(dialogRef,true,onClose);
 const [traded,setTraded]=useState(review.traded??false),[tradeReason,setTradeReason]=useState(review.tradeReason||""),[tradeResult,setTradeResult]=useState(review.tradeResult||""),[lesson,setLesson]=useState(review.lesson||"");
 return <LocalizeTree>{<div className="modal-backdrop" onClick={onClose}><section ref={dialogRef} className="modal review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="关闭战报">×</button><span className="eyebrow">AFTER ACTION REPORT</span><h2 id="review-title">{review.date} · 收盘战报</h2><p className="review-verdict">{review.matched===true?"方向判断正确！":review.matched===false?"方向与收盘结果不同":"本次未评分"}</p><div className="review-facts"><AIPredictionReview review={review} forecast={state.forecasts.find(f=>f.id===review.forecastId)}/><form onSubmit={async e=>{e.preventDefault();if(await run({type:"review",reviewId:review.id,traded,tradeReason,tradeResult,lesson}))onClose();}}><label className="checkbox-row"><input type="checkbox" checked={traded} onChange={e=>setTraded(e.target.checked)}/>我当天有交易</label>{traded&&<><label className="field-label" htmlFor="trade-reason">交易理由</label><input id="trade-reason" value={tradeReason} maxLength={2000} onChange={e=>setTradeReason(e.target.value)} placeholder="哪一个条件让我行动？"/><label className="field-label" htmlFor="trade-result">交易结果</label><input id="trade-result" value={tradeResult} maxLength={2000} onChange={e=>setTradeResult(e.target.value)} placeholder="可写结果、盈亏或执行情况"/></>}<label className="field-label" htmlFor="lesson">给明天的自己一句话</label><textarea id="lesson" required value={lesson} maxLength={2000} onChange={e=>setLesson(e.target.value)} placeholder="今天学到的是……" rows={3}/><button className="primary full" disabled={busy} type="submit"><CheckCircle2 size={16}/>{review.completedAt?"保存复盘笔记":"完成复盘 · +20 XP"}</button></form></div></section></div>}</LocalizeTree>;
}
