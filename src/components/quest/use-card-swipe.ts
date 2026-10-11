"use client";
import { useRef, type PointerEvent } from "react";
/** Capture a completed card's horizontal gesture while preserving vertical page scrolling. */
export function useCardSwipe(enabled: boolean, classify: (action: "master" | "review") => void) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!enabled || !event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest("button,a,input,select,textarea")) return;
      start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
      event.currentTarget.setPointerCapture(event.pointerId);
      if (event.pointerType === "mouse") event.preventDefault();
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const origin = start.current;
      start.current = null;
      if (!origin || origin.id !== event.pointerId || !enabled) return;
      const dx = event.clientX - origin.x, dy = event.clientY - origin.y;
      if (Math.abs(dx) >= 64 && Math.abs(dx) > Math.abs(dy) * 1.5) classify(dx > 0 ? "master" : "review");
    },
    onPointerCancel() { start.current = null; },
    onLostPointerCapture() { start.current = null; },
  };
}
