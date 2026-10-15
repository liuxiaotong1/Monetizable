import { addDays, marketDate } from "./domain";
import type { MarketEvent, SourceStatus } from "./types";

export type EventCategory = "all" | "macro" | "earnings";
export type EventScope = "week" | "next7" | "all";
const qualitativeKinds = new Set<string>(["MINUTES", "BEIGE_BOOK"]);
function validTime(event: MarketEvent) { return Number.isFinite(Date.parse(event.at)); }
function chronological(a: MarketEvent, b: MarketEvent) { return Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id); }
export function eventStatusAt(event: MarketEvent, now: string): MarketEvent["status"] {
  if (event.status === "scheduled" && validTime(event) && Date.parse(event.at) <= Date.parse(now)) return "pending";
  return event.status;
}
export function numericEvent(event: MarketEvent) { return !qualitativeKinds.has(event.kind)&&!(event.status==='confirmed'&&event.actual===undefined&&event.report); }
export function nextEvent(events: MarketEvent[], now: string) {
  const current = Date.parse(now);
  if (!Number.isFinite(current)) return undefined;
  return events.filter(event => event.status !== "unconfirmed" && validTime(event) && Date.parse(event.at) > current).sort(chronological)[0];
}
export function eventWeek(now: string) {
  const date = marketDate(new Date(now));
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const start = addDays(date, -((weekday + 6) % 7));
  return { start, end: addDays(start, 7), lastDate: addDays(start, 6) };
}
export function selectEvents(events: MarketEvent[], now: string, scope: EventScope = "week", category: EventCategory = "all") {
  const week = eventWeek(now), current = Date.parse(now);
  return events.filter(event => {
    if (category === "macro" && event.kind === "EARNINGS" || category === "earnings" && event.kind !== "EARNINGS") return false;
    if (event.status === "unconfirmed" || !validTime(event)) return scope === "all";
    const date = marketDate(new Date(event.at));
    return scope === "all" || (scope === "week" ? date >= week.start && date < week.end : Date.parse(event.at) >= current && Date.parse(event.at) < current + 7 * 86_400_000);
  }).sort((a, b) => {
    const uncertainA = a.status === "unconfirmed" || !validTime(a), uncertainB = b.status === "unconfirmed" || !validTime(b);
    if (uncertainA !== uncertainB) return uncertainA ? 1 : -1;
    if (uncertainA) return a.title.localeCompare(b.title);
    if (scope !== "all") return chronological(a, b);
    const futureA = Date.parse(a.at) > Date.parse(now), futureB = Date.parse(b.at) > Date.parse(now);
    if (futureA !== futureB) return futureA ? -1 : 1;
    return futureA ? chronological(a, b) : chronological(b, a);
  });
}
export function calendarCoverage(sources: SourceStatus[], now?: string) {
  const current = now && marketDate(new Date(now)).slice(0, 7);
  const next = current && new Date(`${current}-01T12:00:00Z`);
  if (next) next.setUTCMonth(next.getUTCMonth() + 1);
  const months = new Set([current, next && next.toISOString().slice(0, 7), now && eventWeek(now).start.slice(0, 7)]);
  const calendars = sources.filter(source => {
    if (!/^(?:BLS 日历|BEA 日历|Fed 日历|Fed 月度事件日历|纽约联储经济日历)/.test(source.name)) return false;
    const month = source.name.match(/20\d{2}-\d{2}$/)?.[0];
    return !now || !month || months.has(month);
  });
  return { ready: calendars.filter(source => source.status === "ready"), unavailable: calendars.filter(source => source.status !== "ready") };
}
