"use client";
import {LocalizeTree} from '@/components/i18n/locale-provider';
import EventTakeaway from "./event-takeaway";
import { compactEventUnit } from "@/lib/quest/event-presentation";
import DataFreshness from "./data-freshness";
import AgentReports from "./agent-reports";
import EventIntelligencePanel from "./event-intelligence";
import { useRef, useState } from "react";
import { useDialogFocus } from "./use-dialog-focus";
import { Swords, CalendarDays, ArrowRight, Bell, ChevronRight, Flame, Clock3, Sparkles, ExternalLink, RefreshCw } from "lucide-react";
import type { MarketEvent } from "@/lib/quest/types";
import { calendarCoverage, eventStatusAt, eventWeek, nextEvent, numericEvent, selectEvents, type EventCategory, type EventScope } from "@/lib/quest/event-view";
import { MacroChart } from "./charts";
import { PublicationHistory } from "./publication-history";
import { SectionHeading, SourceLink, dualTime, type ViewProps } from "./shared";

function eventDate(at: string) {
  const date = new Date(at);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("zh-CN", { month: "short", day: "numeric", timeZone: "America/New_York" }) : "待确认";
}
function countdown(event: MarketEvent, now: string) {
  if (event.status === "unconfirmed") return "日期待确认";
  const mins = Math.ceil((Date.parse(event.at) - Date.parse(now)) / 60000);
  if (mins <= 0) return event.status === "confirmed" ? (event.report?"报告已发布":"结果已确认") : "等待结果确认";
  if (mins < 60) return `${mins} 分钟后`;
  if (mins < 1440) return `${Math.floor(mins / 60)} 小时 ${mins % 60} 分后`;
  return `${Math.floor(mins / 1440)} 天后`;
}
const categories: [EventCategory, string][] = [["all", "全部"], ["macro", "宏观"], ["earnings", "财报"]];
const scopes: [EventScope, string][] = [["week", "本周"], ["next7", "未来 7 天"], ["all", "全部日程"]];

export default function Events({ state, navigate, busy, refreshData }: ViewProps) {
  const [filter, setFilter] = useState<EventCategory>("all");
  const [scope, setScope] = useState<EventScope>("week");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = state.events.find(event=>event.id===selectedId);
  const historySources=state.sources.filter(source=>source.name.startsWith("FRED ")&&source.name.endsWith("历史"));
  const connected=historySources.filter(source=>source.status==="ready");
  const events = selectEvents(state.events, state.now, scope, filter);
  const next = nextEvent(state.events, state.now);
  const week = eventWeek(state.now);
  const coverage = calendarCoverage(state.sources, state.now);
  const acquired = coverage.ready.map(source => source.lastSuccess).filter(Boolean).sort().at(-1);
  return <LocalizeTree>{<>
    <div className="page-intro"><span className="eyebrow">KNOW YOUR NEXT CHALLENGE</span><h1>大事件，<span>先读懂再应对。</span></h1><p>本周发生了什么，接下来要等什么。把数据背后的故事看清楚。</p></div>
    <DataFreshness state={state}/>
    <AgentReports demo={state.mode==="demo"} now={state.now}/>
    <section className="boss-hero">
      <div className="boss-hero-icon"><Swords size={44} /><span className="orbit orbit-one" /><span className="orbit orbit-two" /></div>
      <div className="boss-hero-copy"><span className="eyebrow">NEXT BOSS</span><h2>{next?.title || "下一场事件，等待官方确认"}</h2><p>{next ? next.description : "目前未取得接下来的可靠日程，请查看下方日历同步状态。"}</p><div className="boss-hero-meta"><span><CalendarDays size={14} />{next ? `${eventDate(next.at)} · ${dualTime(next.at)}` : "来源：官方发布日历"}</span><span><Bell size={14} />提前 30 分钟提醒</span></div></div>
      {next && <div className="boss-countdown"><span>距离挑战</span><strong>{countdown(next, state.now)}</strong><button className="text-button" onClick={() => setSelectedId(next.id)}>查看作战情报 <ArrowRight size={15} /></button></div>}
    </section>
    <SectionHeading title="重大事件地图" subtitle="先看事件与官方数据，再看市场如何解读" action={<div className="segmented" aria-label="事件类别">{categories.map(([value, name]) => <button key={value} aria-pressed={filter === value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{name}</button>)}</div>} />
    <div className="event-period-controls"><div className="segmented" aria-label="事件时间范围">{scopes.map(([value, name]) => <button key={value} aria-pressed={scope === value} className={scope === value ? "active" : ""} onClick={() => setScope(value)}>{name}</button>)}</div><span>{scope === "week" ? `${week.start.slice(5).replace("-", "/")} – ${week.lastDate.slice(5).replace("-", "/")} · 美东本周` : scope === "next7" ? "从现在起的 7 天" : "未来日程与已保存记录"} · {events.length} 项</span></div>
    <div className="event-list">{events.length ? events.map(event => {
      const status = eventStatusAt(event, state.now);
      return <button key={event.id} className={`event-row ${status === "pending" || status === "confirmed" ? "event-past" : ""}`} onClick={() => setSelectedId(event.id)}>
        <div className={`event-emblem ${event.kind.toLowerCase()}`}>{event.kind === "EARNINGS" ? <span>{event.symbol?.slice(0, 2) || "E"}</span> : ["FOMC", "MINUTES", "BEIGE_BOOK"].includes(event.kind) ? <Swords size={23} /> : <Flame size={23} />}</div>
        <div className="event-row-copy"><div><span className="event-kind">{event.kind.replace("_", " ")}</span><span className={`badge ${status === "confirmed" ? "green" : "purple"}`}>{status === "confirmed" ? (event.report?"官方报告已发布":"官方结果已确认") : status === "unconfirmed" ? "日期待确认" : status === "pending" ? (event.calendarValues?.reported!==undefined&&Date.parse(event.at)<=Date.parse(event.calendarValues.fetchedAt)?"日历已报告 · 官方待确认":"已到公布时间 · 结果待确认") : "Boss 预告"}</span></div><h3>{event.title}</h3><p>{event.analogy}</p>{event.actual!==undefined&&<small className="event-row-values">公布值 {event.actual.toLocaleString("zh-CN")} · 前值 {event.previous?.toLocaleString("zh-CN")??"—"} · {event.unit}</small>}{event.report&&<small className="event-row-values">{event.report.summary[0]}</small>}{event.calendarValues&&event.actual===undefined&&<small className="event-row-values">前值 {event.previous??"—"} · 市场共识 {event.consensus??"—"} · {event.unit}</small>}<small className="event-row-source">{event.sourceName}{event.history.length?` · 历史 ${event.history.length} 条 · 最新 ${event.history.at(-1)?.date}`:""}</small></div>
        <div className="event-row-time"><strong>{status === "unconfirmed" ? "日期待确认" : eventDate(event.at)}</strong><span>{status === "unconfirmed" ? "官方尚未确认" : dualTime(event.at)}</span><small>{countdown(event, state.now)}</small></div><ChevronRight size={18} />
      </button>;
    }) : <div className="empty-large"><CalendarDays size={34} /><h3>这个范围暂未取得事件</h3><p>这不代表没有重大事件。可切换“全部日程”，并查看日历同步状态；自选股财报也可在设置中补充。</p></div>}</div>
    {state.mode === "live" && <details className={`calendar-coverage ${coverage.unavailable.length ? "partial" : ""}`}>
      <summary><CalendarDays size={15} />{coverage.ready.length ? `已同步 ${coverage.ready.length} 个日历来源` : "事件日历尚未同步"}{coverage.unavailable.length ? ` · ${coverage.unavailable.length} 个来源待恢复` : ""}<ChevronRight size={14} /></summary>
      <p>{acquired ? `最近成功同步：${new Date(acquired).toLocaleString("zh-CN", { timeZone: "Europe/Paris" })} 巴黎时间。` : "尚无成功同步记录。"} BLS 暂不可访问时，采用明确标注的纽约联储交叉日历；日程不代表公布结果。日历覆盖选定的主要宏观发布与自选股财报。</p>
      {coverage.unavailable.map(source => <p key={source.name}><strong>{source.name}</strong> · {source.message}{source.lastSuccess ? ` 上次成功：${new Date(source.lastSuccess).toLocaleString("zh-CN", { timeZone: "Europe/Paris" })} 巴黎时间。` : ""}</p>)}
    </details>}
    {state.mode==="live"&&<section className="event-sync"><div><strong>事件数据 · {connected.length} 类历史已连接</strong><p>免费官方历史数据，每次同步保留取得时间。公布值只在官方结果核实后显示。</p><details><summary>查看数据连接状态</summary>{historySources.map(source=><p key={source.name}>{source.name} · {source.status==="ready"?"已同步":source.message}</p>)}<p>ISM、PPI 与文字报告暂不提供历史数值曲线；日程与官方链接仍保留。</p></details></div><button className="secondary" disabled={busy||!refreshData} onClick={()=>void refreshData?.()}><RefreshCw size={15}/>{busy?"同步中…":"同步事件数据"}</button></section>}
    <section className="event-learning"><div><Sparkles size={22} /><h3>数字不只是数字。</h3><p>不懂 CPI、就业或利率？用一张卡牌补上背景。</p></div><button className="secondary" onClick={() => navigate("learn")}>去点亮技能 <ArrowRight size={15} /></button></section>
    <details className="panel event-information-sources"><summary>事件信息来源 · 预测、解读与市场情绪 <ChevronRight size={16}/></summary><EventIntelligencePanel now={state.now}/></details>
    {selected && <EventDialog event={selected} now={state.now} mode={state.mode} onClose={() => setSelectedId(null)} />}
  </>}</LocalizeTree>;
}
function EventDialog({ event, now, mode, onClose }: { event: MarketEvent; now: string; mode: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus(dialogRef, true, onClose);
  const status = eventStatusAt(event, now), numeric = numericEvent(event);
  return <LocalizeTree>{<div className="modal-backdrop" onClick={onClose}><section ref={dialogRef} className="modal event-modal" role="dialog" aria-modal="true" aria-labelledby="event-title" onClick={e => e.stopPropagation()}>
    <button className="modal-close" onClick={onClose} aria-label="关闭事件">×</button><span className="eyebrow">BOSS INTELLIGENCE · {event.kind}</span><h2 id="event-title">{event.title}</h2>
    <p className="muted"><Clock3 size={14} /> {status === "unconfirmed" ? "日期与时间等待官方公告" : `${eventDate(event.at)} · ${dualTime(event.at)}`}{mode === "demo" ? " · 示例事件" : ""}</p>
    <div className="analogy-box"><Sparkles size={20} /><p>{event.analogy}</p></div><p>{event.description}</p>
    {numeric ? <EventNumbers event={event}/> : <div className="report-story"><h4>{event.report?"官方纪要已发布":"这是一份文字报告"}</h4>{event.report?<>{event.report.summary.map(point=><p key={point}>{point}</p>)}<SourceLink href={event.report.bodyUrl}>阅读官方纪要全文 <ExternalLink size={12}/></SourceLink></>:<><p>{status==="pending"?"公布时间已过，尚未取得可验证的官方正文。":"等待官方发布正文。"}</p><SourceLink href={event.sourceUrl}>查看官方来源 <ExternalLink size={12}/></SourceLink></>}</div>}
    {numeric&&event.report&&<div className="report-story"><h4>官方公布摘要 · 分清指标口径</h4>{event.report.summary.map(point=><p key={point}>{point}</p>)}<SourceLink href={event.report.bodyUrl}>阅读官方报告全文 <ExternalLink size={12}/></SourceLink></div>}
    {event.revised !== undefined && <p className="muted">前值修订为 {event.revised}{compactEventUnit(event.unit)}，保留原始公布记录。</p>}
    <h3>为什么和 QQQ 有关？</h3><p>{event.impact}</p><div className="impact-path"><span>{numeric ? "数据变化" : "报告内容"}</span><ArrowRight size={14} /><span>{event.kind === "EARNINGS" ? "盈利预期" : "利率与盈利预期"}</span><ArrowRight size={14} /><span>市场重新定价</span></div>
    <h3>不同结果，分别怎么看？</h3><div className="event-scenarios">{event.scenarios.map((scenario, index) => <p key={scenario}><span>{String(index + 1).padStart(2, "0")}</span>{scenario}</p>)}</div>
    {numeric && <><h3>把今天放回历史里</h3>{mode === "demo" && <p className="demo-chart-label">以下曲线是示例数据，用于展示交互。</p>}{event.historySource&&<div className="event-history-source"><SourceLink href={event.historySource.url}>{event.historySource.name}</SourceLink><p>最新历史观察：{event.history.at(-1)?.date} · {event.history.at(-1)?.value}{compactEventUnit(event.unit)}。这是当前取得版本，不是本次事件的公布值，也不是原始发布时的版本。</p><p>取得于 {new Date(event.historySource.fetchedAt).toLocaleString("zh-CN",{timeZone:"Europe/Paris"})} 巴黎时间。{event.kind==="CONFIDENCE"?"密歇根调查在 FRED 的授权数据有延迟，初值请查看官方公布。":""}</p></div>}<MacroChart history={event.history} unit={compactEventUnit(event.unit)} /><PublicationHistory event={event} mode={mode} /></>}
    {!!event.qqqReactions?.length && <details className="week-details"><summary>已取得的 QQQ 事件日表现</summary>{event.qqqReactions.slice(-12).map(reaction => <div className="watch-row" key={reaction.date}><span>{reaction.date}</span><strong>{reaction.returnPct >= 0 ? "+" : ""}{reaction.returnPct.toFixed(2)}%</strong></div>)}<p className="muted">展示关联背景，不将同日涨跌归因为单一事件。</p></details>}
    <div className="event-source"><SourceLink href={event.sourceUrl}>{event.sourceName}</SourceLink><small>{event.fetchedAt ? `取得于 ${new Date(event.fetchedAt).toLocaleString("zh-CN", { timeZone: "Europe/Paris" })} 巴黎时间` : "等待官方结果确认"}</small></div>
  </section></div>}</LocalizeTree>;
}

function EventNumbers({event}:{event:MarketEvent}) {
 const values=event.calendarValues;
 const format=(value:number|undefined)=>value===undefined?"—":`${value.toLocaleString("zh-CN",{maximumFractionDigits:3})}${compactEventUnit(event.unit)}`;
 return <LocalizeTree>{<><p className="event-measurement">指标口径：{event.unit}{event.period ? ` · 观察期 ${event.period}` : ""}</p><div className="event-data"><div><span>公布值{event.period?` · ${event.period}`:""}</span><strong>{event.actual===undefined?(Date.parse(event.at)>Date.now()?"待公布":"官方待确认"):format(event.actual)}</strong><small>{event.actual===undefined?"待核实官方发布":"官方结果"}</small></div><div><span>前值</span><strong>{format(event.previous)}</strong><small>{event.previous===undefined?"尚未取得对应口径的上期值":values?.previous===event.previous?"公开日历中的上期值（可含修订）":"官方发布中的前值"}</small>{values?.previousOriginal!==undefined&&<small>修订前：{format(values.previousOriginal)}</small>}</div><div><span>市场预期 · 共识</span><strong>{format(event.consensus)}</strong><small>{event.consensus===undefined?"来源尚未提供本次共识":event.consensusSource}</small></div></div>
 <EventTakeaway event={event} locale="zh"/>{values&&<details className="event-values-context"><summary>数据来源与预测详情</summary>{values.forecast!==undefined&&<p><strong>数据商预测：</strong>{format(values.forecast)} · Trading Economics 自有预测</p>}{event.actual===undefined&&values.reported!==undefined&&Date.parse(event.at)<=Date.parse(values.fetchedAt)&&<p><strong>公开日历已报告：</strong>{format(values.reported)} · 官方发布仍待核实</p>}<SourceLink href={values.sourceUrl}>前值 / 共识 / 数据商预测来源：Trading Economics</SourceLink><small>本次发布日期 {values.date} · 取得于 {dualTime(values.fetchedAt)} · {values.fetchedAt.slice(0,10)}{Date.now()-Date.parse(values.fetchedAt)>86400000?" · 保留上次数据，待更新":""}</small><p>市场共识与数据商预测分别展示；空白表示来源尚未提供。公开日历报告值不替代官方确认。</p></details>}</>}</LocalizeTree>;
}
