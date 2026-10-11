import type { Bar, Direction, Forecast, Judgment, Review, Session } from "./types";

export const DEMO_NOW = "2026-10-07T12:00:00.000Z";
export interface CalendarOverride { date: string; isTradingDay?: boolean; open?: string; close?: string }
const dayMs = 86_400_000;
function dateString(d: Date) { return d.toISOString().slice(0, 10); }
export function addDays(date: string, days: number) { return dateString(new Date(Date.parse(`${date}T12:00:00Z`) + days * dayMs)); }
export function marketDate(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function nyTimeToUtc(date: string, time = "09:30") {
  const target = Date.parse(`${date}T${time}:00Z`);
  let result = target;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(result));
    const get = (name: string) => parts.find((p) => p.type === name)!.value;
    const shown = Date.parse(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`);
    result += target - shown;
  }
  return new Date(result).toISOString();
}
function nthWeekday(year: number, month: number, weekday: number, nth: number) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return dateString(new Date(Date.UTC(year, month - 1, 1 + (weekday - first + 7) % 7 + (nth - 1) * 7)));
}
function lastWeekday(year: number, month: number, weekday: number) {
  const last = new Date(Date.UTC(year, month, 0));
  last.setUTCDate(last.getUTCDate() - (last.getUTCDay() - weekday + 7) % 7);
  return dateString(last);
}
function observed(year: number, month: number, day: number, newYear = false) {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCDay() === 6 && !newYear) d.setUTCDate(d.getUTCDate() - 1);
  if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return dateString(d);
}
function easter(year: number) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = (h + l - 7 * m + 114) % 31 + 1;
  return dateString(new Date(Date.UTC(year, month - 1, day)));
}
const exceptionalClosures = new Set(["2001-09-11", "2001-09-12", "2001-09-13", "2001-09-14", "2004-06-11", "2007-01-02", "2012-10-29", "2012-10-30", "2018-12-05", "2025-01-09"]);
export function isTradingDate(date: string, overrides: CalendarOverride[] = []) {
  const override = overrides.find((o) => o.date === date);
  if (override?.isTradingDay !== undefined) return override.isTradingDay;
  const d = new Date(`${date}T12:00:00Z`), year = d.getUTCFullYear();
  if (!Number.isFinite(d.getTime()) || [0, 6].includes(d.getUTCDay()) || exceptionalClosures.has(date)) return false;
  const holidays = [observed(year, 1, 1, true), nthWeekday(year, 1, 1, 3), nthWeekday(year, 2, 1, 3), addDays(easter(year), -2), lastWeekday(year, 5, 1), observed(year, 7, 4), nthWeekday(year, 9, 1, 1), nthWeekday(year, 11, 4, 4), observed(year, 12, 25)];
  if (year >= 2022) holidays.push(observed(year, 6, 19));
  return !holidays.includes(date);
}
export function nextTradingDate(date: string, overrides: CalendarOverride[] = []) { let d = addDays(date, 1); while (!isTradingDate(d, overrides)) d = addDays(d, 1); return d; }
export function previousTradingDate(date: string, overrides: CalendarOverride[] = []) { let d = addDays(date, -1); while (!isTradingDate(d, overrides)) d = addDays(d, -1); return d; }
export function sessionFor(now: Date = new Date(), overrides: CalendarOverride[] = []): Session {
  const date = marketDate(now), year = Number(date.slice(0, 4));
  const override = overrides.find((o) => o.date === date);
  // The exchange's July early close is July 3 only when it is an open weekday.
  // July 2, 2026/2027 remains a full session (unlike the bond market).
  const early = date === addDays(nthWeekday(year, 11, 4, 4), 1) || date === `${year}-12-24` || date === `${year}-07-03`;
  return { date, isTradingDay: isTradingDate(date, overrides), openAt: nyTimeToUtc(date, override?.open ?? "09:30"), closeAt: nyTimeToUtc(date, override?.close ?? (early ? "13:00" : "16:00")), previousDate: previousTradingDate(date, overrides), nextDate: nextTradingDate(date, overrides) };
}
// Public daily bars need a short publication buffer after the exchange close.
export function sessionReady(date: string, now: Date, overrides: CalendarOverride[] = []) {
  const session = sessionFor(new Date(`${date}T12:00:00Z`), overrides);
  return session.isTradingDay && now.getTime() >= Date.parse(session.closeAt) + 20 * 60_000;
}
export function latestCompletedDate(now: Date, overrides: CalendarOverride[] = []) {
  const session = sessionFor(now, overrides);
  return sessionReady(session.date, now, overrides) ? session.date : session.previousDate;
}
export function classifyDirection(returnPct: number, threshold = 0.3): Direction {
  // Stable comparisons at the inclusive ± threshold prevent floating-point drift.
  return returnPct > threshold + 1e-9 ? "bullish" : returnPct < -threshold - 1e-9 ? "bearish" : "neutral";
}
export function scoreForecast(forecast: Forecast, actual: Bar, judgment?: Judgment): Review {
  if (actual.date !== forecast.date || actual.symbol !== "QQQ") throw new Error("行情日期或标的与剧本不匹配");
  if (!Number.isFinite(forecast.baselineClose) || forecast.baselineClose <= 0) throw new Error("缺少有效的前收盘价");
  const returnPct = (actual.close / forecast.baselineClose - 1) * 100;
  const actualDirection = classifyDirection(returnPct, forecast.threshold);
  const chosen = forecast.scenarios.find((s) => s.direction === judgment?.direction) ?? forecast.scenarios.find((s) => s.direction === "neutral") ?? forecast.scenarios[0];
  if (!chosen) throw new Error("剧本缺少区间");
  return { id: `review:${forecast.date}`, date: forecast.date, forecastId: forecast.id, judgmentId: judgment?.id, judgmentSnapshot: judgment, actual, previousClose: forecast.baselineClose, actualDirection, returnPct, matched: judgment?.eligible ? judgment.direction === actualDirection : undefined, rangeCovered: actual.low >= chosen.low && actual.high <= chosen.high, rangeWidthPct: (chosen.high - chosen.low) / forecast.baselineClose * 100, reflection: `收盘相对前收盘 ${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%，按该剧本保存的 ±${forecast.threshold}% 规则为${actualDirection === "bullish" ? "偏多" : actualDirection === "bearish" ? "偏空" : "震荡"}。${judgment?.eligible ? `你盘前选择${judgment.direction === "bullish" ? "偏多" : judgment.direction === "bearish" ? "偏空" : "震荡"}，与收盘方向${judgment.direction === actualDirection ? "一致" : "不同"}。` : "没有可评分的盘前判断。"}所选情景区间${actual.low >= chosen.low && actual.high <= chosen.high ? "覆盖" : "未完全覆盖"}实际高低点。日线能核对收盘和高低区间，无法确认盘中触发顺序。` };
}
