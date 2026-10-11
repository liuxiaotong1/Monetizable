"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Dice5, LoaderCircle, Pause, Play, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { YELAN_SOURCE, type YelanScene } from "@/lib/quest/yelan-scene";
import "./yelan.css";

const tips = [
  "先找证据，再留下判断。",
  "准备好退路，再走下一步。",
  "骰子可以随机，判断需要理由。",
  "今天的问号，明天就是你的装备。",
  "保持观察，机会总会再来。",
  "复盘认真一点，经验就多一点。",
];
export default function YelanViewer({celebrate=false,onCelebrationComplete}:{celebrate?:boolean;onCelebrationComplete?:()=>void}) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<YelanScene | undefined>(undefined);
  const gesture = useRef<{ id: number; x: number; y: number; lastX: number; moved: boolean; horizontal: boolean } | undefined>(undefined);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [retry, setRetry] = useState(0);
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState("");
  const [castCount, setCastCount] = useState(0);

  useEffect(() => {
    if (!host.current || !canvas.current) return;
    const controller = new AbortController();
    let started = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting || started) return;
      started = true;
      observer.disconnect();
      watchdog = setTimeout(() => { if (!controller.signal.aborted) setStatus(current => current === "ready" ? current : "failed"); }, 45000);
      import("@/lib/quest/yelan-scene").then(({ mountYelanScene }) => mountYelanScene(
        canvas.current!, host.current!, {
          ready: () => { if (!controller.signal.aborted) clearTimeout(watchdog); },
          failed: () => { if (!controller.signal.aborted) setStatus("failed"); },
          cast: () => {
            if (controller.signal.aborted) return;
            const bytes = new Uint32Array(1);
            crypto.getRandomValues(bytes);
            setMessage(tips[bytes[0] % tips.length]);
            setCastCount(count => count + 1);
            clearTimeout(messageTimer.current);
            messageTimer.current = setTimeout(() => setMessage(""), 4000);
          },
        }, controller.signal,
      )).then(result => { if (!controller.signal.aborted) { scene.current = result; if(result)setStatus("ready"); } })
        .catch(() => { if (!controller.signal.aborted) setStatus("failed"); });
    }, { rootMargin: "100px" });
    observer.observe(host.current);
    return () => {
      controller.abort();
      observer.disconnect();
      clearTimeout(watchdog);
      clearTimeout(messageTimer.current);
      scene.current = undefined;
    };
  }, [retry]);

  useEffect(()=>{
    if(!celebrate)return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(status==="loading"&&!reduced)return;
    const start=window.setTimeout(()=>{if(status==="ready"&&!reduced&&!paused)scene.current?.cast();},0);
    const done=window.setTimeout(()=>onCelebrationComplete?.(),status==="ready"&&!reduced&&!paused?2600:0);
    return()=>{window.clearTimeout(start);window.clearTimeout(done);};
  },[celebrate,status,paused,onCelebrationComplete]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (status !== "ready" || !event.isPrimary || event.button !== 0) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, moved: false, horizontal: false };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (Math.hypot(dx, dy) > 8) current.moved = true;
    if (!current.horizontal && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      current.horizontal = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (current.horizontal) scene.current?.rotate((event.clientX - current.lastX) * -0.45);
    current.lastX = event.clientX;
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.id !== event.pointerId) return;
    if (gesture.current && !gesture.current.moved) scene.current?.cast();
    gesture.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return <div className={`yelan-stage ${celebrate&&status==="ready"&&!paused?"yelan-victory":""}`} ref={host} data-status={status}>
    <div className="yelan-label"><span>✦</span><div><strong>夜兰</strong><small>YELAN · 水元素</small></div><span className="yelan-stars">★★★★★</span></div>
    <div className="yelan-viewport">
      {celebrate&&status==="ready"&&<div className="yelan-hydro-burst" aria-hidden="true"><i/><i/><i/><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div>}
      <canvas key={retry} ref={canvas} aria-label="夜兰 · 可互动 3D 角色" className="yelan-canvas"/>
      {status === "loading" && <div className="yelan-loading"><LoaderCircle size={22}/><strong>正在召唤夜兰…</strong><span>首次加载需要一点时间</span></div>}
      {status === "failed" && <div className="yelan-loading"><strong>夜兰暂时未能抵达</strong><span>检查网络后再召唤一次</span><button type="button" className="secondary" onClick={() => { setStatus("loading"); setPaused(false); setRetry(value => value + 1); }}>重新召唤</button><a href={YELAN_SOURCE} target="_blank" rel="noreferrer">查看模型来源 ↗</a></div>}
      {status === "ready" && <div className="yelan-touch" role="button" tabIndex={0} aria-label="夜兰 3D 展示：左右方向键旋转，回车掷骰" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={event => { if (gesture.current?.id === event.pointerId) gesture.current = undefined; }} onPointerLeave={event => { if (gesture.current?.id === event.pointerId && !gesture.current.horizontal) gesture.current = undefined; }} onKeyDown={event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); scene.current?.rotate(event.key === "ArrowLeft" ? -15 : 15); }
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); scene.current?.cast(); }
      }}/>} 
      {(message||celebrate&&status==="ready") && <div key={castCount} className="yelan-speech" role="status">{celebrate?"✦ 方向判断正确！让证据为你的判断喝彩。":message}</div>}
    </div>
    <div className="yelan-toolbar"><button type="button" className="yelan-cast" disabled={status !== "ready"} onClick={() => scene.current?.cast()}><Dice5 size={15}/>掷骰子</button><div>
      <button type="button" title="拉近视角" aria-label="拉近夜兰视角" disabled={status !== "ready"} onClick={() => scene.current?.zoom(0.85)}><ZoomIn size={15}/></button>
      <button type="button" title="拉远视角" aria-label="拉远夜兰视角" disabled={status !== "ready"} onClick={() => scene.current?.zoom(1.18)}><ZoomOut size={15}/></button>
      <button type="button" title="重置视角" aria-label="重置夜兰视角" disabled={status !== "ready"} onClick={() => scene.current?.reset()}><RotateCcw size={14}/></button>
      <button type="button" title={paused ? "继续动态效果" : "暂停动态效果"} aria-label={paused ? "继续夜兰动态效果" : "暂停夜兰动态效果"} aria-pressed={paused} disabled={status !== "ready"} onClick={() => { const next = !paused; setPaused(next); scene.current?.setPaused(next); }}>{paused ? <Play size={14}/> : <Pause size={14}/>}</button>
    </div></div>
    <span className="yelan-hint">左右拖动查看 · 点击角色掷骰</span>
    <div className="yelan-credit"><a href={YELAN_SOURCE} target="_blank" rel="noreferrer">夜兰 · HoYoverse / 观海</a></div>
  </div>;
}
