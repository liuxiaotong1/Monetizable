"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const HIDDEN_KEY = "monetizable:supercharlie:hidden:v1";

export function SuperCharlieCompanion({ message = "I’m here when you need me.", placement = "floating" }: { message?: string; placement?: "floating" | "homepage" }) {
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number; bounds: DOMRect; moved: boolean } | null>(null);

  useEffect(() => {
    try { setHidden(window.localStorage.getItem(HIDDEN_KEY) === "1"); } catch { /* Storage can be unavailable in private browsers. */ }
    setReady(true);
  }, []);

  function setVisibility(nextHidden: boolean) {
    setHidden(nextHidden);
    setMenuOpen(false);
    try { window.localStorage.setItem(HIDDEN_KEY, nextHidden ? "1" : "0"); } catch { /* The control still works for this visit. */ }
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: offset.x, originY: offset.y, bounds: event.currentTarget.getBoundingClientRect(), moved: false };
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - current.startX;
    const deltaY = event.clientY - current.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 5) current.moved = true;
    setOffset({
      x: current.originX + Math.max(8 - current.bounds.left, Math.min(window.innerWidth - 8 - current.bounds.right, deltaX)),
      y: current.originY + Math.max(8 - current.bounds.top, Math.min(window.innerHeight - 8 - current.bounds.bottom, deltaY)),
    });
  }

  function finishDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!current.moved) setMenuOpen((open) => !open);
    event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  }

  if (!ready) return null;
  if (hidden) return <button type="button" onClick={() => setVisibility(false)} className="fixed bottom-4 right-4 z-[70] rounded-full border border-[var(--gold)] bg-black px-4 py-2 text-xs font-black text-white shadow-xl">Show SuperCharlie</button>;

  const homepage = placement === "homepage";
  return <aside className={homepage ? "pointer-events-none relative z-20 flex justify-center py-3 lg:sticky lg:top-24 lg:self-start lg:py-0" : "pointer-events-none fixed bottom-3 right-3 z-[70] md:bottom-5 md:right-6"} style={{ translate: `${offset.x}px ${offset.y}px` }} aria-label="SuperCharlie, your market opportunity guide">
    <div className="relative flex flex-col items-center">
      <div role="status" className="mb-1 max-w-44 rounded-2xl border border-black/10 bg-white/95 px-3 py-2 text-center text-[.68rem] font-bold leading-4 text-black shadow-lg">{message}</div>
      {menuOpen ? <div className="pointer-events-auto absolute right-full top-12 z-20 mr-2 w-36 rounded-2xl border border-black/10 bg-white p-2 text-xs font-bold text-black shadow-xl"><button type="button" onClick={() => setVisibility(true)} className="w-full rounded-xl px-3 py-2 text-left hover:bg-black/5">Hide SuperCharlie</button><p className="px-3 pb-1 pt-2 text-[.62rem] font-medium leading-4 text-black/50">Drag Charlie to move him.</p></div> : null}
      <button type="button" onClick={(event) => { if (event.detail === 0) setMenuOpen((open) => !open); }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={() => { drag.current = null; }} className="pointer-events-auto cursor-grab border-0 bg-transparent p-0 active:cursor-grabbing" style={{ touchAction: "none" }} aria-label="Move SuperCharlie or open his controls" aria-expanded={menuOpen}>
        <Image src="/supercharlie-pet-v2.png" alt="SuperCharlie, Monetizable’s friendly golden market guide" width={1024} height={1536} draggable={false} sizes={homepage ? "(max-width: 1023px) 92px, 116px" : "(max-width: 768px) 104px, 136px"} className={homepage ? "h-auto w-[92px] select-none object-contain lg:w-[116px]" : "h-auto w-[104px] select-none object-contain md:w-[136px]"} style={{ maskImage: "url(/supercharlie-pet-mask.svg)", maskSize: "100% 100%", maskRepeat: "no-repeat" }} />
      </button>
    </div>
  </aside>;
}
