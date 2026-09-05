"use client";

import { useEffect, useMemo, useState } from "react";

type Job = {
  id: string;
  kind: "email_outreach" | "reply_classification" | string;
  status: string;
  errorCode?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  input?: ActionData;
  result?: ActionData;
};

type ActionData = { company?: string; buyer?: string; source?: string; title?: string; recipient?: string; subject?: string; body?: string; sourceUrl?: string; discoveryUrl?: string; targetUrl?: string; url?: string; provider?: string; screenshotUrls?: string[]; sentAt?: string; submittedAt?: string };

type Radar = {
  scanning: boolean;
  marketSignalsScanned: number;
  capacityMatches: number;
  hotLeads: number;
  platformLeads?: number;
  emailLeads?: number;
  dailyCompleted?: number;
  dailyPending?: number;
  dailyTarget?: number;
};

type Activity = { radar: Radar; jobs: Job[] };

export function AgentProcess({ initialJobs, initialRadar }: { initialJobs: Array<Record<string, unknown>>; initialRadar: Radar }) {
  const [activity, setActivity] = useState<Activity>({
    radar: initialRadar,
    jobs: initialJobs.map((job) => ({
      id: String(job.id ?? ""),
      kind: String(job.kind ?? ""),
      status: String(job.status ?? ""),
      errorCode: job.error_code ? String(job.error_code) : undefined,
      createdAt: job.created_at ? String(job.created_at) : undefined,
      updatedAt: job.updated_at ? String(job.updated_at) : undefined,
      completedAt: job.completed_at ? String(job.completed_at) : undefined,
      input: asActionData(job.input),
      result: asActionData(job.result),
    })),
  });

  const summary = useMemo(() => summarize(activity.jobs), [activity.jobs]);
  const dailyCompleted = activity.radar.dailyCompleted ?? completedToday(activity.jobs);
  const busy = activity.radar.scanning || summary.active > 0 || summary.queued > 0;
  const emailLeadCount = activity.radar.emailLeads ?? 0;
  const hasDirectEmailActivity = emailLeadCount > 0 || dailyCompleted > 0;

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const response = await fetch("/api/agent/activity", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      setActivity(await response.json());
    }
    const timer = window.setInterval(() => void refresh(), busy ? 3_000 : 20_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [busy]);

  const metrics = [
    { label: "Market signals checked", value: activity.radar.marketSignalsScanned, active: activity.radar.scanning || activity.radar.marketSignalsScanned > 0 },
    { label: "Platform opportunities ready", value: activity.radar.platformLeads ?? 0, active: (activity.radar.platformLeads ?? 0) > 0 },
    ...(emailLeadCount > 0
      ? [{ label: "Email leads awaiting approval", value: emailLeadCount, active: true }]
      : dailyCompleted > 0 ? [{ label: "Direct email outreach today", value: dailyCompleted, active: true }] : []),
  ];
  const liveJob = activity.jobs.find((job) => job.kind === "email_outreach" && job.status === "running" && Boolean(job.input?.url ?? job.input?.sourceUrl));
  const liveData = liveJob?.input;
  const liveUrl = liveData?.url ?? liveData?.sourceUrl;

  return <section className="card mt-6 overflow-hidden p-5 md:p-6" aria-live="polite">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="eyebrow text-[var(--gold-deep)]">SuperCharlie process</div><h2 className="mt-2 text-xl font-black">What SuperCharlie is doing</h2></div>
      <span className="flex items-center gap-2 rounded-full bg-black px-3 py-2 text-[.65rem] font-black uppercase tracking-[.12em] text-white"><i className={`h-2 w-2 rounded-full bg-[var(--gold-bright)] ${busy ? "animate-pulse" : ""}`} />{busy ? "Working" : "Watching 24h"}</span>
    </div>
    <div className={`relative mt-5 grid gap-2 ${hasDirectEmailActivity ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      <div className="absolute left-[10%] right-[10%] top-4 hidden h-px bg-black/10 sm:block" />
      {metrics.map((metric) => <div key={metric.label} className="relative min-w-0 rounded-2xl border border-black/10 bg-white p-4">
        <div className={`mb-3 h-3 w-3 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.14)] ${metric.active ? "bg-[var(--gold-bright)]" : "bg-black/15"}`} />
        <div className="break-words text-[.65rem] font-black uppercase tracking-[.1em] text-black/45">{metric.label}</div>
        <div className="mt-1 text-2xl font-black tabular-nums">{metric.value}</div>
      </div>)}
    </div>
    {liveJob && liveData && liveUrl && <div className="mt-4 overflow-hidden rounded-2xl bg-black text-white">
      <div className="flex min-w-0 items-center gap-3 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[var(--gold-bright)]" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/65">{liveUrl}</span>
        <span className="shrink-0 text-[.6rem] font-black uppercase tracking-[.14em] text-[var(--gold-bright)]">Live outreach</span>
      </div>
      <div className="px-4 py-4"><div className="text-[.62rem] font-black uppercase tracking-[.14em] text-[var(--gold-bright)]">Preparing outreach now</div><div className="mt-1 font-black">{liveData.company ?? liveData.buyer ?? liveData.source ?? "Buyer"}</div><div className="mt-1 text-sm text-white/55">{liveData.title}</div></div>
    </div>}
    <p className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${summary.failed ? "bg-amber-50 text-amber-950" : "bg-black/[.035] text-black/62"}`}>{statusLine(activity.radar, summary)}</p>
    {summary.recent.length > 0 && <div className="mt-4 grid gap-2">
      <div className="text-[.65rem] font-black uppercase tracking-[.13em] text-black/45">Recent confirmed actions</div>
      {summary.recent.map((job) => {
        const data = job.result ?? job.input ?? {};
        const company = data.company ?? data.buyer ?? data.source ?? "Opportunity destination";
        const manualHref = data.recipient ? `mailto:${encodeURIComponent(data.recipient)}?subject=${encodeURIComponent(data.subject ?? data.title ?? "Following up")}` : data.sourceUrl;
        return <div key={job.id} className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><strong>Outreach sent · {company}</strong><div className="mt-1 text-xs text-black/50">{data.title}{data.recipient ? ` · ${data.recipient}` : ""}</div></div>
            <div className="flex flex-wrap gap-2">{data.discoveryUrl && <a href={data.discoveryUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-black/15 px-3 py-2 text-xs font-black">View source</a>}{manualHref && <a href={manualHref} target={data.recipient ? undefined : "_blank"} rel={data.recipient ? undefined : "noopener noreferrer"} className="rounded-full border border-black/15 px-3 py-2 text-xs font-black">Contact manually</a>}</div>
          </div>
          {job.status === "sent" && (data.subject || data.body) && <details className="mt-3 rounded-xl bg-black/[.035] px-3 py-2"><summary className="cursor-pointer text-xs font-black">View the exact outreach</summary>{data.subject && <div className="mt-3 text-xs"><span className="font-black">Subject:</span> {data.subject}</div>}{data.body && <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-5 text-black/65">{data.body}</pre>}</details>}
        </div>;
      })}
    </div>}
  </section>;
}

function summarize(jobs: Job[]) {
  const emailJobs = jobs.filter((job) => job.kind === "email_outreach");
  const count = (statuses: string[]) => emailJobs.filter((job) => statuses.includes(job.status)).length;
  return {
    queued: count(["queued"]),
    active: count(["running"]),
    waiting: count(["awaiting_user_answer"]),
    completed: count(["sent"]),
    failed: count(["failed"]),
    skipped: count(["skipped"]),
    latest: emailJobs[0],
    recent: emailJobs.filter((job) => job.status === "sent").slice(0, 20),
  };
}

function asActionData(value: unknown): ActionData | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ActionData : undefined;
}

function completedToday(jobs: Job[]) {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  return new Set(jobs.filter((job) => job.kind === "email_outreach" && job.status === "sent" && new Date(job.completedAt ?? job.updatedAt ?? 0).getTime() >= startToday.getTime()).map((job) => job.id)).size;
}

function statusLine(radar: Radar, summary: ReturnType<typeof summarize>) {
  if (summary.active) return `SuperCharlie is preparing ${summary.active} personalized email${summary.active === 1 ? "" : "s"} now.`;
  if (summary.queued) return `${summary.queued} new buyer contact${summary.queued === 1 ? " is" : "s are"} queued for outreach.`;
  if (summary.waiting) return `${summary.waiting} older action${summary.waiting === 1 ? " is" : "s are"} being retired; new destinations that need extra facts are skipped automatically.`;
  if (summary.failed) return `${summary.failed} email outreach attempt${summary.failed === 1 ? " needs" : "s need"} retry; nothing is counted until Gmail confirms sending.`;
  if (summary.completed) return `${summary.completed} personalized outreach email${summary.completed === 1 ? " has" : "s have"} been sent. ${radar.platformLeads ?? 0} platform opportunit${(radar.platformLeads ?? 0) === 1 ? "y is" : "ies are"} ready for you to review and submit.`;
  if (radar.scanning) return "SuperCharlie is scanning public market signals and removing noise now.";
  if ((radar.platformLeads ?? 0) > 0 && (radar.emailLeads ?? 0) > 0) return `SuperCharlie found ${radar.platformLeads} platform opportunities for you to review and submit, plus ${radar.emailLeads} verified email lead${radar.emailLeads === 1 ? "" : "s"} awaiting your draft approval.`;
  if ((radar.platformLeads ?? 0) > 0) return `SuperCharlie found ${radar.platformLeads} platform opportunit${radar.platformLeads === 1 ? "y" : "ies"}. Review the strongest matches, complete the ATS form, and submit the final application yourself.`;
  if ((radar.emailLeads ?? 0) > 0) return `SuperCharlie found ${radar.emailLeads} verified email lead${radar.emailLeads === 1 ? "" : "s"}. Review and approve each exact draft before it sends.`;
  return "SuperCharlie is watching the market and will surface only traceable actions.";
}
