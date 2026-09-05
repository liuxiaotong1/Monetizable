"use client";

import { useEffect, useMemo, useState } from "react";
import { trackClient } from "@/lib/client-analytics";
import { isDirectApplicationDestination } from "@/lib/opportunity-execution-guard";
import { safeOpportunityDescription } from "@/lib/opportunity-text";

interface FeedOpportunity {
  id: string; title: string; source: string; source_url?: string; kind: string; buyer?: string; posted_at?: string; compensation?: string; location?: string; remote_status?: string; summary: string; required_skills: string[]; public_signals: string[]; evidence_urls: string[]; suggested_offer?: string; opportunity_signatures?: OpportunitySignature | OpportunitySignature[];
}
interface FeedMatch { id: string; combination_index: number; fit_label: string; fit_reason: string; score: number; status: string; created_at: string; deep_analysis?: { whyNow?: string; action?: string; risk?: string }; market_opportunities: FeedOpportunity | FeedOpportunity[] }
interface OpportunitySignature { contact_method?: "ats" | "public_email" | "application_link"; contact_value?: string }
interface AgentJob {
  id: string;
  opportunity_match_id?: string;
  kind: string;
  status: string;
  required_answers?: Array<{ question?: string }>;
  error_code?: string;
  error_message?: string;
  input?: ActionData;
  result?: ActionData;
}
interface ActionData { company?: string; buyer?: string; source?: string; title?: string; recipient?: string; subject?: string; body?: string; sourceUrl?: string; sentAt?: string; submittedAt?: string }
interface OutreachDraft { id: string; recipient?: string; subject: string; body: string; status?: string }

function opportunityFor(match: FeedMatch) { return Array.isArray(match.market_opportunities) ? match.market_opportunities[0] : match.market_opportunities; }
function signatureFor(opportunity: FeedOpportunity) { return Array.isArray(opportunity.opportunity_signatures) ? opportunity.opportunity_signatures[0] : opportunity.opportunity_signatures; }
function channelFor(match: FeedMatch): "email" | "platform" | "monitoring" {
  const opportunity = opportunityFor(match);
  const method = signatureFor(opportunity)?.contact_method;
  if (method === "public_email" && isDirectApplicationDestination(method, opportunity?.source_url)) return "email";
  if (method === "application_link" && /^https?:\/\//i.test(opportunity?.source_url ?? "")) return "platform";
  return "monitoring";
}

export function AgentFeed({ initialMatches, initialJobs, combinationLabels, scanning = false }: { initialMatches: FeedMatch[]; initialJobs: Array<Record<string, unknown>>; combinationLabels: string[]; scanning?: boolean }) {
  const [statusOverrides, setStatusOverrides] = useState<Record<string, FeedMatch["status"]>>({});
  const [currentTime] = useState(() => Date.now());
  const [kind, setKind] = useState("all");
  const [combination, setCombination] = useState("all");
  const [freshness, setFreshness] = useState("all");
  const [scope, setScope] = useState<"matches" | "platform" | "email" | null>("matches");
  const [jobs, setJobs] = useState<AgentJob[]>(() => normalizeJobs(initialJobs));
  const [sourceMatches, setSourceMatches] = useState<FeedMatch[]>(initialMatches);
  const [drafts, setDrafts] = useState<Record<string, OutreachDraft>>({});
  const [draftBusy, setDraftBusy] = useState<Record<string, boolean>>({});
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const matches = useMemo(() => sourceMatches.map((match) => statusOverrides[match.id] ? { ...match, status: statusOverrides[match.id] } : match), [sourceMatches, statusOverrides]);
  const currentMatches = useMemo(() => matches.filter((match) => match.status !== "dismissed"), [matches]);
  const platformCount = useMemo(() => currentMatches.filter((match) => ["Strong fit", "Good fit"].includes(match.fit_label) && channelFor(match) === "platform").length, [currentMatches]);
  const emailCount = useMemo(() => currentMatches.filter((match) => ["Strong fit", "Good fit"].includes(match.fit_label) && channelFor(match) === "email").length, [currentMatches]);
  useEffect(() => setSourceMatches(initialMatches), [initialMatches]);
  useEffect(() => {
    const open = (event: Event) => {
      const next = (event as CustomEvent<{ scope?: "matches" | "platform" | "email" }>).detail?.scope ?? "matches";
      setScope(next);
      window.requestAnimationFrame(() => document.getElementById("agent-opportunities")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    window.addEventListener("agent:open-opportunities", open);
    return () => window.removeEventListener("agent:open-opportunities", open);
  }, []);
  const visible = useMemo(() => matches.filter((match) => {
    const opportunity = opportunityFor(match);
    const seenAt = new Date(opportunity?.posted_at ?? match.created_at).getTime();
    const withinFreshness = freshness === "all" || (Number.isFinite(seenAt) && seenAt >= currentTime - Number(freshness) * 86_400_000);
    const actionableFit = ["Strong fit", "Good fit"].includes(match.fit_label);
    const channel = channelFor(match);
    const fitsScope = scope === "matches"
      || (scope === "platform" && actionableFit && channel === "platform")
      || (scope === "email" && actionableFit && channel === "email");
    return match.status !== "dismissed"
      && (kind === "all" || opportunity?.kind === kind)
      && (combination === "all" || match.combination_index === Number(combination))
      && fitsScope
      && withinFreshness;
  }).sort((a, b) => b.score - a.score), [matches, kind, combination, freshness, currentTime, scope]);
  async function setStatus(matchId: string, status: "new" | "saved" | "dismissed") {
    const response = await fetch(`/api/agent/matches/${matchId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) setStatusOverrides((current) => ({ ...current, [matchId]: status }));
  }
  async function prepareDraft(matchId: string) {
    setDraftBusy((current) => ({ ...current, [matchId]: true }));
    setDraftErrors((current) => ({ ...current, [matchId]: "" }));
    try {
      const response = await fetch("/api/agent/outreach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ matchId }) });
      const data = await response.json();
      if (!response.ok || !data.draft?.id) throw new Error(data.error ?? "Could not prepare the email draft");
      setDrafts((current) => ({ ...current, [matchId]: data.draft as OutreachDraft }));
    } catch (error) {
      setDraftErrors((current) => ({ ...current, [matchId]: error instanceof Error ? error.message : "Could not prepare the email draft" }));
    } finally { setDraftBusy((current) => ({ ...current, [matchId]: false })); }
  }
  function updateDraft(matchId: string, field: "recipient" | "subject" | "body", value: string) {
    setDrafts((current) => ({ ...current, [matchId]: { ...current[matchId], [field]: value } }));
  }
  async function approveDraft(matchId: string) {
    const draft = drafts[matchId];
    if (!draft) return;
    setDraftBusy((current) => ({ ...current, [matchId]: true }));
    setDraftErrors((current) => ({ ...current, [matchId]: "" }));
    try {
      const response = await fetch(`/api/agent/outreach/${draft.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "send", recipient: draft.recipient, subject: draft.subject, body: draft.body }) });
      const data = await response.json();
      if (!response.ok || !data.job?.id) throw new Error(data.error ?? "Could not approve this email");
      setJobs((current) => [{ ...data.job, opportunity_match_id: matchId, kind: "email_outreach" } as AgentJob, ...current.filter((job) => job.id !== data.job.id)]);
      setDrafts((current) => ({ ...current, [matchId]: { ...draft, status: "approved" } }));
    } catch (error) {
      setDraftErrors((current) => ({ ...current, [matchId]: error instanceof Error ? error.message : "Could not approve this email" }));
    } finally { setDraftBusy((current) => ({ ...current, [matchId]: false })); }
  }
  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    async function refreshActivity() {
      const response = await fetch("/api/agent/activity", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const data = await response.json();
      setJobs(normalizeJobs(data.jobs ?? []));
      if (Array.isArray(data.matches)) setSourceMatches(data.matches as FeedMatch[]);
    }
    void refreshActivity();
    const timer = window.setInterval(() => void refreshActivity(), 8_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [scope]);
  const kinds = [...new Set(matches.map((match) => opportunityFor(match)?.kind).filter(Boolean))];
  const scopeTitle = scope === "platform" ? "Platform applications"
    : scope === "email" ? "Direct email outreach"
      : "Capacity matches";
  const scopeSummary = scope === "platform"
    ? `SuperCharlie found ${visible.length} platform opportunit${visible.length === 1 ? "y" : "ies"}. Review the match evidence, open the ATS page, and submit the final application yourself.`
    : scope === "email"
      ? `${visible.length} verified direct-email lead${visible.length === 1 ? " is" : "s are"} ready for your review. SuperCharlie sends only after you approve the exact draft.`
      : `SuperCharlie found ${visible.length} current match${visible.length === 1 ? "" : "es"}.${emailCount > 0 ? ` ${platformCount} require your final platform submission; ${emailCount} have verified email contacts and require your approval before sending.` : " Review the strongest options and submit the platform applications you want to pursue."}`;
  const latestJobByMatch = useMemo(() => {
    const mapped = new Map<string, AgentJob>();
    for (const job of jobs) if (job.opportunity_match_id && !mapped.has(job.opportunity_match_id)) mapped.set(job.opportunity_match_id, job);
    return mapped;
  }, [jobs]);
  return <section id="agent-opportunities" className="scroll-mt-6">
    {scope && <div className="card mt-8 flex flex-wrap items-center justify-between gap-4 border-[var(--gold)]/35 bg-[var(--gold-soft)]/25 p-5"><div><div className="eyebrow text-[var(--gold-deep)]">{scopeTitle}</div><p className="mt-2 max-w-3xl text-sm leading-6 text-black/62">{scopeSummary}</p></div><button type="button" onClick={() => setScope(null)} className="rounded-full border border-black/15 px-4 py-2 text-xs font-black">Close results</button></div>}
    {!scope && <div className="card mt-8 p-6 md:p-8"><div className="eyebrow text-[var(--gold-deep)]">Opportunities found</div><h2 className="editorial-title mt-3 text-2xl md:text-3xl">SuperCharlie found {currentMatches.length} opportunities for you</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-black/60">Start with the strongest matches. For platform opportunities, SuperCharlie provides the fit evidence and takes you to the ATS; you review the required fields and submit the final application yourself.</p><div className="mt-5 flex flex-wrap gap-3">{platformCount > 0 && <button type="button" onClick={() => setScope("platform")} className="button">Review {platformCount} platform opportunit{platformCount === 1 ? "y" : "ies"} →</button>}{emailCount > 0 && <button type="button" onClick={() => setScope("email")} className="button secondary">Review {emailCount} direct email lead{emailCount === 1 ? "" : "s"}</button>}</div></div>}
    {scope && <>
    <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
      <div className="grid gap-3"><div className="flex flex-wrap gap-2"><button onClick={() => setKind("all")} className={`rounded-full border px-4 py-2 text-xs font-black ${kind === "all" ? "bg-black text-white" : "border-black/15"}`}>All types</button>{kinds.map((value) => <button key={value} onClick={() => setKind(value!)} className={`rounded-full border px-4 py-2 text-xs font-black capitalize ${kind === value ? "bg-black text-white" : "border-black/15"}`}>{value!.replaceAll("_", " ")}</button>)}</div><div className="flex flex-wrap gap-2"><select aria-label="Skill combination" value={combination} onChange={(event) => setCombination(event.target.value)} className="rounded-full border border-black/15 bg-white px-4 py-2 text-xs font-black"><option value="all">All combinations</option>{combinationLabels.map((label, index) => <option key={label} value={String(index)}>{label}</option>)}</select><select aria-label="Freshness" value={freshness} onChange={(event) => setFreshness(event.target.value)} className="rounded-full border border-black/15 bg-white px-4 py-2 text-xs font-black"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All current</option></select></div></div>
    </div>
    <div className="mt-8 grid gap-5">
      {visible.map((match) => {
        const opportunity = opportunityFor(match); if (!opportunity) return null;
        const description = safeOpportunityDescription(opportunity.summary);
        return <article key={match.id} className="card p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-[var(--gold-soft)] px-3 py-1 text-[.7rem] font-black">{match.fit_label}</span><span className="rounded-full bg-black/5 px-3 py-1 text-[.7rem] font-black capitalize">{opportunity.kind.replaceAll("_", " ")}</span>{combinationLabels[match.combination_index] && <span className="rounded-full border border-[var(--gold)]/40 px-3 py-1 text-[.7rem] font-black">{combinationLabels[match.combination_index]}</span>}</div><h2 className="editorial-title mt-4 text-2xl leading-tight md:text-3xl">{opportunity.title}</h2><p className="mt-2 text-sm font-bold text-black/45">{opportunity.source}{opportunity.location ? ` · ${opportunity.location}` : ""}{opportunity.compensation ? ` · ${opportunity.compensation}` : ""}</p></div><div className="flex gap-2"><button onClick={() => setStatus(match.id, match.status === "saved" ? "new" : "saved")} className="rounded-full border border-black/15 px-3 py-2 text-xs font-black">{match.status === "saved" ? "Saved" : "Save"}</button><button onClick={() => setStatus(match.id, "dismissed")} className="rounded-full border border-black/15 px-3 py-2 text-xs font-black">Dismiss</button></div></div>
          {description && <p className="mt-5 max-w-4xl leading-7 text-black/62">{description}</p>}
          <div className="mt-6 rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold-soft)]/30 p-5"><div className="eyebrow text-[var(--gold-deep)]">Why this matches now</div><p className="mt-3 leading-7">{match.fit_reason}</p>{match.deep_analysis?.whyNow && <p className="mt-3 text-sm leading-6 text-black/65">{match.deep_analysis.whyNow}</p>}{match.deep_analysis?.risk && <p className="mt-3 text-xs leading-5 text-black/50">Check first: {match.deep_analysis.risk}</p>}</div>
          <OpportunityExecutionStatus match={match} opportunity={opportunity} job={latestJobByMatch.get(match.id)} draft={drafts[match.id]} busy={Boolean(draftBusy[match.id])} error={draftErrors[match.id]} onPrepare={() => prepareDraft(match.id)} onDraftChange={(field, value) => updateDraft(match.id, field, value)} onApprove={() => approveDraft(match.id)} />
        </article>;
      })}
      {!visible.length && <div className="card p-8"><h2 className="text-xl font-black">{scanning && matches.length === 0 ? "Your first market scan is in progress" : "No opportunities in this selected view"}</h2><p className="mt-3 text-black/60">{scanning && matches.length === 0 ? "SuperCharlie is searching and ranking live opportunities against your Capacity Graph now." : "Clear a filter or choose another radar metric to view the current results."}</p></div>}
    </div>
    </>}
  </section>;
}

function OpportunityExecutionStatus({ match, opportunity, job, draft, busy, error, onPrepare, onDraftChange, onApprove }: { match: FeedMatch; opportunity: FeedOpportunity; job?: AgentJob; draft?: OutreachDraft; busy: boolean; error?: string; onPrepare: () => void; onDraftChange: (field: "recipient" | "subject" | "body", value: string) => void; onApprove: () => void }) {
  const channel = channelFor(match);
  if (channel === "platform") return <div className="mt-6 w-full rounded-2xl border border-black/10 bg-black/[.035] p-5">
    <div className="eyebrow text-black/55">Ready to apply · you submit</div>
    <p className="mt-3 text-sm font-black">SuperCharlie found and matched this opportunity for you. The platform requires you to complete and submit its ATS form.</p>
    <p className="mt-2 text-sm leading-6 text-black/60">Use SuperCharlie’s match reason and evidence above to fill the application. Review the platform’s required fields, then submit it yourself.</p>
    {opportunity.source_url && <a href={opportunity.source_url} target="_blank" rel="noopener noreferrer" onClick={() => trackClient("hot_lead_opened", { matchId: match.id, channel: "platform" })} className="button mt-4">Try this application ↗</a>}
  </div>;
  if (channel !== "email") return <div className="mt-6"><span className="self-center rounded-full bg-black/[.04] px-4 py-3 text-xs font-black text-black/50">Monitoring this signal</span></div>;
  const recipient = signatureFor(opportunity)?.contact_value;
  return <div className="mt-6 w-full rounded-2xl border border-[var(--gold)]/35 bg-[var(--gold-soft)]/20 p-5">
    <div className="eyebrow text-[var(--gold-deep)]">Direct email outreach · Your approval required</div>
    {recipient && <p className="mt-2 text-sm text-black/60">Verified professional contact: <strong className="text-black">{recipient}</strong></p>}
    <div className="mt-4 flex flex-wrap gap-3">{opportunity.source_url && <a href={opportunity.source_url} target="_blank" rel="noopener noreferrer" onClick={() => trackClient("hot_lead_opened", { matchId: match.id, channel: "email" })} className="button secondary">View public signal ↗</a>}<EmailApprovalStatus job={job} draft={draft} busy={busy} recipient={recipient} error={error} onPrepare={onPrepare} onDraftChange={onDraftChange} onApprove={onApprove} /></div>
  </div>;
}

function EmailApprovalStatus({ job, draft, busy, recipient, error, onPrepare, onDraftChange, onApprove }: { job?: AgentJob; draft?: OutreachDraft; busy: boolean; recipient?: string; error?: string; onPrepare: () => void; onDraftChange: (field: "recipient" | "subject" | "body", value: string) => void; onApprove: () => void }) {
  if (!job && !draft) return <div className="rounded-xl border border-[var(--gold)]/35 bg-white/70 px-4 py-3 text-sm"><strong>Verified email lead found</strong><div className="mt-1 text-xs text-black/55">No email will be sent until you review and approve its draft.{recipient ? ` Recipient: ${recipient}` : ""}</div><button type="button" disabled={busy} onClick={onPrepare} className="button mt-3">{busy ? "Preparing draft…" : "Review email draft"}</button>{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}</div>;
  if (!job && draft) return <div className="w-full rounded-2xl border border-[var(--gold)]/35 bg-white/80 p-4"><div className="text-xs font-black uppercase tracking-wider text-[var(--gold-deep)]">Review before sending</div><label className="mt-3 block text-xs font-black">To<input className="field mt-1" value={draft.recipient ?? ""} onChange={(event) => onDraftChange("recipient", event.target.value)} /></label><label className="mt-3 block text-xs font-black">Subject<input className="field mt-1" value={draft.subject} onChange={(event) => onDraftChange("subject", event.target.value)} /></label><label className="mt-3 block text-xs font-black">Message<textarea className="field mt-1 min-h-40 resize-y" value={draft.body} onChange={(event) => onDraftChange("body", event.target.value)} /></label><p className="mt-3 text-xs leading-5 text-black/55">Clicking below approves this exact recipient, subject and message for one send.</p><button type="button" disabled={busy || !draft.recipient || !draft.subject || !draft.body} onClick={onApprove} className="button mt-3">{busy ? "Approving…" : "Approve & send this email"}</button>{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}</div>;
  if (!job) return null;
  const questions = job.required_answers?.map((item) => item.question).filter(Boolean) ?? [];
  const success = job.status === "sent";
  const message = job.status === "queued" ? "Approved by you · queued for sending"
    : job.status === "running" ? "Approved by you · sending now…"
      : job.status === "sent" ? "Outreach sent ✓"
          : job.status === "awaiting_user_answer" ? `One confirmed fact is needed${questions.length ? `: ${questions.join("; ")}` : ""}`
            : job.status === "skipped" ? "Needs your help: this destination requires a protected step"
              : job.status === "failed" ? `Automatic action needs attention${job.error_message ? `: ${job.error_message}` : ""}`
                : "SuperCharlie is monitoring this opportunity";
  const data = job.result ?? job.input;
  const company = data?.company ?? data?.buyer ?? data?.source;
  const manualHref = data?.recipient ? `mailto:${encodeURIComponent(data.recipient)}?subject=${encodeURIComponent(data.subject ?? data.title ?? "Following up")}&body=${encodeURIComponent(data.body ?? "")}` : data?.sourceUrl;
  if (success) return <div role="status" className="w-full rounded-2xl border border-emerald-600/25 bg-emerald-50 p-4 text-emerald-950">
    <p className="text-sm font-black">{message}{company ? ` · ${company}` : ""}</p>
    {data?.recipient && <p className="mt-1 text-xs text-emerald-950/65">To {data.recipient}{data.sentAt ? ` · ${new Date(data.sentAt).toLocaleString()}` : ""}</p>}
    {data?.subject && <div className="mt-3 rounded-xl bg-white/75 p-3"><div className="text-[.62rem] font-black uppercase tracking-[.12em] text-black/40">Message sent</div><p className="mt-2 text-sm font-black">{data.subject}</p>{data.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-black/65">{data.body}</p>}</div>}
    {manualHref && <a href={manualHref} target={data?.recipient ? undefined : "_blank"} rel={data?.recipient ? undefined : "noopener noreferrer"} className="mt-3 inline-flex rounded-full border border-emerald-900/20 bg-white px-4 py-2 text-xs font-black">Contact manually</a>}
  </div>;
  return <p role="status" className="rounded-xl border border-[var(--gold)]/40 bg-[var(--gold-soft)]/40 px-4 py-3 text-sm font-bold">{message}</p>;
}

function normalizeJobs(rows: Array<Record<string, unknown>>): AgentJob[] {
  return rows.map((job) => ({
    id: String(job.id ?? ""),
    opportunity_match_id: job.opportunity_match_id ? String(job.opportunity_match_id) : undefined,
    kind: String(job.kind ?? ""),
    status: String(job.status ?? ""),
    required_answers: Array.isArray(job.required_answers ?? job.requiredAnswers) ? (job.required_answers ?? job.requiredAnswers) as Array<{ question?: string }> : undefined,
    error_code: job.error_code || job.errorCode ? String(job.error_code ?? job.errorCode) : undefined,
    error_message: job.error_message || job.errorMessage ? String(job.error_message ?? job.errorMessage) : undefined,
    input: asActionData(job.input),
    result: asActionData(job.result),
  }));
}

function asActionData(value: unknown): ActionData | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ActionData : undefined;
}
