"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Compass,
  Swords,
  Layers3,
  ArrowRight,
  Check,
  RefreshCw,
  Sparkles,
  Bookmark,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import type {
  QuestState,
  QuestCommand,
  Direction,
  Category,
  MarketEvent,
  LearningCard,
} from "@/lib/quest/types";
import {
  hydrateBrowserState,
  applyBrowserCommand,
  readBrowserRecord,
  saveBrowserRecord,
} from "@/lib/quest/browser-store";
import {
  englishState,
  directions,
  themes,
  eventText,
  eventUnit,
  sourceHost,
  readableError,
} from "@/lib/quest/english";
import { learningQueue, masteredConcepts } from "@/lib/quest/learning-engine";
import { marketContext } from "@/lib/quest/market-context";
import { LineChart } from "./charts";
import YelanViewer from "./yelan-viewer";
type View = "today" | "events" | "learn";
const navigation = [
  {
    id: "today" as View,
    title: "Daily Quest",
    sub: "PREPARE & REVIEW",
    icon: Compass,
  },
  {
    id: "events" as View,
    title: "Event Boss",
    sub: "READ THE BIG PICTURE",
    icon: Swords,
  },
  {
    id: "learn" as View,
    title: "Knowledge Deck",
    sub: "LEVEL UP YOUR UNDERSTANDING",
    icon: Layers3,
  },
];
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
const clocks = (at: string) => {
  const date = new Date(at);
  return `${date.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false })} ET / ${date.toLocaleTimeString("en-US", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false })} Paris`;
};
const numbers = (n: number | undefined) =>
  n === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(n);
export default function EnglishQuest() {
  const [view, setView] = useState<View>("today"),
    [state, setState] = useState<QuestState>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState("");
  const shared = useRef<QuestState | null>(null),
    inFlight = useRef(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) throw Error("Market data is temporarily unavailable.");
      const data = englishState(await response.json()),
        record = readBrowserRecord();
      shared.current = data;
      const hydrated = hydrateBrowserState(data, record);
      saveBrowserRecord(record);
      setState(hydrated);
      setError("");
    } catch (e) {
      setError(
        readableError(
          e instanceof Error ? e.message : "Connection unavailable.",
        ),
      );
    }
  }, []);
  useEffect(() => {
    const v = new URLSearchParams(location.search).get("view");
    if (v === "events" || v === "learn") setView(v);
    void load();
    const timer = setInterval(() => {
      if (!document.hidden && !inFlight.current) void load();
    }, 60000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    void fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: view }),
      keepalive: true,
    }).catch(() => {});
  }, [view]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(id);
  }, [toast]);
  function navigate(next: View) {
    setView(next);
    history.replaceState(null, "", `/?view=${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const run = useCallback(async (command: QuestCommand) => {
    if (inFlight.current || !shared.current) return false;
    inFlight.current = true;
    setBusy(true);
    try {
      const record = readBrowserRecord(),
        next = applyBrowserCommand(
          shared.current,
          record,
          command,
          new Date().toISOString(),
        );
      saveBrowserRecord(record);
      setState(next);
      setError("");
      if (command.type !== "learningVisit")
        setToast(
          command.type === "judgment"
            ? "Your premarket prediction is locked."
            : "Progress saved.",
        );
      return next;
    } catch (e) {
      setError(
        readableError(e instanceof Error ? e.message : "Could not save."),
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);
  if (!state)
    return (
      <main className="loading-screen">
        <img src="/brand/monetizable-bull-blue-violet.svg" width="48" height="48" alt="" />
        <h1>Monetizable</h1>
        <p>{error || "Unfolding your adventure map…"}</p>
        {error && (
          <button className="primary" onClick={() => void load()}>
            Reconnect
          </button>
        )}
      </main>
    );
  const market = marketContext(state),
    complete = state.adventure?.sections || [];
  async function completeStop() {
    const result = await run({ type: "walkthrough", section: view });
    if (result && result.adventure?.sections.length !== 3) {
      const next = navigation.find(
        (n) => !result.adventure?.sections.includes(n.id),
      );
      if (next) navigate(next.id);
    }
  }
  return (
    <div className="app-shell english-app">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("today")}>
          <img src="/brand/monetizable-bull-blue-violet.svg" width="39" height="39" alt="" />
          <div>
            Monetizable
            <span>Investing. A little more playful.</span>
          </div>
        </button>
        <div className="sidebar-label">YOUR ADVENTURE MAP</div>
        <nav aria-label="Main navigation">
          {navigation.map((n) => (
            <button
              key={n.id} data-tour-nav={n.id}
              className={`nav-item ${view === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={21} />
              <div>
                {n.title}
                <span>{n.sub}</span>
              </div>
            </button>
          ))}
        </nav>
        <div className="sidebar-quote">
          <Sparkles />
          <p>
            Good investing starts
            <br />
            with better questions.
          </p>
        </div>
        <div className="level-block">
          <span className="level-icon">✧</span>
          <div>
            <strong>
              Market explorer · LV. {Math.floor(state.xp / 100) + 1}
            </strong>
            <div className="xp-track">
              <span style={{ width: `${state.xp % 100}%` }} />
            </div>
            <small>{state.xp % 100} / 100 XP to next level</small>
          </div>
        </div>
      </aside>
      <div className="main-shell workspace">
        <header className="topbar">
          <span>
            <Compass size={16} /> Adventure map <ChevronRight size={14} />{" "}
            {navigation.find((n) => n.id === view)?.title}
          </span>
          <span className="public-tag">A daily investing adventure</span>
        </header>
        <main className="main-content">
          <div className="daily-status">
            <span>
              <i className="status-dot ready" />
              {state.session.isTradingDay
                ? "Market day"
                : "Market closed · learning open"}
            </span>
            <span>
              {state.session.date} · {clocks(state.now)}
            </span>
          </div>
          <div className={`data-banner ${!market.fresh ? "warning" : ""}`}>
            <span>
              {market.latest
                ? `Latest verified close: ${market.latest.date}. ${state.sources.some((s) => s.name === "公开数据连接") ? "Showing a retained public snapshot; the live connection is delayed." : market.fresh ? "Daily data is up to date." : "Retaining the last verified data; scoring waits for a fresh complete session."}`
                : "Waiting for verified market data."}{" "}
              Daily bars are not real-time quotes.
            </span>
            <button onClick={() => void load()} disabled={busy}>
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
          <section
            className={`daily-journey ${complete.length === 3 ? "complete" : ""}`}
          >
            <div>
              <span className="eyebrow">
                DAILY JOURNEY · {complete.length} / 3
              </span>
              <h2>
                {complete.length === 3
                  ? "Quest complete. One step closer to market mastery!"
                  : "Three stops. One wiser you."}
              </h2>
              <p>
                Explore each stop, then tap “Complete this stop”. No trade
                required.
              </p>
            </div>
            <div className="journey-stations">
              {navigation.map((n, i) => (
                <button
                  key={n.id} data-tour-nav={n.id}
                  className={`${view === n.id ? "active" : ""} ${complete.includes(n.id) ? "done" : ""}`}
                  onClick={() => navigate(n.id)}
                >
                  {complete.includes(n.id) ? <Check size={16} /> : i + 1}{" "}
                  {n.title}
                </button>
              ))}
            </div>
          </section>
          {view === "today" ? (
            <Daily state={state} run={run} busy={busy} navigate={navigate} />
          ) : view === "events" ? (
            <EventMap state={state} />
          ) : (
            <Deck state={state} run={run} busy={busy} />
          )}
          <div className="journey-footer">
            <div>
              <strong>Finished exploring this stop?</strong>
              <p>Your effort counts. Your trading activity does not.</p>
            </div>
            <button
              className="primary"
              disabled={busy || complete.includes(view)}
              onClick={() => void completeStop()}
            >
              {complete.includes(view) ? "Stop complete" : "Complete this stop"}
              <ArrowRight size={17} />
            </button>
          </div>
          <footer className="app-footer">
            ✧ Monetizable · Prepare · Understand · Verify · Grow{" "}
            <span>
              Educational context. Check your broker’s quotes before trading.
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map((n) => (
          <button
            key={n.id} data-tour-nav={n.id}
            className={view === n.id ? "active" : ""}
            onClick={() => navigate(n.id)}
          >
            <n.icon size={21} />
            <span>{n.title}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
interface DailyProps {
  state: QuestState;
  run: (cmd: QuestCommand) => Promise<QuestState | false>;
  busy: boolean;
  navigate: (v: View) => void;
}
function Daily({ state, run, busy, navigate }: DailyProps) {
  const [direction, setDirection] = useState<Direction>("bullish"),
    [confidence, setConfidence] = useState<"low" | "medium" | "high">("medium"),
    [reason, setReason] = useState(""),
    [lesson, setLesson] = useState(""),
    [facts, setFacts] = useState(false),
    [celebrate, setCelebrate] = useState(false);
  const bars = state.bars
      .filter((b) => b.symbol === "QQQ")
      .sort((a, b) => a.date.localeCompare(b.date)),
    latest = bars.at(-1),
    previous = bars.at(-2),
    review = state.reviews[0],
    f = state.forecast;
  const past = useRef("");
  useEffect(() => {
    if (review?.matched && past.current !== review.id) {
      past.current = review.id;
      setCelebrate(true);
      setFacts(false);
    }
  }, [review?.id, review?.matched]);
  const afterOpen = Date.parse(state.now) >= Date.parse(state.session.openAt);
  const locked =
    !!state.judgment || !state.session.isTradingDay || afterOpen || !f;
  const ma20 =
      bars.length >= 20
        ? bars.slice(-20).reduce((n, b) => n + b.close, 0) / 20
        : undefined,
    support =
      bars.length >= 5
        ? Math.min(...bars.slice(-5).map((b) => b.low))
        : undefined,
    resistance =
      bars.length >= 5
        ? Math.max(...bars.slice(-5).map((b) => b.high))
        : undefined;
  return (
    <>
      <section className="en-hero">
        <div className="en-hero-copy">
          <span className="eyebrow">✦ YOUR DAILY QUEST</span>
          <h1>
            {review?.matched
              ? "Your call matched."
              : review?.matched === false
                ? "A new lesson unlocked."
                : review
                  ? "Close confirmed."
                  : "Turn your judgment"}
            <br />
            <em>{review ? "Now follow the evidence." : "into experience."}</em>
          </h1>
          <p>
            {review
              ? `${review.date} · ${directions[review.actualDirection]} · ${review.returnPct.toFixed(2)}%. ${review.matched === undefined ? "No eligible prediction to score." : review.matched ? "Your premarket direction matched the verified close." : "Your original call and the close differed. A thoughtful review still earns XP."}`
              : "Read the market. Make your call. Return after the close. Every better question is a step forward."}
          </p>
          <button
            className="primary"
            onClick={() =>
              review
                ? setFacts(!facts)
                : document
                    .getElementById("en-judgment")
                    ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            {review ? "Follow the facts" : "Make today’s call"}
            <ArrowRight size={18} />
          </button>
        </div>
        <div className="en-hero-character">
          <span className="en-yelan-name">
            ✦ YELAN <small>YOUR QUEST COMPANION</small>
          </span>
          <YelanViewer
            locale="en"
            celebrate={celebrate}
            onCelebrationComplete={() => {
              setCelebrate(false);
              setFacts(true);
            }}
          />
        </div>
      </section>
      {review && facts && (
        <section className="en-card review-facts">
          <span className="eyebrow">THE FACT TRAIL · {review.date}</span>
          <h2>01 / Your original call</h2>
          <p>
            {review.judgmentSnapshot
              ? `${directions[review.judgmentSnapshot.direction]} · ${review.judgmentSnapshot.confidence} confidence · ${review.judgmentSnapshot.reason}`
              : "No eligible premarket prediction was recorded."}
          </p>
          <h2>02 / The saved scenario</h2>
          <p>
            Baseline: {money(review.previousClose)}. Range-bound threshold: ±
            {state.forecasts.find((v) => v.id === review.forecastId)
              ?.threshold ?? 0.3}
            %. The original scenario snapshot stays attached to your prediction.
          </p>
          <h2>03 / Actual market and range check</h2>
          <div className="en-numbers">
            <div>
              <span>Verified close</span>
              <strong>{money(review.actual.close)}</strong>
            </div>
            <div>
              <span>Actual daily range</span>
              <strong>
                {money(review.actual.low)} – {money(review.actual.high)}
              </strong>
            </div>
            <div>
              <span>Range coverage</span>
              <strong>
                {review.rangeCovered ? "Covered" : "Not fully covered"}
              </strong>
            </div>
          </div>
          <p className="muted small-text">
            Source: Yahoo Finance regular-session daily bars · retrieved{" "}
            {clocks(review.actual.fetchedAt)}. Daily bars cannot establish the
            sequence of intraday triggers. A direction match does not prove a
            causal explanation.
          </p>
          {review.completedAt ? (
            <p className="account-success">Review saved: {review.lesson}</p>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await run({
                  type: "review",
                  reviewId: review.id,
                  traded: false,
                  tradeReason: "",
                  tradeResult: "",
                  lesson,
                });
              }}
            >
              <label htmlFor="en-lesson">One lesson to carry forward</label>
              <textarea
                id="en-lesson"
                required
                maxLength={2000}
                value={lesson}
                onChange={(e) => setLesson(e.target.value)}
                placeholder="Which evidence supported or invalidated your call?"
              />
              <button className="secondary" disabled={busy}>
                Save review · +20 XP
              </button>
            </form>
          )}
        </section>
      )}
      <section className="en-card">
        <span className="eyebrow">THE BIG PICTURE</span>
        <div className="en-card-heading">
          <h2>QQQ · This week’s map</h2>
          <span className="en-live">DAILY DATA</span>
        </div>
        {latest ? (
          <>
            <div className="en-price">
              {money(latest.close)}
              <span
                className={
                  previous && latest.close >= previous.close
                    ? "positive"
                    : "negative"
                }
              >
                {previous
                  ? `${(100 * (latest.close / previous.close - 1)).toFixed(2)}%`
                  : ""}
              </span>
            </div>
            <p className="muted">
              {latest.date} · regular-session close · retrieved{" "}
              {clocks(latest.fetchedAt)}
            </p>
            <LineChart
              locale="en"
              values={bars
                .slice(-30)
                .map((b) => ({ date: b.date, value: b.close }))}
              height={165}
            />
            <div className="en-numbers">
              <div>
                <span>5-session support</span>
                <strong>{support ? money(support) : "—"}</strong>
              </div>
              <div>
                <span>5-session resistance</span>
                <strong>{resistance ? money(resistance) : "—"}</strong>
              </div>
              <div>
                <span>20-session average</span>
                <strong>{ma20 ? money(ma20) : "—"}</strong>
              </div>
            </div>
            <p>
              Support is the lowest low of the last five sessions; resistance is
              the highest high. The 20-session average is the mean closing
              price. Treat levels as hypotheses, not guaranteed floors or
              ceilings.
            </p>
            <a
              className="source-link"
              href="https://www.tradingview.com/symbols/NASDAQ-QQQ/"
              target="_blank"
              rel="noreferrer"
            >
              Open QQQ’s live reference chart ↗
            </a>
          </>
        ) : (
          <p>Waiting for verified daily prices.</p>
        )}
      </section>
      <section className="en-card" id="en-judgment">
        <span className="eyebrow">LEAVE A REASON, NOT JUST A GUESS</span>
        <h2>What’s your call?</h2>
        {f && (
          <>
            <p>
              Scenario v{f.version} · baseline {money(f.baselineClose)} · data
              as of {clocks(f.dataAsOf)}
            </p>
            <div className="en-scenarios">
              {f.scenarios.map((s) => (
                <article key={s.direction}>
                  <h3>{directions[s.direction]}</h3>
                  <strong>
                    {money(s.low)} – {money(s.high)}
                  </strong>
                  <p>
                    {s.direction === "bullish"
                      ? `Watch whether price can hold above ${money(f.levels.resistance)}.`
                      : s.direction === "bearish"
                        ? `Watch whether price loses ${money(f.levels.support)}.`
                        : `Watch price behavior between ${money(f.levels.support)} and ${money(f.levels.resistance)}.`}
                  </p>
                  <small>
                    Range reference from the saved rule scenario. Reassess when
                    price or verified events invalidate the premise.
                  </small>
                </article>
              ))}
            </div>
          </>
        )}
        {state.judgment ? (
          <div className="account-success">
            <strong>Locked: {directions[state.judgment.direction]}</strong>
            <p>{state.judgment.reason}</p>
            <small>
              {clocks(state.judgment.lockedAt)} · original scenario preserved
            </small>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (f)
                await run({
                  type: "judgment",
                  forecastId: f.id,
                  direction,
                  confidence,
                  reason,
                });
            }}
          >
            <div
              className="en-directions"
              role="group"
              aria-label="Prediction direction"
            >
              {(Object.keys(directions) as Direction[]).map((d) => (
                <button
                  type="button"
                  className={direction === d ? "selected" : ""}
                  aria-pressed={direction === d}
                  key={d}
                  disabled={locked}
                  onClick={() => setDirection(d)}
                >
                  {directions[d]}
                </button>
              ))}
            </div>
            <label htmlFor="en-confidence">Confidence</label>
            <select
              id="en-confidence"
              value={confidence}
              disabled={locked}
              onChange={(e) =>
                setConfidence(e.target.value as typeof confidence)
              }
            >
              <option value="low">Low · still observing</option>
              <option value="medium">Medium · some evidence</option>
              <option value="high">High · a clear thesis</option>
            </select>
            <label htmlFor="en-reason">One-sentence reason</label>
            <textarea
              id="en-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={2000}
              disabled={locked}
              placeholder="What evidence matters? What would change your mind?"
            />
            <button className="primary" disabled={busy || locked}>
              {locked
                ? !state.session.isTradingDay
                  ? "Market closed · return before the next bell"
                  : afterOpen
                    ? "Premarket window closed"
                    : "Waiting for a verified premarket scenario"
                : "Lock my call · +10 XP"}
            </button>
            <p className="muted small-text">
              The call locks at 09:30 ET. Late entries do not count as premarket
              predictions. No precise probability is claimed.
            </p>
          </form>
        )}
      </section>
      <section className="en-card">
        <span className="eyebrow">YOUR JUDGMENT JOURNAL</span>
        <h2>Every week, a clearer picture.</h2>
        {state.trackingWeeks?.map((week) => (
          <details key={week.start} className="en-week">
            <summary>
              {week.start} · {week.recorded} calls · {week.correct}/
              {week.scored} matched
            </summary>
            {week.days.map((day) => (
              <div className="en-week-day" key={day.date}>
                <span>{day.date}</span>
                <strong>
                  {day.judgment
                    ? directions[day.judgment.direction]
                    : "No call recorded"}
                </strong>
                <span>
                  {day.review
                    ? day.review.matched === undefined
                      ? "Unscored"
                      : day.review.matched
                        ? "Matched ✓"
                        : "Learning moment"
                    : day.judgment
                      ? "Awaiting verified close"
                      : "—"}
                </span>
                {day.judgment && <p>{day.judgment.reason}</p>}
              </div>
            ))}
          </details>
        ))}
        <p className="muted small-text">
          Only eligible calls with verified close results enter the match-rate
          denominator. Missing calls and market holidays do not.
        </p>
      </section>
      <div className="en-next">
        <div>
          <span className="eyebrow">YOUR NEXT POWER-UP</span>
          <h2>One question can change how you see the market.</h2>
        </div>
        <button className="secondary" onClick={() => navigate("learn")}>
          Draw a knowledge card <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}
function EventMap({ state }: { state: QuestState }) {
  const [filter, setFilter] = useState<"week" | "upcoming" | "all">("week");
  const date = new Date(`${state.session.date}T12:00:00Z`),
    day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  const monday = date.toISOString().slice(0, 10),
    end = new Date(date.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const events = state.events
    .filter((e) =>
      filter === "all" || filter === "week"
        ? filter === "all" ||
          (e.at.slice(0, 10) >= monday && e.at.slice(0, 10) < end)
        : Date.parse(e.at) >= Date.parse(state.now) &&
          Date.parse(e.at) < Date.parse(state.now) + 7 * 86400000,
    )
    .sort((a, b) => a.at.localeCompare(b.at));
  const next = state.events
    .filter((e) => Date.parse(e.at) > Date.parse(state.now))
    .sort((a, b) => a.at.localeCompare(b.at))[0];
  return (
    <>
      <header className="en-page-title">
        <span className="eyebrow">KNOW YOUR NEXT CHALLENGE</span>
        <h1>
          Big events.
          <br />
          <em>Better understanding.</em>
        </h1>
        <p>
          Official numbers first. Market interpretations second. Build your own
          picture.
        </p>
      </header>
      {next && (
        <section className="en-next-boss">
          <Swords size={38} />
          <div>
            <span className="eyebrow">NEXT BOSS</span>
            <h2>{eventText(next).title}</h2>
            <p>
              {new Date(next.at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "America/New_York",
              })}{" "}
              · {clocks(next.at)}
            </p>
          </div>
          <span>
            {Math.ceil(
              (Date.parse(next.at) - Date.parse(state.now)) / 86400000,
            )}{" "}
            days away
          </span>
        </section>
      )}
      <section className="en-card">
        <div className="en-card-heading">
          <h2>Major event map</h2>
          <div className="en-directions">
            {(["week", "upcoming", "all"] as const).map((v) => (
              <button
                key={v}
                className={filter === v ? "selected" : ""}
                onClick={() => setFilter(v)}
              >
                {v === "week"
                  ? "This week"
                  : v === "upcoming"
                    ? "Next 7 days"
                    : "All dates"}
              </button>
            ))}
          </div>
        </div>
        <p className="muted">
          {filter === "week"
            ? `${monday} – ${end} · New York week`
            : filter === "upcoming"
              ? "Next seven calendar days"
              : "Verified source calendar"}{" "}
          · {events.length} events
        </p>
        {events.map((e) => (
          <EventDetail key={e.id} event={e} now={state.now} />
        ))}
        {!events.length && (
          <p>No verified events in this window. Try another date range.</p>
        )}
      </section>
      <section className="en-card" data-tour="briefs">
        <span className="eyebrow">PREMARKET & WEEK AHEAD</span>
        <h2>Prepare before the next round.</h2>
        <div className="en-scenarios">
          <article>
            <h3>Premarket brief</h3>
            <strong>Weekdays · 14:15 Paris</strong>
            <p>
              Check the latest close, support and resistance, and the day’s
              official releases before the bell. Data remains timestamped; a
              stale feed pauses scoring.
            </p>
            <p>
              Today:{" "}
              {state.session.isTradingDay ? "Trading session" : "Market closed"}
              . The next session is {state.session.nextDate}.
            </p>
          </article>
          <article>
            <h3>Weekly outlook</h3>
            <strong>Sunday · 19:00 Paris</strong>
            <p>
              Preview the next week’s releases and the verified QQQ price
              structure. Sunday evening refreshes the shared source report.
            </p>
            <ul>
              {state.events
                .filter(
                  (e) =>
                    Date.parse(e.at) > Date.parse(state.now) &&
                    Date.parse(e.at) < Date.parse(state.now) + 7 * 86400000,
                )
                .sort((a, b) => a.at.localeCompare(b.at))
                .slice(0, 5)
                .map((e) => (
                  <li key={e.id}>
                    {eventText(e).title} · {e.at.slice(0, 10)}
                  </li>
                ))}
            </ul>
          </article>
        </div>
        <p className="muted small-text">
          These English preparation prompts use the verified shared calendar and
          daily prices. Full source-report prose is not yet translated; these
          prompts are not presented as a translation of it.
        </p>
      </section>
      <details className="en-card">
        <summary>Information sources · forecasts, analysis & sentiment</summary>
        <p>
          Official releases establish the facts. News and prediction markets add
          context; market odds are not the same as an economic consensus
          forecast.
        </p>
        <div className="en-source-grid">
          {[
            [
              "Polymarket",
              "Prediction-market sentiment",
              "https://polymarket.com/",
            ],
            [
              "Financial Times",
              "Reporting and analysis",
              "https://www.ft.com/",
            ],
            [
              "Wall Street Journal",
              "Reporting and market context",
              "https://www.wsj.com/",
            ],
            ["MarketWatch", "Market reporting", "https://www.marketwatch.com/"],
          ].map(([name, desc, url]) => (
            <a key={name} href={url} target="_blank" rel="noreferrer">
              <strong>{name} ↗</strong>
              <span>{desc}</span>
            </a>
          ))}
        </div>
        <p className="muted small-text">
          External sources may require their own subscription. Missing consensus
          remains blank; none is inferred from market odds.
        </p>
      </details>
    </>
  );
}
function EventDetail({ event: e, now }: { event: MarketEvent; now: string }) {
  const text = eventText(e),
    passed = Date.parse(e.at) <= Date.parse(now),
    status =
      e.actual !== undefined
        ? "Official value confirmed"
        : e.report
          ? "Official report available"
          : passed
            ? "Awaiting source confirmation"
            : "Upcoming";
  return (
    <details className="en-event">
      <summary>
        <span className="en-event-icon">
          <Swords size={22} />
        </span>
        <div>
          <span className="eyebrow">
            {e.kind} · {status}
          </span>
          <h3>{text.title}</h3>
          <p>{text.analogy}</p>
          {e.actual !== undefined && (
            <strong>
              Actual {numbers(e.actual)} · Previous {numbers(e.previous)}
            </strong>
          )}
        </div>
        <div className="en-event-date">
          {new Date(e.at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "America/New_York",
          })}
          <small>{clocks(e.at)}</small>
          <ChevronRight size={18} />
        </div>
      </summary>
      <div className="en-event-body">
        <div className="en-numbers">
          <div>
            <span>Actual</span>
            <strong>
              {e.actual === undefined
                ? e.report
                  ? "Report published"
                  : passed
                    ? "Awaiting confirmation"
                    : "Not yet released"
                : numbers(e.actual)}
            </strong>
          </div>
          <div>
            <span>Previous</span>
            <strong>{numbers(e.previous)}</strong>
          </div>
          <div>
            <span>Consensus</span>
            <strong>{numbers(e.consensus)}</strong>
          </div>
        </div>
        <p className="muted small-text">
          {eventUnit(e)} ·{" "}
          {e.consensus === undefined
            ? "No verified market consensus connected."
            : `Consensus source: ${e.consensusSource ? sourceHost(e.consensusSource) : "See official data provenance."}`}
          {e.revised !== undefined
            ? ` Revised previous: ${numbers(e.revised)}.`
            : ""}
        </p>
        <h4>Why it matters for QQQ</h4>
        <p>{text.impact}</p>
        <p>
          The response depends on what was already expected, growth, rates and
          positioning. Hotter and cooler readings can have different effects in
          different regimes.
        </p>
        {e.history.length > 0 && (
          <>
            <h4>Historical context · {e.history.length} observations</h4>
            <LineChart
              locale="en"
              color="#b8a5f6"
              values={e.history.slice(-60)}
              height={150}
            />
          </>
        )}
        <a
          className="source-link"
          href={e.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {sourceHost(e.sourceUrl)} · open source release ↗
        </a>
        {e.fetchedAt && (
          <p className="muted small-text">
            Retrieved{" "}
            {new Date(e.fetchedAt).toLocaleString("en-US", {
              timeZone: "America/New_York",
            })}{" "}
            ET
          </p>
        )}
      </div>
    </details>
  );
}
function Deck({
  state,
  run,
  busy,
}: {
  state: QuestState;
  run: DailyProps["run"];
  busy: boolean;
}) {
  const [theme, setTheme] = useState<Category>(),
    [tab, setTab] = useState<"daily" | "all" | "mastered" | "saved">("daily"),
    [celebrate, setCelebrate] = useState(false);
  const visit = useRef<string | null>(null),
    swipe = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!visit.current) visit.current = crypto.randomUUID();
    void run({ type: "learningVisit", visitId: visit.current });
  }, [run]);
  useEffect(() => {
    if (!celebrate) return;
    const id = setTimeout(() => setCelebrate(false), 1300);
    return () => clearTimeout(id);
  }, [celebrate]);
  const mastered = masteredConcepts(
      state.cards,
      state.progress.filter((p) => p.cardId.startsWith("en:")),
    ),
    queue = learningQueue(
      state.cards,
      state.progress,
      state.session.date,
      tab === "daily" ? state.dailyCardIds : undefined,
      theme,
      state.learningVisitId,
    ),
    card = queue[0];
  const progress = card
      ? state.progress.find((p) => p.cardId === card.id)
      : undefined,
    answered =
      !!progress?.lastAnswerAt &&
      progress.lastAnswerVisitId === state.learningVisitId &&
      progress.lastDispositionVisitId !== state.learningVisitId;
  const selected = progress?.lastAnswerIndex;
  async function disposition(action: "master" | "review") {
    if (card && answered) {
      setCelebrate(false);
      await run({ type: "card", cardId: card.id, action });
    }
  }
  const list = state.cards.filter(
    (c) =>
      (!theme || c.category === theme) &&
      (tab === "mastered"
        ? mastered.has(c.conceptId || c.id)
        : state.progress.find((p) => p.cardId === c.id)?.bookmarked),
  );
  return (
    <>
      <header className="en-page-title">
        <span className="eyebrow">FIVE PATHS · ONE CURIOUS MIND</span>
        <h1>
          A good question.
          <br />
          <em>Your next power-up.</em>
        </h1>
        <p>
          Pick an answer. Flip into understanding. Left to review once next
          visit; right when you’ve got it.
        </p>
      </header>
      <div className="en-theme-grid">
        {(Object.keys(themes) as Category[]).map((t) => (
          <button
            key={t}
            className={theme === t ? "selected" : ""}
            aria-pressed={theme === t}
            onClick={() => setTheme(theme === t ? undefined : t)}
          >
            <span>
              {
                {
                  earnings: "EPS",
                  options: "δ",
                  history: "⌛",
                  technical: "↗",
                  events: "◷",
                }[t]
              }
            </span>
            <strong>{themes[t]}</strong>
            <small>
              {state.cards.filter((c) => c.category === t).length} cards
            </small>
          </button>
        ))}
      </div>
      {state.learningUpdate?.stocks?.length && (
        <section className="en-stock-basket">
          <span className="eyebrow">TODAY’S EARNINGS LEARNING BASKET</span>
          <div>
            {state.learningUpdate.stocks.map((stock) => (
              <a
                key={stock.symbol}
                href={stock.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {stock.symbol} <span>{stock.name}</span> ↗
              </a>
            ))}
          </div>
          <p>
            A curated learning basket, not an objective popularity ranking.
            Company links point to published source material.
          </p>
        </section>
      )}
      <div className="en-deck-tabs">
        {(["daily", "all", "saved", "mastered"] as const).map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t === "daily"
              ? "Today’s practice"
              : t === "all"
                ? "Explore the deck"
                : t === "saved"
                  ? "Saved cards"
                  : "Mastered"}
          </button>
        ))}
        <span>{mastered.size} concepts mastered</span>
      </div>
      {tab === "mastered" || tab === "saved" ? (
        <section className="en-card">
          {!list.length ? (
            <p>No cards here yet.</p>
          ) : (
            list.map((c) => (
              <details className="en-saved-card" key={c.id}>
                <summary>{c.title}</summary>
                <p>{c.question}</p>
                <strong>Answer: {c.choices[c.answerIndex]}</strong>
                <p>{c.answerExplanation}</p>
                {tab === "mastered" && (
                  <button
                    className="secondary"
                    onClick={() =>
                      void run({ type: "card", cardId: c.id, action: "reset" })
                    }
                  >
                    Review once next visit
                  </button>
                )}
              </details>
            ))
          )}
        </section>
      ) : card ? (
        <section
          className={`en-quiz-card ${answered ? "flipped" : ""}`}
          onPointerDown={(e) => {
            if (e.isPrimary) swipe.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const p = swipe.current;
            swipe.current = null;
            if (
              p &&
              Math.abs(e.clientX - p.x) > 75 &&
              Math.abs(e.clientX - p.x) > Math.abs(e.clientY - p.y) * 1.5 &&
              answered
            )
              void disposition(e.clientX > p.x ? "master" : "review");
          }}
        >
          {celebrate && (
            <div className="quiz-fireworks" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => (
                <i
                  key={i}
                  style={
                    {
                      "--angle": `${i * 20}deg`,
                      "--distance": `${65 + (i % 3) * 15}px`,
                      "--delay": `${(i % 4) * 30}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}
          <div className="en-quiz-top">
            <span className="eyebrow">
              {themes[card.category]} ·{" "}
              {answered
                ? "EXPLANATION UNLOCKED"
                : "ONE QUESTION, ONE DISCOVERY"}
            </span>
            <button
              className="icon-button"
              aria-label="Save this card"
              onClick={() =>
                void run({ type: "card", cardId: card.id, action: "bookmark" })
              }
            >
              <Bookmark size={18} />
            </button>
          </div>
          <h2>{card.title}</h2>
          {!answered ? (
            <>
              <p className="en-question">{card.question}</p>
              <div className="en-choices">
                {card.choices.map((choice, i) => (
                  <button
                    key={i}
                    disabled={busy}
                    onClick={async () => {
                      const result = await run({
                        type: "card",
                        cardId: card.id,
                        action: "answer",
                        answerIndex: i,
                      });
                      if (result && i === card.answerIndex) setCelebrate(true);
                    }}
                  >
                    <span>{String.fromCharCode(65 + i)}</span>
                    {choice}
                  </button>
                ))}
              </div>
              <p className="muted small-text">
                Choose an answer to unlock the explanation.
              </p>
            </>
          ) : (
            <div className="en-answer">
              <span
                className={selected === card.answerIndex ? "positive" : "muted"}
              >
                {selected === card.answerIndex
                  ? "✦ Nice work! +5 XP"
                  : "A new understanding unlocked."}
              </span>
              <h3>
                Correct answer: {String.fromCharCode(65 + card.answerIndex)} ·{" "}
                {card.choices[card.answerIndex]}
              </h3>
              <p>{card.answerExplanation}</p>
              <blockquote>{card.analogy}</blockquote>
              {card.explanation !== card.answerExplanation && (
                <p>{card.explanation}</p>
              )}
              {card.asOf && <small>Data as of {card.asOf}</small>}
              {card.sources.map((s) => (
                <a
                  className="source-link"
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.title} ↗
                </a>
              ))}
            </div>
          )}
          <div className="en-disposition">
            <button
              className="secondary"
              disabled={!answered || busy}
              onClick={() => void disposition("review")}
            >
              <ArrowLeft size={17} />
              Not yet · review next visit
            </button>
            <button
              className="primary"
              disabled={!answered || busy}
              onClick={() => void disposition("master")}
            >
              Got it · no repeats
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      ) : (
        <section className="en-card en-deck-done">
          <Sparkles size={35} />
          <h2>You’ve explored today’s trail.</h2>
          <p>
            No mastered concepts repeat automatically. Come back tomorrow for
            fresh concepts, or explore the rest of the deck.
          </p>
          <button
            className="secondary"
            onClick={() => {
              setTab("all");
              setTheme(undefined);
            }}
          >
            Explore more cards
          </button>
        </section>
      )}
      <p className="muted small-text">
        English learning deck: curated concept cards plus a daily exercise from
        verified market data. Five routes rotate every day. Mastery remembers
        concepts; only an explicit review request brings a card back.
      </p>
    </>
  );
}
