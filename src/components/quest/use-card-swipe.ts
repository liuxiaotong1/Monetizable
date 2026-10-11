"use client";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type CSSProperties } from "react";
type Action = "master" | "review";
type Origin = { x: number; y: number; id: number; axis?: "horizontal" | "vertical" };
/** Touch events survive browsers cancelling pointer events when a finger starts to scroll. */
export function useCardSwipe(enabled: boolean, classify: (action: Action) => void) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const origin = useRef<Origin | null>(null);
  const enabledRef = useRef(enabled), classifyRef = useRef(classify);
  enabledRef.current = enabled; classifyRef.current = classify;
  const [offset, setOffset] = useState(0);
  const clear = useCallback(() => { origin.current = null; setOffset(0); }, []);
  const begin = useCallback((x: number, y: number, id: number) => {
    if (!enabledRef.current) return false;
    origin.current = { x, y, id }; return true;
  }, []);
  const move = useCallback((x: number, y: number) => {
    const p = origin.current;
    if (!p || !enabledRef.current) return false;
    const dx = x - p.x, dy = y - p.y;
    if (!p.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8)
      p.axis = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    if (p.axis !== "horizontal") return false;
    setOffset(Math.max(-150, Math.min(150, dx))); return true;
  }, []);
  const finish = useCallback((x: number, y: number) => {
    const p = origin.current;
    clear();
    if (!p || !enabledRef.current || p.axis === "vertical") return;
    const dx = x - p.x, dy = y - p.y;
    if (Math.abs(dx) >= 36 && Math.abs(dx) > Math.abs(dy)) classifyRef.current(dx > 0 ? "master" : "review");
  }, [clear]);
  useEffect(() => {
    const node = element;
    if (!node) return;
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 1 || (event.target as HTMLElement).closest("button,a,input,select,textarea")) { clear(); return; }
      const t = event.touches[0]; begin(t.clientX, t.clientY, t.identifier);
    };
    const drag = (event: TouchEvent) => {
      if (event.touches.length !== 1) { clear(); return; }
      const t = event.touches[0];
      if (move(t.clientX, t.clientY) && event.cancelable) event.preventDefault();
    };
    const end = (event: TouchEvent) => {
      const t = Array.from(event.changedTouches).find(t => t.identifier === origin.current?.id);
      if (t) finish(t.clientX, t.clientY); else clear();
    };
    node.addEventListener("touchstart", start, { passive: true });
    node.addEventListener("touchmove", drag, { passive: false });
    node.addEventListener("touchend", end);
    node.addEventListener("touchcancel", clear);
    return () => { node.removeEventListener("touchstart", start); node.removeEventListener("touchmove", drag); node.removeEventListener("touchend", end); node.removeEventListener("touchcancel", clear); };
  }, [element, begin, move, finish, clear]);
  return {
    ref: setElement,
    "data-swipe-direction": offset > 12 ? "master" : offset < -12 ? "review" : undefined,
    style: { "--card-drag": `${offset}px`, "--card-tilt": `${offset / 35}deg` } as CSSProperties,
    onPointerDown(event: PointerEvent<HTMLElement>) {
      // Touch is handled by non-passive native listeners, never twice by pointer events.
      if (event.pointerType === "touch" || event.button !== 0 || (event.target as HTMLElement).closest("button,a,input,select,textarea")) return;
      if (begin(event.clientX, event.clientY, event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
      }
    },
    onPointerMove(event: PointerEvent<HTMLElement>) { if (event.pointerType !== "touch") move(event.clientX, event.clientY); },
    onPointerUp(event: PointerEvent<HTMLElement>) { if (event.pointerType !== "touch" && origin.current?.id === event.pointerId) finish(event.clientX, event.clientY); },
    onPointerCancel(event: PointerEvent<HTMLElement>) { if (event.pointerType !== "touch") clear(); },
    onLostPointerCapture(event: PointerEvent<HTMLElement>) { if (event.pointerType !== "touch") clear(); },
  };
}
