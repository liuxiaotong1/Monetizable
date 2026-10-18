"use client";
import DeckVictory,{useDeckCompletion} from './deck-victory';
import WeeklyOutlook from './weekly-outlook';
import BossAvatar from './boss-avatar';
import BriefPreview from './brief-preview';
import {LocalizeTree, useLocale} from '@/components/i18n/locale-provider';
import {clientLocale, formatMarketDate, formatUsd, intlLocale} from "@/lib/i18n/locale";
import ScenarioChoices from "./scenario-choices";
import EventBossQuest from "./event-boss-quest";
import EventTakeaway from "./event-takeaway";
import DataFreshness from "./data-freshness";
import { pendingJudgment } from "@/lib/quest/pending-judgment";
import KnowledgeExplanation from "./knowledge-explanation";
import EntryScore from "./entry-score";
import WatchlistChart from "./watchlist-chart";
import {useBilling,PremiumGate,LearningAllowance} from "../account/billing-access";
import { predictionSession } from "@/lib/quest/prediction-window";
import { shuffledIndices } from "@/lib/quest/shuffle";
import InvestmentStyle from "./investment-style";
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
import { useCardSwipe } from "./use-card-swipe";
import { draftKey, transferKey, trialKey, readTrialCards, readPredictionDraft, type PredictionDraft } from "@/lib/quest/guest-access";
import { useDialogFocus } from "./use-dialog-focus";
import { X, LockKeyhole } from "lucide-react";
import { learningQueue, masteredConcepts } from "@/lib/quest/learning-engine";
import { marketContext } from "@/lib/quest/market-context";
import { LineChart } from "./charts";
import YelanViewer from "./yelan-viewer";
import FirstQuestHero from "./first-quest-hero";
import NextQuestPrompt from "./next-quest-prompt";
import {useAdventureStage} from "./hero-preference";
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
const clocks = (at: string) => {
  const date = new Date(at);
  return `${date.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false })} ET / ${date.toLocaleTimeString("en-US", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false })} Paris`;
};
const numbers = (n: number | undefined) =>
  n === undefined
    ? "—"
    : new Intl.NumberFormat(clientLocale(), { maximumFractionDigits: 3 }).format(n);
export default function EnglishQuest({ signedIn = false }: { signedIn?: boolean }) {
  const [view, setView] = useState<View>("today"),
    [state, setState] = useState<QuestState>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [trialCards, setTrialCards] = useState<string[]>([]),
    [gate, setGate] = useState<"prediction" | "cards" | null>(null);
  const locale = useLocale(), day = (iso: string) => formatMarketDate(iso, locale);
  const gateDialog = useRef<HTMLElement>(null);
  useDialogFocus(gateDialog, !!gate, () => setGate(null));
  const requireAccount = useCallback((reason: "prediction" | "cards", draft?: PredictionDraft) => {
    if (draft) localStorage.setItem(draftKey, JSON.stringify(draft));
    setGate(reason);
  }, []);
  useEffect(() => { setTrialCards(readTrialCards()); }, []);
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
    const onReturn=()=>{if(!document.hidden&&!inFlight.current)void load();};
    document.addEventListener("visibilitychange",onReturn);window.addEventListener("focus",onReturn);
    return () => {clearInterval(timer);document.removeEventListener("visibilitychange",onReturn);window.removeEventListener("focus",onReturn);};
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
    if (!signedIn && command.type === "judgment") { setGate("prediction"); return false; }
    if (inFlight.current || !shared.current) return false;
    inFlight.current = true;
    setBusy(true);
    try {
      if(command.type === "card" && command.action === "answer") {
        const response=await fetch('/api/learning/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cardId:command.cardId,answerIndex:command.answerIndex})});
        const payload=await response.json();if(!response.ok){window.dispatchEvent(new Event("quest-billing-refresh"));if(response.status===401&&!signedIn)setGate("cards");throw Error(payload.error);}
        shared.current.cards=shared.current.cards.map(c=>c.id===payload.card.id?payload.card:c);
        command={...command,answerIndex:payload.chosen};
        window.dispatchEvent(new Event("quest-billing-refresh"));
      }
      const record = readBrowserRecord(),
        next = applyBrowserCommand(
          shared.current,
          record,
          command,
          new Date().toISOString(),
        );
      saveBrowserRecord(record);
      if (!signedIn && command.type === "card") { const ids = [...new Set([...readTrialCards(), command.cardId])]; localStorage.setItem(trialKey, JSON.stringify(ids)); setTrialCards(ids); }
      if (command.type === "judgment") localStorage.removeItem(draftKey);
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
  }, [signedIn]);
  if (!state)
    return <LocalizeTree>{(
      <main className="loading-screen">
        <img src="/brand/monetizable-curious-m.svg" width="48" height="48" alt="" />
        <h1>Monetizable</h1>
        <p>{error || "Unfolding your adventure map…"}</p>
        {error && (
          <button className="primary" onClick={() => void load()}>
            Reconnect
          </button>
        )}
      </main>
    )}</LocalizeTree>;
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
  return <LocalizeTree>{(
    <div className="app-shell english-app">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("today")}>
          <img src="/brand/monetizable-curious-m.svg" width="39" height="39" alt="" />
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
              {day(state.session.date)} · {clocks(state.now)}
            </span>
          </div>
          <div className={`data-banner ${!market.fresh ? "warning" : ""}`}>
            <span>
              {market.latest
                ? `Latest verified close: ${day(market.latest.date)}. ${state.sources.some((s) => s.name === "公开数据连接") ? "Showing a retained public snapshot; the live connection is delayed." : market.fresh ? "Daily data is up to date." : "Retaining the last verified data; scoring waits for a fresh complete session."}`
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
            <Daily state={state} run={run} busy={busy} navigate={navigate} signedIn={signedIn} requireAccount={requireAccount} />
          ) : view === "events" ? (
            <EventMap state={state} />
          ) : (
            <Deck state={state} run={run} busy={busy} signedIn={signedIn} trialCards={trialCards} requireAccount={requireAccount} />
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
      {gate && <div className="auth-gate-backdrop"><section ref={gateDialog} className="auth-gate" role="dialog" aria-modal="true" aria-labelledby="auth-gate-title"><button className="auth-gate-close" onClick={() => setGate(null)} aria-label="Close account prompt"><X size={20}/></button><LockKeyhole size={30}/><span className="eyebrow">KEEP YOUR NEXT LEVEL</span><h2 id="auth-gate-title">{gate === "prediction" ? "Save your call with an account." : "Save your learning progress."}</h2><p>{gate === "prediction" ? "Your draft is kept in this browser. Sign in or create an account to save predictions and track your results. We’ll bring back your draft for you to confirm; it won’t be submitted automatically." : "You need an account to save your learning progress. Sign in or create one to pick up where you left off across devices."}</p><a className="primary" href="/auth" onClick={() => localStorage.setItem(transferKey, "yes")}>Sign in / Create an account <ArrowRight size={17}/></a><button className="auth-gate-back" onClick={() => setGate(null)}>Keep exploring the site</button><small>Continue with Google / Gmail or use a secure email link.</small></section></div>}
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
  )}</LocalizeTree>;
}
interface DailyProps {
  state: QuestState;
  run: (cmd: QuestCommand) => Promise<QuestState | false>;
  busy: boolean;
  navigate: (v: View) => void;
  signedIn: boolean;
  requireAccount: (reason: "prediction" | "cards", draft?: PredictionDraft) => void;
}
function Daily({ state, run, busy, navigate, signedIn, requireAccount }: DailyProps) {
  const adventureStage=useAdventureStage();
  const [activeSymbol,setActiveSymbol]=useState("QQQ");
  const locale = useLocale(), money = (n: number) => formatUsd(n, locale), day = (iso: string) => formatMarketDate(iso, locale);
  const [direction, setDirection] = useState<Direction | null>(null),
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
  useEffect(() => { const draft = readPredictionDraft(); if (draft) { setDirection(draft.direction); setConfidence(draft.confidence); setReason(draft.reason); } }, []);
  const revealBattleFacts=useCallback(()=>{setCelebrate(false);setFacts(true);},[]);
  const past = useRef("");
  useEffect(() => {
    if (review?.matched && past.current !== review.id) {
      past.current = review.id;
      setCelebrate(true);
      setFacts(false);
    }
  }, [review?.id, review?.matched]);
  const pending=pendingJudgment(state);
  const productIntro = !pending && review?.matched !== true && review?.matched !== false;
  const targetSession=predictionSession(state);
  const afterOpen = Date.parse(state.now) >= Date.parse(targetSession.openAt);
  const locked =
    signedIn && (!!state.judgment || !targetSession.isTradingDay || afterOpen || !f);
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
  if(adventureStage==='landing')return <FirstQuestHero/>;
  return <LocalizeTree>{(
    <>
      <section className="en-hero">
        <div className="en-hero-copy">
          {productIntro?<NextQuestPrompt/>:<>
          <span className="eyebrow">✦ YOUR DAILY QUEST</span>
          <h1>
            {<>
            {pending ? `Your ${day(pending.date)} call is sealed.` : review?.matched
              ? "Your call matched."
              : "A new lesson unlocked."}
            <br />
            <em>{pending ? "Awaiting the verified close." : "Now follow the evidence."}</em>
            </>}
          </h1>
          <p>
            {pending ? <>{directions[pending.direction]} · <span translate="no">{pending.reason}</span>. {"Sealed before the target session opened; eligible for scoring once its complete daily bar is confirmed."}</> : review
              ? `${day(review.date)} · ${directions[review.actualDirection]} · ${review.returnPct.toFixed(2)}%. ${review.matched ? "Your premarket direction matched the verified close." : "Your original call and the close differed. A thoughtful review still earns XP."}`
              : ""}
          </p>
          <button
            className="primary"
            onClick={() =>
              review
                ? setFacts(!facts)
                : document.getElementById("en-judgment")?.scrollIntoView({behavior:"smooth",block:"start"})
            }
          >
            {review ? pending ? `View ${day(review.date)} historical report` : "Follow the facts" : locale==='fr'?"Revoir ma prévision":"View my saved call"}
            <ArrowRight size={18} />
          </button>
          </>}
        </div>
        <div className="en-hero-character">
          <YelanViewer
            locale="en"
            celebrate={celebrate}
            failed={!pending&&review?.matched===false}
            victoryDate={review?.matched===true?review.date:undefined}
            onCelebrationComplete={revealBattleFacts}
          />
        </div>
      </section>
      {review && facts && (
        <section className="en-card review-facts">
          <span className="eyebrow">THE FACT TRAIL · {day(review.date)}</span>
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
            Daily bars · updated{" "}
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
      <WatchlistChart settings={state.settings} onSave={settings=>run({type:"settings",settings})} selected={activeSymbol} onSelect={setActiveSymbol} latest={latest} busy={busy}/>
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
              {day(latest.date)} · regular-session close · retrieved{" "}
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
      <section className="en-card" id="en-judgment" style={{ scrollMarginTop: 72 }}>
        <span className="eyebrow">YOUR NEXT MARKET QUEST</span>
        <h2>Choose your next market quest.</h2>
        <p className="scenario-mission-copy">No trade needed. Pick a direction, explain your thinking, and come back to test it.</p>
        <p>Target trading session: <strong>{day(targetSession.date)}</strong></p>
        {targetSession.date!==state.session.date&&state.trackingWeeks?.flatMap(w=>w.days).find(d=>d.date===state.session.date)?.judgment&&<p>Today’s prediction is sealed and remains in your judgment journal.</p>}
        {f && (
          <>
            <ScenarioChoices forecast={f} value={signedIn&&state.judgment?state.judgment.direction:direction} onChange={setDirection} disabled={locked||busy}/>
            <details className="scenario-basis"><summary>View scenario data & rules</summary>            <p>
              Scenario v{f.version} · baseline {money(f.baselineClose)} · data
              as of {f.dataAsOf.includes("T")?clocks(f.dataAsOf):day(f.dataAsOf)}
            </p>
            {f.provisional&&<p>Early preparation: the prior session has not closed. These levels use the latest completed daily candle; the direction result will use the actual prior-session close.</p>}
<p>Ranges are saved scenario references, not price targets. Reassess when price or verified events invalidate the premise.</p></details>
          </>
        )}
        {state.judgment && signedIn ? (
          <div className="account-success">
            <strong>Locked: {directions[state.judgment.direction]}</strong>
            <p translate="no">{state.judgment.reason}</p>
            <small>
              {clocks(state.judgment.lockedAt)} · original scenario preserved
            </small>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!direction) return;
              if (!signedIn) { requireAccount("prediction", { direction, confidence, reason, date: targetSession.date, at: new Date().toISOString() }); return; }
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
            <button className="primary" disabled={busy || locked || !direction}>
              {locked
                ? !state.session.isTradingDay
                  ? "Market closed · return before the next bell"
                  : afterOpen
                    ? "Premarket window closed"
                    : "Waiting for a verified premarket scenario"
                : signedIn ? "Seal my scenario · +10 XP" : "Save my scenario"}
            </button>
            <p className="muted small-text">
              {!signedIn && <>Try filling in your call. An account is required when saving. Drafts entered outside the premarket window are not scored.<br/></>}
              Your call targets {day(targetSession.date)} and locks at {clocks(targetSession.openAt)}. Today’s locked call is kept. Late entries do not count as premarket
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
              {day(week.start)} · {week.recorded} calls · {week.correct}/
              {week.scored} matched
            </summary>
            {week.days.map((entry) => (
              <div className="en-week-day" key={entry.date}>
                <span>{day(entry.date)}</span>
                <strong>
                  {entry.judgment
                    ? directions[entry.judgment.direction]
                    : "No call recorded"}
                </strong>
                <span>
                  {entry.review
                    ? entry.review.matched === undefined
                      ? "Unscored"
                      : entry.review.matched
                        ? "Matched ✓"
                        : "Learning moment"
                    : entry.judgment
                      ? "Awaiting verified close"
                      : "—"}
                </span>
                {entry.judgment && <p translate="no">{entry.judgment.reason}</p>}
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
      <EntryScore symbol={activeSymbol}/>
    </>
  )}</LocalizeTree>;
}
function EventMap({ state }: { state: QuestState }) {
  const locale = useLocale(), dayLabel = (iso: string) => formatMarketDate(iso, locale);
  const [filter, setFilter] = useState<"week" | "upcoming" | "all">("week");
  const [focusedEvent,setFocusedEvent]=useState<string>();
  useEffect(()=>{if(!focusedEvent)return;const element=document.getElementById(`event-${focusedEvent}`);if(element instanceof HTMLDetailsElement){element.open=true;element.scrollIntoView({behavior:'smooth',block:'start'});element.querySelector('summary')?.focus();setFocusedEvent(undefined);}},[filter,focusedEvent]);
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
  const isSunday = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short" }).format(new Date(state.now)) === "Sun";
  const dailyBrief = <PremiumGate key="daily" preview={<BriefPreview events={state.events} now={state.now}/>}><article className="brief-card brief-daily">
            <span className="brief-emoji" aria-hidden="true">☀️ 🎮</span>
            <span className="eyebrow">BEFORE THE BELL</span>
            <h3>Premarket brief</h3>
            <strong>Weekdays · 14:15 Paris</strong>
            <p>
              Check the latest close, support and resistance, and the day’s
              official releases before the bell. Data remains timestamped; a
              stale feed pauses scoring.
            </p>
            <p>
              Latest verified daily close: {dayLabel(state.bars.filter(b=>b.symbol==="QQQ").at(-1)?.date || "") || "awaiting data"}. Today:{" "}
              {state.session.isTradingDay ? "Trading session" : "Market closed"}
              . The next session is {dayLabel(state.session.nextDate)}.
            </p>
          </article></PremiumGate>;
  const weeklyBrief = <WeeklyOutlook key="weekly" events={state.events} bars={state.bars} now={state.now}/>;
  return <LocalizeTree>{(
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
      <DataFreshness state={state} locale="en"/>
      <EventBossQuest events={state.events} now={state.now} onDetails={id=>{setFilter('all');setFocusedEvent(id);}}/>
      <section className="en-card event-brief-hub" data-tour="briefs">
        <span className="eyebrow">PREMARKET & WEEK AHEAD</span>
        <h2>{isSunday ? "🔮 Map your next week’s adventure." : "☀️ Your premarket power-up."}</h2>
        <div className="en-scenarios event-brief-grid">
          {isSunday ? [weeklyBrief, dailyBrief] : [dailyBrief, weeklyBrief]}
        </div>
      </section>
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
  )}</LocalizeTree>;
}
function EventDetail({ event: e, now }: { event: MarketEvent; now: string }) {
  const locale = useLocale();
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
  return <LocalizeTree>{(
    <details className="en-event" id={`event-${e.id}`}>
      <summary>
        <span className="en-event-icon">
          <BossAvatar kind={e.kind}/>
        </span>
        <div>
          <span className="eyebrow">
            {status}
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
          {new Date(e.at).toLocaleDateString(intlLocale(locale), {
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
            : "Verified market consensus."}
          {e.revised !== undefined
            ? ` Revised previous: ${numbers(e.revised)}.`
            : ""}
        </p>
        <EventTakeaway event={e} locale="en"/>
        {!!e.report?.metrics?.length&&<><h4>Official release breakdown</h4>{e.report.metrics.map(metric=><p key={metric.kind}>{metric.kind==="headline-mom"?"Headline CPI · monthly, seasonally adjusted":"Core CPI · year over year"}: {metric.value}{metric.unit}</p>)}</>}
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
            {new Date(e.fetchedAt).toLocaleString(clientLocale(), {
              timeZone: "America/New_York",
            })}{" "}
            ET
          </p>
        )}
      </div>
    </details>
  )}</LocalizeTree>;
}
function Deck({
  state,
  run,
  busy,
  signedIn, trialCards, requireAccount,
}: {
  state: QuestState;
  run: DailyProps["run"];
  busy: boolean;
  signedIn: boolean; trialCards: string[]; requireAccount: DailyProps["requireAccount"];
}) {
  const [theme, setTheme] = useState<Category>(),
    [tab, setTab] = useState<"daily" | "all" | "mastered" | "saved">("daily"),
    [celebrate, setCelebrate] = useState(false),[front,setFront]=useState(false);
  const deck=useDeckCompletion();
  const visit = useRef<string | null>(null);
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
  const choiceOrder = card ? shuffledIndices(card.choices.length, `${state.learningVisitId || state.session.date}:${card.id}:choices`) : [];
  useEffect(()=>setFront(false),[card?.id]);
  const selected = progress?.lastAnswerIndex;
  const {access}=useBilling();
  const blocked = access.status!=="loading" && !access.premium && access.remaining===0 && (!card || (!answered && !access.claimedCards?.includes(card.id)));

  const swipeHandlers = useCardSwipe(answered && !busy && !blocked, action => disposition(action), card?.id);
  async function disposition(action: "master" | "review") {
    if (card && answered) {
      setCelebrate(false);
      const saved=await run({ type: "card", cardId: card.id, action });
      if(saved){const remaining=learningQueue(saved.cards,saved.progress,saved.session.date,tab==='daily'?saved.dailyCardIds:undefined,theme,saved.learningVisitId);deck.finish(card.id,remaining.map(c=>c.id));}
      return !!saved;
    }
  }
  const list = state.cards.filter(
    (c) =>
      (!theme || c.category === theme) &&
      (tab === "mastered"
        ? mastered.has(c.conceptId || c.id)
        : state.progress.find((p) => p.cardId === c.id)?.bookmarked),
  );
  return <LocalizeTree>{(
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
      <InvestmentStyle locale="en" />
      <LearningAllowance/>
      <div className="en-theme-grid">
        {(Object.keys(themes) as Category[]).map((t) => (
          <button
            key={t}
            className={`theme-${t} ${theme === t ? "selected" : ""}`}
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
      {deck.completed ? <DeckVictory count={deck.completed} onContinue={deck.close}/> : tab === "mastered" || tab === "saved" ? (
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
                <KnowledgeExplanation card={c}/>
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
      ) : blocked ? (signedIn ? <PremiumGate feature="learning"/> : <section className="en-card"><span className="eyebrow">KEEP YOUR LEARNING PROGRESS</span><h2>Keep your adventure going.</h2><p>You need an account to save your learning progress. Sign in or create one to continue your adventure.</p><button className="primary" onClick={()=>requireAccount("cards")}>Sign up / sign in to continue</button></section>) : card ? (
        <div className="swipe-deck"><section
          key={card.id}
          className={`en-quiz-card ${answered ? "flipped" : ""}`}
          {...swipeHandlers.handlers}
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
          {answered&&front&&<button type="button" className="text-button quiz-return" onClick={()=>setFront(false)}>Return to explanation ↻</button>}
          {!answered||front ? (
            <>
              <p className="en-question">{card.question}</p>
              <div className="en-choices">
                {choiceOrder.map((originalIndex, i) => (
                  <button
                    key={i}
                    disabled={busy||answered}
                    onClick={async () => {
                      const result = await run({
                        type: "card",
                        cardId: card.id,
                        action: "answer",
                        answerIndex: originalIndex,
                      });
                      if (result && result.cards.find(c=>c.id===card.id)?.answerIndex === originalIndex) setCelebrate(true);
                    }}
                  >
                    <span>{String.fromCharCode(65 + i)}</span>
                    {card.choices[originalIndex]}
                  </button>
                ))}
              </div>
              <p className="muted small-text">
                {front?"Reviewing the question. Your original answer stays saved.":"Choose an answer to unlock the explanation."}
              </p>
            </>
          ) : (
            <div className="en-answer"><button type="button" className="text-button quiz-return" onClick={()=>setFront(true)}>↶ Back to the question</button>
              <span
                className={selected === card.answerIndex ? "positive" : "muted"}
              >
                {selected === card.answerIndex
                  ? "✦ Nice work! +5 XP"
                  : "A new understanding unlocked."}
              </span>
              <h3>
                Correct answer: {String.fromCharCode(65 + choiceOrder.indexOf(card.answerIndex))} ·{" "}
                {card.choices[card.answerIndex]}
              </h3>
              <p>{card.answerExplanation}</p>
              <blockquote>{card.analogy}</blockquote>
              {card.explanation !== card.answerExplanation && (
                <p>{card.explanation}</p>
              )}
              <KnowledgeExplanation card={card}/>{card.asOf && <small>Data as of {card.asOf}</small>}
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
              disabled={!answered || busy || swipeHandlers.pending}
              onClick={() => swipeHandlers.swipe("review")}
            >
              <ArrowLeft size={17} />
              Not yet · review next visit
            </button>
            <button
              className="primary"
              disabled={!answered || busy || swipeHandlers.pending}
              onClick={() => swipeHandlers.swipe("master")}
            >
              Got it · no repeats
              <ArrowRight size={17} />
            </button>
          </div>
        </section></div>
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
  )}</LocalizeTree>;
}
