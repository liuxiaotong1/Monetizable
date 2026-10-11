"use client";
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import type { QuestState } from "@/lib/quest/types";
type View = "today" | "events" | "learn";
type Context = { registerTool(tool: { name: string; description: string; inputSchema: object; annotations: object; execute(input: unknown): unknown }, options: { signal: AbortSignal }): void | Promise<void> };
export function useQuestTools(state: QuestState | null, navigate: (view: View) => void) {
  const current = useRef(state);
  useEffect(() => { current.current = state; }, [state]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: Context }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Parameters<Context["registerTool"]>[0]) => {
      try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Browser support is optional. */ }
    };
    register({ name: "read_quest_summary", description: "Read the currently displayed QQQ Quest mode, date, XP and task counts without changing saved records.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute(input) {
      if (!input || typeof input !== "object" || Object.keys(input).length) throw new Error("No input fields are accepted");
      const s = current.current;
      if (!s) throw new Error("Workspace has not loaded");
      return { mode: s.mode, date: s.session.date, xp: s.xp, judgmentLocked: !!s.judgment, dailyCardCount: s.dailyCardIds.length, eventCount: s.events.length };
    } });
    register({ name: "navigate_quest", description: "Open today's adventure, event Boss map or learning cards. This changes the visible view only; it does not complete a task or modify saved records.", inputSchema: { type: "object", properties: { view: { type: "string", enum: ["today", "events", "learn"] } }, required: ["view"], additionalProperties: false }, annotations: { readOnlyHint: false }, execute(input) {
      if (!input || typeof input !== "object" || Object.keys(input).some(key => key !== "view")) throw new Error("Expected only view");
      const view = (input as {view?:unknown}).view;
      if (view !== "today" && view !== "events" && view !== "learn") throw new Error("Unknown view");
      flushSync(() => navigate(view)); return { view, completedTask: false };
    } });
    return () => lifecycle.abort();
  }, [navigate]);
}
