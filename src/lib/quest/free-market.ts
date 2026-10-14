import { marketDate, sessionFor, type CalendarOverride } from "./domain";
import type { Bar } from "./types";

export const FREE_MARKET_SOURCE = "Yahoo Finance · 常规时段日线（拆股调整，不含分红调整；非实时参考）";
type ChartRow = {
  meta?: { symbol?: string; exchangeTimezoneName?: string; dataGranularity?: string };
  timestamp?: number[];
  indicators?: { quote?: { open?: unknown[]; high?: unknown[]; low?: unknown[]; close?: unknown[]; volume?: unknown[] }[] };
};

// Only completed, calendar-checked regular-session daily candles enter storage.
// Adj Close is deliberately ignored: dividend-adjusted returns aren't price levels.
export function parseFreeBars(payload: unknown, symbol: string, now: Date, overrides: CalendarOverride[] = []): Bar[] {
  const data = payload as { chart?: { error?: unknown; result?: ChartRow[] } };
  const row = data?.chart?.result?.[0], quote = row?.indicators?.quote?.[0];
  if (data?.chart?.error || !row || !quote || row.meta?.symbol !== symbol || row.meta.exchangeTimezoneName !== "America/New_York" || row.meta.dataGranularity !== "1d" || !Array.isArray(row.timestamp)) throw new Error("免费日线响应格式或标的未通过核对");
  const bars: Bar[] = [], seen = new Set<string>();
  for (const [index, timestamp] of row.timestamp.entries()) {
    if (!Number.isFinite(timestamp)) continue;
    const date = marketDate(new Date(timestamp * 1000));
    const session = sessionFor(new Date(`${date}T12:00:00Z`), overrides);
    if (!session.isTradingDay || now.getTime() < Date.parse(session.closeAt) + 20 * 60_000 || date > marketDate(now)) continue;
    const values = [quote.open?.[index], quote.high?.[index], quote.low?.[index], quote.close?.[index], quote.volume?.[index]];
    if (!values.every(value => typeof value === "number" && Number.isFinite(value))) continue;
    const [open, high, low, close, volume] = values as number[];
    if (low <= 0 || high < Math.max(open, close) || low > Math.min(open, close) || volume < 0) continue;
    if (seen.has(date)) throw new Error("免费日线包含重复交易日，暂停使用本次响应");
    seen.add(date);
    bars.push({ symbol, date, open, high, low, close, volume, source: FREE_MARKET_SOURCE, fetchedAt: now.toISOString() });
  }
  if (!bars.length) throw new Error("尚未取得可核对的完整交易日日线");
  return bars.sort((a, b) => a.date.localeCompare(b.date));
}

/** Cross the close-confirmation boundary immediately, even if the pre-close cache is young. */
export function freeBarsNeedRefresh(saved: {fetchedAt: string;bars: Bar[]} | undefined, now: Date): boolean {
 if(!saved || now.getTime()-Date.parse(saved.fetchedAt)>15*60_000)return true;
 const session=sessionFor(now),confirmedAt=Date.parse(session.closeAt)+20*60_000;
 return session.isTradingDay && now.getTime()>=confirmedAt && Date.parse(saved.fetchedAt)<confirmedAt && !saved.bars.some(b=>b.symbol==='QQQ'&&b.date===session.date);
}
