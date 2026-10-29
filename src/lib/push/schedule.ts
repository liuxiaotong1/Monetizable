import { addDays, isTradingDate, marketDate, sessionFor, sessionReady } from '../quest/domain';
import { majorEarningsSymbols } from '../quest/earnings-calendar';
import { PUSH_ICON, companionName, eventClock, eventName, notificationBody, type CompanionId, type PushCategory, type PushLocale } from './copy';
import { normalizeKnowledgeTime, safeTimeZone, type PushCategories } from './prefs';

export const DAILY_CAP = 2;
export const WINDOW_MS = 30 * 60 * 1000;
export type { PushCategory, PushLocale, CompanionId, PushCategories };
export { defaultCategories, normalizeCategories, normalizeCompanion, normalizeKnowledgeTime, normalizeLocale, safeTimeZone } from './prefs';
export interface PushEvent {
  id: string;
  kind: string;
  symbol?: string;
  at: string;
  status?: string;
}
export interface PushJudgment { date?: string; eligible?: boolean }
export interface PushProgress { lastAnswerAt?: string; lastDispositionAt?: string }
export interface PushPlan {
  category: PushCategory;
  phase?: 'eve' | 'soon';
  slot: string;
  sentOn: string;
  title: string;
  body: string;
  href: string;
  icon: string;
  badge: string;
  image: string;
}

const MAJOR_KINDS = new Set(['CPI', 'NFP', 'FOMC']);
export function isMajorEvent(event: PushEvent) {
  if (event.status === 'unconfirmed' || !event.id || !Number.isFinite(Date.parse(event.at))) return false;
  if (MAJOR_KINDS.has(event.kind)) return true;
  return event.kind === 'EARNINGS' && !!event.symbol && majorEarningsSymbols.has(event.symbol);
}

export function zonedParts(now: Date, timeZone: string): { date: string; minutes: number } {
  const zone = safeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** Wall-clock time in a zone, converted to UTC. Handles DST without a fixed offset. */
export function zonedTimeToUtc(date: string, minutes: number, timeZone: string) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minute = String(minutes % 60).padStart(2, '0');
  const target = Date.parse(`${date}T${hour}:${minute}:00Z`);
  let result = target;
  for (let i = 0; i < 4; i++) {
    const shown = zonedParts(new Date(result), timeZone);
    const shownHour = String(Math.floor(shown.minutes / 60)).padStart(2, '0');
    const shownMinute = String(shown.minutes % 60).padStart(2, '0');
    result += target - Date.parse(`${shown.date}T${shownHour}:${shownMinute}:00Z`);
  }
  return result;
}

function inWindow(now: Date, startMs: number) {
  const time = now.getTime();
  return time >= startMs && time < startMs + WINDOW_MS;
}
function clockMinutes(value: string) {
  const [hour, minute] = normalizeKnowledgeTime(value).split(':').map(Number);
  return hour * 60 + minute;
}
function nyDay(at: string) {
  const date = new Date(at);
  return Number.isFinite(date.getTime()) ? marketDate(date) : '';
}
function answeredToday(progress: PushProgress[] | undefined, day: string) {
  return (progress || []).some((item) => {
    const at = item.lastDispositionAt || item.lastAnswerAt;
    return !!at && nyDay(at) === day;
  });
}
function hasJudgment(judgments: PushJudgment[] | undefined, day: string, eligibleOnly = false) {
  return (judgments || []).some((item) => item.date === day && (!eligibleOnly || item.eligible !== false));
}

const anchor = {
  premarket: { zh: '预测', fr: 'prevision', en: 'prediction' },
  review: { zh: '复盘', fr: 'bilan', en: 'review' },
} as const;

/** Shared app routes, with the reminder language and a hash in that language. */
export function reminderHref(locale: PushLocale, path: string) {
  const hashAt = path.indexOf('#');
  const before = hashAt >= 0 ? path.slice(0, hashAt) : path;
  const hash = hashAt >= 0 ? path.slice(hashAt) : '';
  const url = new URL(before || '/', 'https://getmonetizable.com');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${hash}`;
}

function planFor(input: {
  locale: PushLocale;
  companion: CompanionId;
  category: PushCategory;
  phase?: 'eve' | 'soon';
  slot: string;
  sentOn: string;
  href: string;
  event?: PushEvent;
}): PushPlan {
  const icon = PUSH_ICON[input.companion];
  const named = input.event ? { eventName: eventName(input.event, input.locale), eventTime: eventClock(input.event.at, input.locale) } : {};
  return {
    category: input.category,
    phase: input.phase,
    slot: input.slot,
    sentOn: input.sentOn,
    title: companionName(input.companion, input.locale),
    body: notificationBody({ locale: input.locale, companion: input.companion, category: input.category, phase: input.phase, ...named }),
    href: reminderHref(input.locale, input.href),
    icon,
    badge: icon,
    image: icon,
  };
}

export function knowledgeHref(locale: PushLocale, events: PushEvent[], bars: { symbol: string; date: string }[], now: Date) {
  const upcoming = events
    .filter((event) => isMajorEvent(event) && Date.parse(event.at) >= now.getTime() && Date.parse(event.at) < now.getTime() + 7 * 86400000)
    .sort((a, b) => a.at.localeCompare(b.at))[0];
  if (upcoming) {
    const id = `${locale === 'zh' ? '' : 'en:'}live:event-preparation:${upcoming.id}`;
    return `/?view=learn&card=${encodeURIComponent(id)}`;
  }
  const latest = bars.filter((bar) => bar.symbol === 'QQQ').map((bar) => bar.date).sort().at(-1);
  if (latest && locale !== 'zh') return `/?view=learn&card=${encodeURIComponent(`en:market:${latest}`)}`;
  return '/?view=learn';
}

export function planNotifications(input: {
  now: Date;
  events: PushEvent[];
  bars: { symbol: string; date: string }[];
  judgments?: PushJudgment[];
  progress?: PushProgress[];
  categories: PushCategories;
  timeZone?: string;
  knowledgeTime?: string;
  locale: PushLocale;
  companion: CompanionId;
  sentToday: number;
  sentSlots?: string[];
}): PushPlan[] {
  if (input.sentToday >= DAILY_CAP) return [];
  const now = input.now;
  const zone = safeTimeZone(input.timeZone);
  const local = zonedParts(now, zone);
  const session = sessionFor(now);
  const trading = isTradingDate(session.date);
  const plans: PushPlan[] = [];
  const majorToday = input.events.filter((event) => isMajorEvent(event) && nyDay(event.at) === session.date);

  if (trading && input.categories.event) {
    const paris = zonedParts(now, 'Europe/Paris');
    const evening = zonedTimeToUtc(paris.date, 20 * 60, 'Europe/Paris');
    if (inWindow(now, evening)) {
      const tomorrow = addDays(paris.date, 1);
      const event = input.events.filter((item) => isMajorEvent(item) && nyDay(item.at) === tomorrow).sort((a, b) => a.at.localeCompare(b.at))[0];
      if (event) plans.push(planFor({ ...input, category: 'event', phase: 'eve', slot: `event:${event.id}:eve`, sentOn: local.date, href: `/?view=events&event=${encodeURIComponent(event.id)}`, event }));
    }
    const soon = majorToday.filter((event) => inWindow(now, Date.parse(event.at) - 60 * 60 * 1000)).sort((a, b) => a.at.localeCompare(b.at))[0];
    if (soon) plans.push(planFor({ ...input, category: 'event', phase: 'soon', slot: `event:${soon.id}:soon`, sentOn: local.date, href: `/?view=events&event=${encodeURIComponent(soon.id)}`, event: soon }));
  }

  if (trading && input.categories.premarket && majorToday.length === 0 && inWindow(now, Date.parse(session.openAt) - 45 * 60 * 1000) && !hasJudgment(input.judgments, session.date)) {
    plans.push(planFor({
      ...input,
      category: 'premarket',
      slot: `premarket:${session.date}`,
      sentOn: local.date,
      href: `/?view=today#${anchor.premarket[input.locale]}`,
    }));
  }

  if (trading && input.categories.review && hasJudgment(input.judgments, session.date, true)) {
    const start = Date.parse(session.closeAt) + 30 * 60 * 1000;
    const hasBar = input.bars.some((bar) => bar.symbol === 'QQQ' && bar.date === session.date);
    const hasPrevious = input.bars.some((bar) => bar.symbol === 'QQQ' && bar.date === session.previousDate);
    if (now.getTime() >= start && now.getTime() < Date.parse(session.closeAt) + 3 * 60 * 60 * 1000 && hasBar && hasPrevious && sessionReady(session.date, now)) {
      plans.push(planFor({
        ...input,
        category: 'review',
        slot: `review:${session.date}`,
        sentOn: local.date,
        href: `/?view=today#${anchor.review[input.locale]}`,
      }));
    }
  }

  if (input.categories.knowledge) {
    const delta = local.minutes - clockMinutes(input.knowledgeTime || '12:30');
    if (delta >= 0 && delta * 60 * 1000 < WINDOW_MS && !answeredToday(input.progress, marketDate(now))) {
      plans.push(planFor({
        ...input,
        category: 'knowledge',
        slot: `knowledge:${local.date}`,
        sentOn: local.date,
        href: knowledgeHref(input.locale, input.events, input.bars, now),
      }));
    }
  }

  const order: PushCategory[] = ['event', 'premarket', 'review', 'knowledge'];
  const already = new Set(input.sentSlots || []);
  return plans
    .filter((plan) => !already.has(plan.slot))
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.slot.localeCompare(b.slot))
    .slice(0, DAILY_CAP - input.sentToday);
}
