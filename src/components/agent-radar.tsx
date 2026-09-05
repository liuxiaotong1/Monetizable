"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAgentCopy } from "@/lib/agent-copy";
import type { Locale } from "@/lib/i18n";

export interface AgentRadarStats {
  scanning: boolean;
  hasScanned: boolean;
  marketSignalsScanned: number;
  eligibleAfterHardFilters: number;
  capacityMatches: number;
  strongOpportunities: number;
  hotLeads: number;
  platformLeads: number;
  emailLeads: number;
  opportunityTypeBreakdown: Record<string, number>;
  filteredOutReasons: Record<string, number>;
  lastCompletedAt?: string | null;
}

export function AgentRadar({ initialStats, locale = "en", startImmediately = false, analysisHref }: { initialStats: AgentRadarStats; locale?: Locale; startImmediately?: boolean; analysisHref?: string }) {
  const copy = getAgentCopy(locale);
  const router = useRouter();
  const startedRef = useRef(false);
  const [stats, setStats] = useState(initialStats);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(!initialStats.hasScanned || startImmediately);
  const completedAtRef = useRef(initialStats.lastCompletedAt ?? null);
  const needsRecovery = stats.hasScanned && stats.marketSignalsScanned === 0;
  const active = starting || stats.scanning;

  const openOpportunities = useCallback((scope: "matches" | "platform" | "email") => {
    window.dispatchEvent(new CustomEvent("agent:open-opportunities", { detail: { scope } }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
      const response = await fetch("/api/agent/radar", { cache: "no-store" });
      if (response.ok && !cancelled) {
        const next = await response.json();
        setStats(next);
        const completedAt = next.lastCompletedAt ?? null;
        if (completedAt && completedAt !== completedAtRef.current) {
          completedAtRef.current = completedAt;
          router.refresh();
        }
      }
      } catch { /* Keep the last confirmed snapshot; the next poll retries. */ }
    }
    async function start() {
      if ((!startImmediately && !needsRecovery && stats.hasScanned) || stats.scanning || startedRef.current) return;
      startedRef.current = true;
      setStarting(true);
      setError("");
      try {
        const response = await fetch(startImmediately || needsRecovery ? "/api/agent/radar?force=1" : "/api/agent/radar", { method: "POST" });
        if (!response.ok) throw new Error("The scan could not start. Please reload to try again.");
        if (!cancelled) {
          setStats(await response.json());
          if (startImmediately) router.replace("/agent", { scroll: false });
          else router.refresh();
        }
      } catch {
        if (!cancelled) setError("The scan could not start. Please reload to try again.");
      } finally {
        if (!cancelled) setStarting(false);
      }
    }
    void start();
    const timer = window.setInterval(() => void refresh(), active ? 5_000 : 60_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [active, needsRecovery, router, startImmediately, stats.hasScanned, stats.scanning]);

  const types = [
    ["Freelance / contract", stats.opportunityTypeBreakdown.freelance_contract ?? 0],
    ["Consulting / fractional", (stats.opportunityTypeBreakdown.consulting ?? 0) + (stats.opportunityTypeBreakdown.fractional ?? 0)],
    ["Buyer demand", (stats.opportunityTypeBreakdown.latent_buyer_demand ?? 0) + (stats.opportunityTypeBreakdown.productized_service ?? 0)],
  ] as const;
  const reasons = [
    ["Location", stats.filteredOutReasons.location ?? 0],
    ["Expired", stats.filteredOutReasons.expired ?? 0],
    ["Duplicate", stats.filteredOutReasons.duplicate ?? 0],
    ["Low fit", stats.filteredOutReasons.low_fit ?? 0],
  ] as const;
  const foundTitle = stats.capacityMatches > 0
    ? `SuperCharlie found ${compact(stats.capacityMatches)} opportunities for you`
    : copy.radarWorking;
  const resultSummary = stats.platformLeads > 0
    ? `${compact(stats.platformLeads)} open on external platforms and require your final submission. SuperCharlie has already ranked the fit—start with the strongest matches and try an application.`
    : copy.radarBody;
  const metricColumns = stats.emailLeads > 0 ? "xl:grid-cols-4" : "xl:grid-cols-3";
  return <section className="mt-8 overflow-hidden rounded-[2rem] border border-black/10 bg-black text-white shadow-[0_28px_80px_rgba(0,0,0,.12)]">
    <div className="grid lg:grid-cols-[.78fr_1.22fr]">
      <div className="relative grid min-h-80 place-items-center overflow-hidden border-white/10 p-8 lg:border-r">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
        <div className="relative grid h-64 w-64 place-items-center" aria-label={active ? "Market scan in progress" : "Market radar active"}>
          {["h-64 w-64 border-white/15", "h-48 w-48 border-white/10", "h-32 w-32 border-white/10"].map((classes) => <span key={classes} className={`absolute rounded-full border ${classes}`} />)}
          <span className={`absolute h-32 w-32 origin-bottom-left translate-x-16 -translate-y-16 bg-[conic-gradient(from_0deg,rgba(238,185,62,.42),transparent_32%)] ${active ? "animate-[spin_2.8s_linear_infinite]" : "animate-[spin_7s_linear_infinite]"}`} />
          <span className="absolute h-3 w-3 rounded-full bg-[var(--gold-bright)] shadow-[0_0_28px_8px_rgba(238,185,62,.6)]" />
          {[[32, 44], [71, 28], [76, 67], [25, 72], [54, 82]].map(([left, top], index) => <span key={index} className={`absolute h-2 w-2 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,.7)] ${active ? "animate-pulse" : ""}`} style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${index * 180}ms` }} />)}
        </div>
        <div className="absolute bottom-7 left-8 right-8 flex items-center justify-between text-[.68rem] font-black uppercase tracking-[.18em] text-white/55"><span>{active ? "Scanning live demand" : "Market radar active"}</span><span className="flex items-center gap-2"><i className={`h-2 w-2 rounded-full bg-[var(--gold-bright)] ${active ? "animate-pulse" : ""}`} />24h cycle</span></div>
      </div>
      <div className="p-7 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="eyebrow text-[var(--gold-bright)]">{copy.radar}</div>
          {analysisHref && <a href={analysisHref} className="rounded-full border border-white/20 px-4 py-2 text-xs font-black text-white transition hover:bg-white hover:text-black">← Back to my analysis</a>}
        </div>
        <h2 className="editorial-title mt-4 max-w-2xl text-3xl leading-tight text-white md:text-5xl">{stats.capacityMatches > 0 ? foundTitle : active ? copy.radarScanning : foundTitle}</h2>
        <p className="mt-4 max-w-2xl leading-7 text-white/62">{resultSummary}</p>
        {error && <p role="alert" className="mt-3 text-sm text-[var(--gold-bright)]">{error}</p>}
        {stats.capacityMatches > 0 && <button type="button" onClick={() => openOpportunities(stats.platformLeads > 0 ? "platform" : "matches")} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--gold-bright)] px-6 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-white">Review the best opportunities →</button>}
        <div className={`mt-8 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 ${metricColumns}`}>
          <Metric label={copy.signals} value={active && !stats.marketSignalsScanned ? "Scanning…" : compact(stats.marketSignalsScanned)} />
          <Metric label={copy.matches} value={active && !stats.capacityMatches ? "Matching…" : compact(stats.capacityMatches)} onClick={() => openOpportunities("matches")} />
          <Metric label={copy.platformLeads} value={compact(stats.platformLeads)} onClick={() => openOpportunities("platform")} />
          {stats.emailLeads > 0 && <Metric label={copy.emailLeads} value={compact(stats.emailLeads)} accent onClick={() => openOpportunities("email")} />}
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Breakdown title={copy.types} items={types} />
          <Breakdown title={copy.noise} items={reasons} />
        </div>
        <p className="mt-5 text-xs leading-5 text-white/42">Every number comes from this Agent pipeline. One public signal is counted once per scan; filtered or duplicate results never inflate Capacity matches.</p>
      </div>
    </div>
  </section>;
}

function Metric({ label, value, accent = false, onClick }: { label: string; value: string; accent?: boolean; onClick?: () => void }) {
  const className = "min-w-0 bg-black p-5 text-left " + (onClick ? "cursor-pointer transition hover:bg-white/[.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold-bright)]" : "");
  const content = <><div className="max-w-full overflow-hidden text-[.62rem] font-black uppercase leading-4 tracking-[.13em] text-white/48 [overflow-wrap:anywhere]">{label}</div><div className={`mt-3 truncate text-2xl font-black md:text-3xl ${accent ? "text-[var(--gold-bright)]" : "text-white"}`}>{value}</div>{onClick && <div className="mt-2 text-[.6rem] font-bold text-white/38">View opportunities →</div>}</>;
  return onClick ? <button type="button" onClick={onClick} className={className}>{content}</button> : <div className={className}>{content}</div>;
}

function Breakdown({ title, items }: { title: string; items: ReadonlyArray<readonly [string, number]> }) {
  return <div className="rounded-2xl border border-white/10 p-5"><div className="text-[.65rem] font-black uppercase tracking-[.16em] text-white/48">{title}</div><div className="mt-4 flex flex-wrap gap-2">{items.map(([label, value]) => <span key={label} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-white/68"><strong className="mr-1 text-white">{compact(value)}</strong>{label}</span>)}</div></div>;
}

function compact(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return new Intl.NumberFormat("en", { notation: value >= 1_000 ? "compact" : "standard", maximumFractionDigits: value >= 1_000 ? 1 : 0 }).format(value);
}
