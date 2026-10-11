import type { Bar, QuestState } from "./types";
import { nextTradingDate, type CalendarOverride } from "./domain";

export function marketContext(state: Pick<QuestState, "bars" | "session" | "now">, overrides: CalendarOverride[] = []) {
  const expectedDate = state.session.isTradingDay && Date.parse(state.now) >= Date.parse(state.session.closeAt) + 20 * 60_000 ? state.session.date : state.session.previousDate;
  const bars = state.bars.filter(b => b.symbol === "QQQ" && b.date <= expectedDate &&
    Date.parse(b.fetchedAt) <= Date.parse(state.now) &&
    [b.open, b.high, b.low, b.close, b.volume].every(Number.isFinite) &&
    b.low > 0 && b.high >= Math.max(b.open, b.close) && b.low <= Math.min(b.open, b.close) && b.volume >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = bars.at(-1), previous = bars.at(-2);
  const fresh = latest?.date === expectedDate && latest.source.includes("常规时段");
  const recent = bars.slice(-20);
  const continuous = recent.length === 20 && recent.every((b, i) => i === recent.length - 1 || nextTradingDate(b.date, overrides) === recent[i + 1].date);
  const ready = !!fresh && continuous;
  const change = latest && previous ? (latest.close / previous.close - 1) * 100 : undefined;
  const round = (value: number) => Math.round(value * 100) / 100;
  const levels = continuous ? {
    ma20: round(bars.slice(-20).reduce((sum, b) => sum + b.close, 0) / 20),
    atr14: round(bars.slice(-14).reduce((sum, b, i) => {
      const prior = bars[bars.length - 15 + i].close;
      return sum + Math.max(b.high - b.low, Math.abs(b.high - prior), Math.abs(b.low - prior));
    }, 0) / 14),
    support: round(Math.min(...bars.slice(-5).map(b => b.low))),
    resistance: round(Math.max(...bars.slice(-5).map(b => b.high))),
  } : undefined;
  const weeklyView = latest && levels
    ? `${latest.close >= levels.ma20 ? "最新收盘高于 20 日均线，周度结构相对强。" : "最新收盘低于 20 日均线，周度结构相对弱。"}把均线当作地图上的营地：关注能否守住近五日支撑，或重新站回近五日阻力。${fresh ? "" : " 当前使用最后成功的历史记录，等待最新交易日更新。"}`
    : latest ? `已取得 ${latest.date} 的真实收盘。${bars.length < 20 ? `再积累 ${20 - bars.length} 个有效日线` : "补齐最近 20 个交易日的缺失记录"}后，可计算 20 日均线和周度结构。`
    : "免费参考图表已连接，日线正在等待首次同步。点击上方“同步行情”取得最近的完整交易日记录。";
  const invalidation = levels ? `持续越过最近五日区间 ${levels.support}–${levels.resistance}，或重要事件改变利率 / 盈利路径时，重新评估本周观点。` : undefined;
  return { expectedDate, bars, latest, previous, fresh: !!fresh, ready, change, levels, weeklyView, invalidation };
}
