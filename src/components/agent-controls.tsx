"use client";

import { useState } from "react";
import Link from "next/link";
import { getAgentCopy } from "@/lib/agent-copy";
import type { Locale } from "@/lib/i18n";

type Authorization = { status?: "active" | "paused" | "revoked"; allow_email_outreach?: boolean } | null;
type Profile = Record<string, unknown> | null;
type Gmail = { gmail_address?: string; status?: string; daily_limit?: number } | null;

const list = (value: unknown) => Array.isArray(value) ? value.join(", ") : "";
const split = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export function AgentControls({ initialAuthorization, initialProfile, gmail, locale = "en", showEmailControls = true }: { initialAuthorization: Authorization; initialProfile: Profile; gmail: Gmail; jobs: Array<{ id: string; status: string; required_answers?: Array<{ key?: string; question?: string }> }>; locale?: Locale; showEmailControls?: boolean }) {
  const copy = getAgentCopy(locale);
  const [authorization, setAuthorization] = useState<Authorization>(initialAuthorization);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    targetRoles: list(initialProfile?.target_roles), targetLocations: list(initialProfile?.target_locations), remote: String(initialProfile?.remote_preference ?? "global_remote"), relocation: String(initialProfile?.relocation_preference ?? "depends"), workAuthorization: String((initialProfile?.work_authorization as { summary?: string } | undefined)?.summary ?? ""), contractTypes: list(initialProfile?.contract_types), availableFrom: String(initialProfile?.available_from ?? ""), fullName: String((initialProfile?.confirmed_answers as { full_name?: string } | undefined)?.full_name ?? ""), phone: String((initialProfile?.confirmed_answers as { phone?: string } | undefined)?.phone ?? ""),
  });
  async function save(status: "active" | "paused" | "revoked") {
    setSaving(true); setMessage("");
    try {
    const response = await fetch("/api/agent/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, allowAts: false, allowEmail: status === "active", profile: { target_roles: split(form.targetRoles), target_locations: split(form.targetLocations), remote_preference: form.remote || undefined, relocation_preference: form.relocation || undefined, work_authorization: form.workAuthorization ? { summary: form.workAuthorization } : {}, contract_types: split(form.contractTypes), available_from: form.availableFrom || undefined, confirmed_answers: { full_name: form.fullName, phone: form.phone } } }) });
    const data = await response.json();
    if (response.ok) {
      setAuthorization(data.authorization);
      setMessage(status === "active" ? "SuperCharlie is active. Matching will use these updated preferences." : status === "paused" ? "SuperCharlie is paused." : "Authorization revoked.");
      if (status === "active") {
        window.location.assign("/agent?scan=1");
        return;
      }
    } else setMessage(data.error ?? "Could not save settings");
    } catch { setMessage("The connection was interrupted. Your changes have not been confirmed; please try again."); }
    finally { setSaving(false); }
  }
  return <section className="card mt-8 p-6 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="eyebrow text-[var(--gold-deep)]">SuperCharlie · search preferences</div><h2 className="editorial-title mt-3 text-3xl md:text-4xl">Choose what SuperCharlie looks for</h2><p className="mt-3 max-w-3xl leading-7 text-black/60">Keep your target markets, availability and work authorization up to date. SuperCharlie uses these preferences to find relevant opportunities; platform applications require your final submission. Pause or revoke access at any time.</p></div><span className={`rounded-full px-4 py-2 text-xs font-black uppercase ${authorization?.status === "active" ? "bg-[var(--gold-soft)]" : "bg-black/5"}`}>{authorization?.status ?? "not enabled"}</span></div>
    <div className="mt-7 grid gap-4 md:grid-cols-2">
      <Field label="Offer / outcome directions" value={form.targetRoles} placeholder="e.g. France market-entry support, fractional growth strategy" onChange={(value) => setForm({ ...form, targetRoles: value })}/>
      <Field label="Target buyer markets" value={form.targetLocations} placeholder="Optional · e.g. France, EU, worldwide" onChange={(value) => setForm({ ...form, targetLocations: value })}/>
      <SelectField label="Remote preference" value={form.remote} options={[{ value: "global_remote", label: "Global remote" }, { value: "regional_remote", label: "Remote within my region" }, { value: "hybrid", label: "Hybrid" }, { value: "local", label: "On-site / local" }, { value: "flexible", label: "Flexible — show me the best fit" }]} onChange={(value) => setForm({ ...form, remote: value })}/>
      <SelectField label="Relocation preference" value={form.relocation} options={[{ value: "not_open", label: "Not open to relocation" }, { value: "within_country", label: "Open within my country" }, { value: "international", label: "Open internationally" }, { value: "depends", label: "Depends on the opportunity" }]} onChange={(value) => setForm({ ...form, relocation: value })}/>
      <SelectField label="Work authorization" value={form.workAuthorization} placeholder="Select confirmed status" options={[{ value: "EU / EEA work authorization", label: "EU / EEA authorized" }, { value: "UK work authorization", label: "UK authorized" }, { value: "US work authorization", label: "US authorized" }, { value: "Canada work authorization", label: "Canada authorized" }, { value: "No sponsorship required in target market", label: "No sponsorship required" }, { value: "Requires employer sponsorship", label: "Requires sponsorship" }, { value: "Other confirmed authorization", label: "Other confirmed status" }]} onChange={(value) => setForm({ ...form, workAuthorization: value })}/>
      <label className="text-xs font-black uppercase tracking-[.12em] text-black/55">Available from<input type="date" className="field mt-2 w-full normal-case tracking-normal text-black" value={form.availableFrom} onChange={(event) => setForm({ ...form, availableFrom: event.target.value })}/></label>
      <Field label="Full legal name" value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })}/>
      <Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })}/>
    </div>
    <MultiChoice label="Opportunity types" value={form.contractTypes} options={["Freelance / contract", "Consulting", "Fractional", "Productized service", "Buyer demand"]} onChange={(value) => setForm({ ...form, contractTypes: value })}/>
    <div className="mt-6 flex flex-wrap items-center gap-3"><button disabled={saving} onClick={() => save("active")} className="button">{saving ? "Saving…" : authorization?.status === "active" ? "Update authorization" : "Enable continuous execution"}</button>{authorization?.status === "active" && <button onClick={() => save("paused")} className="button secondary">Pause</button>}{authorization && authorization.status !== "revoked" && <button onClick={() => save("revoked")} className="text-xs font-black underline underline-offset-4">Revoke authorization</button>}<Link href="/agent?setup=intent" className="text-xs font-black underline underline-offset-4">{copy.change}</Link></div>
    {(showEmailControls || gmail) && <details open={gmail?.status === "error" ? true : undefined} className="mt-6 rounded-2xl border border-black/10 p-5">
      <summary className="cursor-pointer font-black">Email connection settings</summary>
      <p className="mt-2 text-sm text-black/55">{gmail?.status === "active" ? `Connected as ${gmail.gmail_address} · every email requires your approval of the visible recipient, subject and message` : gmail?.status === "error" ? "Gmail authorization is unavailable. Reconnect Gmail to resume approved outreach and reply detection." : "Connect Gmail to send one-to-one outreach only after you approve each visible draft, and detect replies only in Agent-created threads."}</p>
      <div className="mt-4">{gmail?.status === "active" ? <button onClick={async () => {
        try {
          const response = await fetch("/api/agent/gmail/disconnect", { method: "POST" });
          if (!response.ok) throw new Error("Gmail could not be disconnected. Please try again.");
          window.location.reload();
        } catch (error) { setMessage(error instanceof Error ? error.message : "Connection failed. Please try again."); }
      }} className="button secondary">Disconnect Gmail</button> : <a className="button" href="/api/agent/gmail/connect">{gmail?.status === "error" ? "Reconnect Gmail" : "Connect Gmail"}</a>}</div>
    </details>}
    {message && <p className="mt-4 text-sm font-bold">{message}</p>}
  </section>;
}

function Field({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange(value: string): void }) { return <label className="text-xs font-black uppercase tracking-[.12em] text-black/55">{label}<input className="field mt-2 w-full normal-case tracking-normal text-black" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)}/></label>; }

function SelectField({ label, value, placeholder, options, onChange }: { label: string; value: string; placeholder?: string; options: Array<{ value: string; label: string }>; onChange(value: string): void }) {
  return <label className="text-xs font-black uppercase tracking-[.12em] text-black/55">{label}<select className="field mt-2 w-full bg-white normal-case tracking-normal text-black" value={value} onChange={(event) => onChange(event.target.value)}>{placeholder && <option value="">{placeholder}</option>}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function MultiChoice({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange(value: string): void }) {
  const selected = new Set(split(value));
  return <fieldset className="mt-5"><legend className="text-xs font-black uppercase tracking-[.12em] text-black/55">{label}</legend><div className="mt-3 flex flex-wrap gap-2">{options.map((option) => { const active = selected.has(option); return <button type="button" key={option} aria-pressed={active} onClick={() => { const next = new Set(selected); if (active) next.delete(option); else next.add(option); onChange([...next].join(", ")); }} className={`rounded-full border px-4 py-2 text-sm font-bold transition ${active ? "border-black bg-black text-white" : "border-black/15 bg-white hover:border-[var(--gold)]"}`}>{option}</button>; })}</div></fieldset>;
}
