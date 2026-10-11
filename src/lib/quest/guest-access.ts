import type { Direction } from "./types";
export const trialKey = "monetizable:guest-cards:v1";
export const transferKey = "monetizable:save-guest-progress:v1";
export const draftKey = "monetizable:prediction-draft:v1";
export function trialAllows(ids: string[], cardId: string) { return new Set(ids).size < 2 || ids.includes(cardId); }
export function readTrialCards(): string[] {
  try { const value = JSON.parse(localStorage.getItem(trialKey) || "[]"); return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : []; } catch { return []; }
}
export type PredictionDraft = { direction: Direction; confidence: "low" | "medium" | "high"; reason: string; date: string; at: string };
export function readPredictionDraft(): PredictionDraft | undefined {
  try { const d = JSON.parse(localStorage.getItem(draftKey) || "null"); if (d && ["bullish","neutral","bearish"].includes(d.direction) && ["low","medium","high"].includes(d.confidence) && typeof d.reason === "string" && typeof d.date === "string" && Date.now() - Date.parse(d.at) >= 0 && Date.now() - Date.parse(d.at) < 86400000) return d; } catch {} return undefined;
}
