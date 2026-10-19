import { addDays } from "./domain";
import { predictionResult, type EventPrediction } from "./event-prediction";
import type { Direction, Judgment, MarketEvent, QuestState } from "./types";
import { trackingWeekStart, weeklyTracking } from "./weekly-tracking";

export type DisciplineGoal =
  | "keep-predicting"
  | "bias-bullish"
  | "bias-bearish"
  | "bias-neutral"
  | "high-confidence"
  | "write-reviews"
  | "stay-steady";

export interface DisciplineFacts {
  start: string;
  end: string;
  week: number;
  recorded: number;
  scored: number;
  correct: number;
  hitRate?: number;
  pending: number;
  directions: Record<Direction, number>;
  bias?: Direction;
  highCount: number;
  highScored: number;
  highCorrect: number;
  completed: number;
  bossTotal: number;
  bossScored: number;
  bossHits: number;
  goal: DisciplineGoal;
  lowData: boolean;
}

type BossEvent = Pick<MarketEvent, "id" | "at" | "status" | "actual" | "unit">;

/** Calendar date in Europe/Paris, the week the discipline report uses. */
export function parisDate(now: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}

/** UTC instant of 00:00 Europe/Paris on a YYYY-MM-DD calendar date. */
export function parisMidnight(date: string) {
  const target = Date.parse(`${date}T00:00:00Z`);
  let result = target;
  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(result));
    const get = (type: string) => parts.find((part) => part.type === type)!.value;
    const shown = Date.parse(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`);
    result += target - shown;
  }
  return new Date(result).toISOString();
}

export function isoWeek(date: string) {
  const cursor = new Date(`${date}T12:00:00Z`);
  const weekday = (cursor.getUTCDay() + 6) % 7;
  cursor.setUTCDate(cursor.getUTCDate() - weekday + 3);
  const thursday = cursor.getTime();
  const yearStart = new Date(Date.UTC(cursor.getUTCFullYear(), 0, 4));
  const startDay = (yearStart.getUTCDay() + 6) % 7;
  yearStart.setUTCDate(yearStart.getUTCDate() - startDay + 3);
  return 1 + Math.round((thursday - yearStart.getTime()) / 604800000);
}

/** One direction dominates the week: all of 3+, or 4+ and at least twice the rest. */
export function directionBias(counts: Record<Direction, number>, recorded: number): Direction | undefined {
  if (recorded < 3) return undefined;
  const ranked = (Object.entries(counts) as [Direction, number][]).sort((a, b) => b[1] - a[1]);
  const [direction, count] = ranked[0];
  const rest = recorded - count;
  if (count >= 3 && (rest === 0 || (count >= 4 && count >= rest * 2))) return direction;
  return undefined;
}

export function disciplineGoal(facts: Pick<DisciplineFacts, "recorded" | "bias" | "highScored" | "highCorrect" | "completed">): DisciplineGoal {
  if (facts.recorded < 3) return "keep-predicting";
  if (facts.bias === "bullish") return "bias-bullish";
  if (facts.bias === "bearish") return "bias-bearish";
  if (facts.bias === "neutral") return "bias-neutral";
  if (facts.highScored >= 1 && facts.highCorrect * 2 < facts.highScored) return "high-confidence";
  if (facts.completed < facts.recorded) return "write-reviews";
  return "stay-steady";
}

export function reportJudgments(state: Pick<QuestState, "trackingWeeks" | "reviews" | "judgment">): Judgment[] {
  const map = new Map<string, Judgment>();
  for (const week of state.trackingWeeks || []) for (const day of week.days) if (day.judgment) map.set(day.judgment.date, day.judgment);
  for (const review of state.reviews) if (review.judgmentSnapshot) map.set(review.judgmentSnapshot.date, review.judgmentSnapshot);
  if (state.judgment) map.set(state.judgment.date, state.judgment);
  return [...map.values()];
}

export function disciplineReport(
  state: Pick<QuestState, "session" | "now" | "reviews">,
  history: Judgment[],
  predictions: EventPrediction[] = [],
  events: BossEvent[] = [],
): DisciplineFacts {
  const asOf = parisDate(state.now);
  const start = trackingWeekStart(asOf);
  const weeks = weeklyTracking({ ...state, session: { ...state.session, date: asOf } }, history);
  const week = weeks.find((item) => item.start === start) ?? weeks[0];
  const directions: Record<Direction, number> = { bullish: 0, neutral: 0, bearish: 0 };
  for (const day of week?.days || []) if (day.judgment) directions[day.judgment.direction] += 1;
  const high = (week?.days || []).filter((day) => day.judgment?.confidence === "high");
  const highScored = high.filter((day) => day.status === "correct" || day.status === "incorrect");
  const recorded = week?.recorded ?? 0;
  const from = Date.parse(parisMidnight(start));
  const to = Date.parse(parisMidnight(addDays(start, 7)));
  let bossTotal = 0, bossScored = 0, bossHits = 0;
  for (const prediction of predictions) {
    const at = Date.parse(prediction.releaseAt);
    if (!Number.isFinite(at) || at < from || at >= to) continue;
    bossTotal += 1;
    const event = events.find((item) => item.id === prediction.eventId);
    if (!event) continue;
    const result = predictionResult(prediction, event as MarketEvent);
    if (!result) continue;
    bossScored += 1;
    if (result.matched) bossHits += 1;
  }
  const facts: DisciplineFacts = {
    start,
    end: week?.end ?? addDays(start, 4),
    week: isoWeek(start),
    recorded,
    scored: week?.scored ?? 0,
    correct: week?.correct ?? 0,
    hitRate: week?.hitRate,
    pending: week?.pending ?? 0,
    directions,
    bias: directionBias(directions, recorded),
    highCount: high.length,
    highScored: highScored.length,
    highCorrect: highScored.filter((day) => day.status === "correct").length,
    completed: week?.completed ?? 0,
    bossTotal,
    bossScored,
    bossHits,
    goal: "stay-steady",
    lowData: recorded < 3,
  };
  facts.goal = disciplineGoal(facts);
  return facts;
}
