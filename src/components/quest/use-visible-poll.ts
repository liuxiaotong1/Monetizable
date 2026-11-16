"use client";
import {useEffect, useRef} from "react";

/** Stop polling after this long without a pointer, key, or scroll. */
const IDLE_MS = 3 * 60 * 1000;

/**
 * Call `run` on an interval only while the tab is visible and the visitor is active.
 * Hidden tabs and idle sessions do not schedule another request. Returning to the tab,
 * or using the page after an idle gap, runs once and resumes the interval.
 * The hook does not call `run` on mount; the caller loads once itself.
 */
export function useVisiblePoll(run: () => void, intervalMs: number, enabled = true) {
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    let timer = 0;
    let idleTimer = 0;
    let idle = false;
    const stop = () => window.clearInterval(timer);
    const start = () => {
      stop();
      if (document.visibilityState !== "visible" || idle) return;
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible" && !idle) runRef.current();
      }, intervalMs);
    };
    const wake = () => {
      if (document.visibilityState === "visible" && !idle) runRef.current();
      start();
    };
    const armIdle = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        idle = true;
        stop();
      }, IDLE_MS);
    };
    const onActivity = () => {
      const resume = idle;
      idle = false;
      armIdle();
      if (resume) wake();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") wake();
      else stop();
    };
    armIdle();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    for (const type of events) window.addEventListener(type, onActivity, {passive: true});
    return () => {
      stop();
      window.clearTimeout(idleTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const type of events) window.removeEventListener(type, onActivity);
    };
  }, [enabled, intervalMs]);
}
