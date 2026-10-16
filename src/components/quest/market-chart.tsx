"use client";
import {LocalizeTree} from '@/components/i18n/locale-provider';

import { useEffect, useRef, useState } from "react";
import { CandlestickChart, ExternalLink, RefreshCw, Telescope } from "lucide-react";
import type { Bar } from "@/lib/quest/types";
import type { MarketBrief } from "@/lib/quest/market-brief";
import { dualTime } from "./shared";
import "./market-chart.css";

const chartUrl = "https://www.tradingview.com/symbols/NASDAQ-QQQ/";
interface BriefResponse { brief?: MarketBrief; expectedDate: string; lastAttempt?: { date: string; status: string } }

export default function MarketChart({ demo, latest }: { demo: boolean; latest?: Bar }) {
  const host = useRef<HTMLDivElement>(null);
  const [interval, setIntervalValue] = useState("D");
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"waiting" | "loading" | "ready" | "error">("waiting");
  const [feed, setFeed] = useState<BriefResponse>();
  const [readError, setReadError] = useState(false);
  const [readDate, setReadDate] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function read() {
      try {
        const response = await fetch("/api/market-brief", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
        if (!response.ok) throw new Error("Brief temporarily unavailable");
        const data = await response.json() as BriefResponse;
        if (!controller.signal.aborted) { setFeed(data); setReadError(false); }
      } catch { if (!controller.signal.aborted) setReadError(true); }
      finally { if (!controller.signal.aborted) setReadDate(new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())); }
    }
    void read();
    const timer = window.setInterval(() => void read(), 60_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let timer: number | undefined;
    let frame: HTMLIFrameElement | null = null;
    let mutation: MutationObserver | undefined;
    const ready = () => {
      if (disposed) return;
      window.clearTimeout(timer);
      setStatus("ready");
    };
    const start = () => {
      if (disposed) return;
      setStatus("loading");
      const widget = document.createElement("div");
      widget.className = "tradingview-widget-container__widget";
      widget.style.height = "100%";
      widget.style.width = "100%";
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.async = true;
      script.textContent = JSON.stringify({
        autosize: true, symbol: "NASDAQ:QQQ", interval, timezone: "America/New_York",
        theme: "light", style: "1", locale: "zh_CN", allow_symbol_change: false,
        withdateranges: true, hide_side_toolbar: true, save_image: false,
        calendar: false, support_host: "https://www.tradingview.com",
      });
      script.onerror = () => { if (!disposed) { window.clearTimeout(timer); setStatus("error"); } };
      mutation = new MutationObserver(() => {
        const next = container.querySelector("iframe");
        if (!next || next === frame) return;
        frame = next;
        frame.title = "TradingView QQQ 参考行情图表";
        frame.addEventListener("load", ready);
      });
      mutation.observe(container, { childList: true, subtree: true });
      timer = window.setTimeout(() => { if (!disposed) setStatus("error"); }, 25_000);
      container.replaceChildren(widget, script);
    };
    const visibility = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { visibility.disconnect(); start(); }
    }, { rootMargin: "200px" });
    visibility.observe(container);
    return () => {
      disposed = true;
      visibility.disconnect(); mutation?.disconnect(); window.clearTimeout(timer);
      frame?.removeEventListener("load", ready);
      container.replaceChildren();
    };
  }, [interval, attempt]);

  const brief = feed?.brief;
  const stale = !!brief && brief.date !== (readDate || feed?.expectedDate);
  const failed = !!feed?.lastAttempt && feed.lastAttempt.date === feed.expectedDate && feed.lastAttempt.status === "unavailable";
  return <LocalizeTree>{<section className="panel market-observatory" aria-labelledby="market-title">
    <div className="market-heading"><div><span className="eyebrow"><Telescope size={13}/> MARKET OBSERVATORY</span><h2 id="market-title">QQQ · 市场望远镜</h2></div><span className="badge purple">免费图表</span></div>
    {!demo&&latest&&<div className="market-brief"><div className="market-brief-heading"><strong>最近已确认收盘</strong><span>{latest.date} · 常规交易时段</span></div><div className="brief-quote"><strong>${latest.close.toFixed(2)}</strong><small>日内 ${latest.low.toFixed(2)} — ${latest.high.toFixed(2)} · USD</small></div><small className="brief-time">{latest.source} · 取得于 {dualTime(latest.fetchedAt)}</small></div>}
    <div className="market-brief">
      <div className="market-brief-heading"><strong>盘前摘要 · 保留发布时数据</strong><span>{brief ? `${brief.date} · ${stale ? "上次摘要，今日待更新" : readError ? "上次摘要，刷新中断" : brief.status === "partial" ? "部分数据待确认" : "公开来源核对"}` : readError ? "早报暂时无法读取" : "等待首份行情摘要"}</span></div>
      {brief ? <>
        {brief.quote && <div className="brief-quote"><strong>${brief.quote.close.toFixed(2)}</strong>{brief.quote.changePct !== undefined && <span className={brief.quote.changePct >= 0 ? "positive" : "negative"}>{brief.quote.changePct > 0 ? "+" : ""}{brief.quote.changePct.toFixed(2)}%</span>}<small>{brief.quote.date} 常规时段收盘 · USD</small></div>}
        <p>{brief.summary}</p>
        {!!brief.watchPoints.length && <ul>{brief.watchPoints.map(point => <li key={point}>{point}</li>)}</ul>}
        <div className="brief-sources">{brief.sources.map(source => <a href={source.url} target="_blank" rel="noopener noreferrer" key={source.url}>{source.title}<ExternalLink size={11}/></a>)}</div>
        <small className="brief-time">资料截止 {dualTime(brief.dataAsOf)} · 更新 {dualTime(brief.savedAt)} · v{brief.version}</small>
      </> : <p>首份早报尚未保存。下方图表可直接查看 QQQ，无需注册新账户。</p>}
      {failed && <p className="brief-warning" role="status">本次搜索未取得可核对的行情，保留上次摘要与时间。</p>}
      {readError && <p className="brief-warning" role="status">{brief ? "早报刷新暂时中断，保留上次摘要与时间。" : "暂时无法读取早报，请稍后重新打开页面。"}</p>}
    </div>
    <div className="chart-toolbar"><span><CandlestickChart size={15}/>参考行情 · 可能延迟</span><div className="chart-periods" aria-label="图表周期">{[["D", "日线"], ["15", "15 分钟"]].map(([value, label]) => <button key={value} type="button" aria-pressed={interval === value} onClick={() => setIntervalValue(value)}>{label}</button>)}</div></div>
    <div className="external-chart-stage" aria-busy={status === "waiting" || status === "loading"}>
      <div ref={host} className="tradingview-widget-container external-chart-host" inert={status !== "ready"}/>
      {status !== "ready" && <div className="chart-status" role="status">{status === "error" ? <><strong>图表连接暂时中断</strong><p>可以重试，或直接打开行情来源。</p><button className="secondary" onClick={() => { setStatus("waiting"); setAttempt(n => n + 1); }}><RefreshCw size={14}/>重新连接</button><a href={chartUrl} target="_blank" rel="noopener noreferrer">打开 TradingView <ExternalLink size={13}/></a></> : <><span className="chart-loading-orbit"/><span>正在接通 QQQ 市场望远镜…</span></>}</div>}
    </div>
    <div className="chart-attribution"><a href={chartUrl} target="_blank" rel="noopener noreferrer">QQQ chart by TradingView <ExternalLink size={11}/></a><span>美东时间 · 延迟状态以图表标识为准</span></div>
    <p className="chart-note">{demo ? "这里的图表与行情早报使用真实公开资料；下方演示剧本和战报仍为示例。" : "图表随行情来源更新。早报按日保存，来源数据可能延迟。"} 下单时请核对老虎证券报价。搜索摘要与图表不参与判断评分。</p>
  </section>}</LocalizeTree>;
}
