export type Direction = "bullish" | "neutral" | "bearish";
export type Category =
  | "earnings"
  | "options"
  | "history"
  | "technical"
  | "events";
export type Mode = "demo" | "live";
export interface Bar {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;
  fetchedAt: string;
}
export interface Scenario {
  direction: Direction;
  title: string;
  condition: string;
  invalidation: string;
  low: number;
  high: number;
  basis: string;
}
export interface Forecast {
  id: string;
  date: string;
  version: number;
  createdAt: string;
  dataAsOf: string;
  baselineClose: number;
  baselineDate?: string;
  provisional?: boolean;
  threshold: number;
  summary: string;
  weeklyView: string;
  weeklyInvalidation: string;
  levels: { support: number; resistance: number; ma20: number; atr14: number };
  scenarios: Scenario[];
  source: "demo" | "rules" | "ai";
  dataSource: string;
}
export interface Judgment {
  id: string;
  date: string;
  forecastId: string;
  direction: Direction;
  confidence: "low" | "medium" | "high";
  reason: string;
  createdAt: string;
  lockedAt: string;
  eligible: boolean;
}
export interface Review {
  updatedAt?: string;
  id: string;
  date: string;
  forecastId: string;
  judgmentId?: string;
  judgmentSnapshot?: Judgment;
  actual: Bar;
  previousClose: number;
  actualDirection: Direction;
  returnPct: number;
  matched?: boolean;
  rangeCovered: boolean;
  rangeWidthPct: number;
  reflection: string;
  traded?: boolean;
  tradeReason?: string;
  tradeResult?: string;
  lesson?: string;
  completedAt?: string;
}
export interface HistoryPoint {
  date: string;
  value: number;
  vintage?: string;
}
export interface PublicationRecord {
  date: string;
  period?: string;
  actual: number;
  previous?: number;
  revised?: number;
  vintage: string;
  sourceUrl: string;
  fetchedAt: string;
  version: number;
  symbol?: string;
}
export type EventKind =
  | "CPI"
  | "NFP"
  | "PCE"
  | "GDP"
  | "FOMC"
  | "EARNINGS"
  | "PPI"
  | "CLAIMS"
  | "ISM"
  | "CONFIDENCE"
  | "MINUTES"
  | "BEIGE_BOOK"
  | "RETAIL"
  | "TRADE"
  | "JOLTS";
export interface MarketEvent {
  report?: import("./official-backfill").OfficialRecord["report"];
  calendarValues?: import("./event-values").CalendarValue;
  id: string;
  kind: EventKind;
  title: string;
  at: string;
  status: "scheduled" | "confirmed" | "pending" | "unconfirmed";
  period?: string;
  actual?: number;
  previous?: number;
  revised?: number;
  consensus?: number;
  consensusSource?: string;
  unit: string;
  description: string;
  analogy: string;
  impact: string;
  scenarios: string[];
  sourceUrl: string;
  sourceName: string;
  fetchedAt?: string;
  history: HistoryPoint[];
  historySource?: { url: string; name: string; fetchedAt: string };
  releaseHistory?: PublicationRecord[];
  symbol?: string;
  qqqReactions?: { date: string; returnPct: number }[];
}
export interface LearningCard {
  conceptId?: string;
  symbol?: string;
  asOf?: string;
  generatedAt?: string;
  topical?: boolean;
  id: string;
  category: Category;
  title: string;
  question: string;
  analogy: string;
  explanation: string;
  example: string;
  choices: string[];
  answerIndex: number;
  answerExplanation: string;
  sources: { title: string; url: string }[];
  tags: string[];
  difficulty: number;
}
export interface CardProgress {
  updatedAt?: string;
  conceptId?: string;
  lastAnswerIndex?: number;
  masteredAt?: string;
  learningStatus?: "seen" | "review" | "mastered";
  questionKey?: string;
  reviewPending?: boolean;
  reviewVisitId?: string;
  lastAnswerVisitId?: string;
  lastDispositionVisitId?: string;
  lastDispositionAt?: string;
  cardId: string;
  bookmarked: boolean;
  skipped: boolean;
  lastAnswerAt?: string;
  dueDate?: string;
  intervalDays: number;
  correctCount: number;
  attempts: number;
}
export interface WatchItem {
  symbol: string;
  irUrl: string;
  earningsAt?: string;
  weeklyNote: string;
}
export interface Settings {
  watchlist: WatchItem[];
  threshold: number;
  notifications: { daily: boolean; events: boolean; results: boolean };
  displayTimeZone: string;
}
export interface Notice {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href: string;
}
export interface SourceStatus {
  name: string;
  status: "ready" | "missing" | "error" | "delayed";
  message: string;
  lastSuccess?: string;
}
export interface Session {
  date: string;
  isTradingDay: boolean;
  openAt: string;
  closeAt: string;
  previousDate: string;
  nextDate: string;
}
export type AdventureSection = "today" | "events" | "learn";
export interface AdventureProgress {
  date: string;
  sections: AdventureSection[];
  completedAt?: string;
}
export interface QuestState {
  learningVisitId?: string;
  trackingWeeks?: import("./weekly-tracking").TrackingWeek[];
  adventure?: AdventureProgress;
  mode: Mode;
  now: string;
  session: Session;
  forecast?: Forecast;
  forecasts: Forecast[];
  judgment?: Judgment;
  reviews: Review[];
  events: MarketEvent[];
  bars: Bar[];
  cards: LearningCard[];
  dailyCardIds: string[];
  dailyCardReasons?: Record<string, string>;
  progress: CardProgress[];
  xp: number;
  settings: Settings;
  notices: Notice[];
  sources: SourceStatus[];
  weeklySummary: string;
  learningUpdate?: {
    date: string;
    savedAt: string;
    count: number;
    stocks: LearningStock[];
    selectionBasis: string;
    status: "ready" | "stale";
  };
}
export interface LearningStock {
  symbol: string;
  name: string;
  reason: string;
  sourceUrl: string;
}
export type QuestCommand =
  | { type: "learningVisit"; visitId: string }
  | { type: "walkthrough"; section: AdventureSection }
  | {
      type: "judgment";
      forecastId: string;
      direction: Direction;
      confidence: Judgment["confidence"];
      reason: string;
    }
  | {
      type: "review";
      reviewId: string;
      traded: boolean;
      tradeReason: string;
      tradeResult: string;
      lesson: string;
    }
  | {
      type: "card";
      cardId: string;
      action: "bookmark" | "skip" | "answer" | "review" | "master" | "reset";
      answerIndex?: number;
    }
  | { type: "settings"; settings: Settings }
  | { type: "notice"; noticeId: string }
  | { type: "mode"; mode: Mode };
