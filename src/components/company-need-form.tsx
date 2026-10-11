"use client";
import { Localized } from "@/components/localized";


import { useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { COMPANY_ENGAGEMENT_TYPES, COMPANY_EXPERTISE } from "@/lib/company-need-options";

export function CompanyNeedForm() {
  const [expertise, setExpertise] = useState<string[]>([]);
  const [customExpertise, setCustomExpertise] = useState<string[]>([]);
  const [expertiseDraft, setExpertiseDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
    const form = new FormData(event.currentTarget);
    const remainingDraft = expertiseDraft.trim();
    const addedExpertise = [...customExpertise, ...(remainingDraft ? [remainingDraft] : [])];
    const response = await fetch("/api/company-needs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ need: form.get("need"), successOutcome: form.get("successOutcome"), expertise, expertiseOther: addedExpertise.join(", "), engagementType: form.get("engagementType"), budgetRange: form.get("budgetRange"), locationTimezone: form.get("locationTimezone"), workEmail: form.get("workEmail"), website: form.get("website") }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error ?? "We could not save this request. Please try again."); return; }
    setSubmitted(true);
    } catch { setError("The connection was interrupted. Please try again."); }
    finally { setBusy(false); }
  }

  function addCustomExpertise() {
    const value = expertiseDraft.trim().replace(/,$/, "").trim();
    if (!value || customExpertise.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())) { setExpertiseDraft(""); return; }
    if (customExpertise.length >= 5) { setError("You can add up to five custom capabilities. Remove one before adding another."); return; }
    setCustomExpertise((current) => [...current, value]);
    setExpertiseDraft("");
  }

  function captureExpertise(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    addCustomExpertise();
  }

  if (submitted) return <Localized><div className="card p-7 md:p-10" role="status"><div className="gold-surface grid h-12 w-12 place-items-center rounded-full text-xl">✓</div><h2 className="editorial-title mt-6 text-3xl">Your request is saved.</h2><p className="mt-4 max-w-xl text-lg leading-8 text-black/65">We’ll contact you when someone with the right proven capabilities becomes available.</p><div className="mt-7 rounded-2xl border border-[var(--gold)] bg-[var(--gold-soft)] p-5"><h3 className="font-black">Keep this request connected to your company.</h3><p className="mt-2 text-sm leading-6 text-black/65">Create a free account so you can return securely when we contact you about a match.</p><Link href="/auth?mode=signup&next=/for-companies?submitted=1" className="button mt-5">Create company account <span>→</span></Link></div></div></Localized>;

  return <Localized><form onSubmit={submit} className="card grid gap-7 p-6 md:p-9">
    <label className="font-black">What do you need done?<textarea name="need" required minLength={20} maxLength={3000} className="field mt-2 min-h-36 resize-y font-normal" placeholder="Describe the task or problem." /></label>
    <label className="font-black">What outcome would make this successful?<textarea name="successOutcome" required minLength={10} maxLength={2000} className="field mt-2 min-h-28 resize-y font-normal" placeholder="Describe the result you want to achieve." /></label>
    <fieldset><legend className="font-black">What expertise do you think this requires?</legend><p className="mt-1 text-sm text-black/55">Choose as many as apply, or add your own.</p><div className="mt-4 flex flex-wrap gap-2">{COMPANY_EXPERTISE.map((item) => { const selected = expertise.includes(item); return <button key={item} type="button" aria-pressed={selected} onClick={() => setExpertise((current) => selected ? current.filter((value) => value !== item) : [...current, item])} className={`rounded-full border px-4 py-2 text-sm font-bold ${selected ? "border-black bg-black text-white" : "border-black/15 bg-white"}`}>{item}</button>; })}{customExpertise.map((item) => <button key={item} type="button" aria-label={`Remove ${item}`} onClick={() => setCustomExpertise((current) => current.filter((value) => value !== item))} className="rounded-full border border-[var(--gold)] bg-[var(--gold-soft)] px-4 py-2 text-sm font-bold">{item} <span aria-hidden="true">×</span></button>)}</div><label className="mt-4 block text-sm font-bold">Other expertise</label><div className="mt-2 flex gap-2"><input value={expertiseDraft} onChange={(event) => setExpertiseDraft(event.target.value)} onKeyDown={captureExpertise} onBlur={addCustomExpertise} maxLength={60} className="field font-normal" placeholder="Add another capability or context" /><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={addCustomExpertise} className="rounded-xl border border-black bg-black px-5 text-sm font-black text-white">Add</button></div><p className="mt-2 text-xs text-black/45">Press Enter or comma to add it to the selected group.</p></fieldset>
    <label className="font-black">Working arrangement<select name="engagementType" required defaultValue="" className="field mt-2 font-normal"><option value="" disabled>Select one</option>{COMPANY_ENGAGEMENT_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
    <div className="grid gap-6 md:grid-cols-2"><label className="font-black">Budget / salary range<input name="budgetRange" required maxLength={160} className="field mt-2 font-normal" placeholder="e.g. €3k–€5k or €80k–€100k" /></label><label className="font-black">Location / timezone requirements<input name="locationTimezone" required maxLength={240} className="field mt-2 font-normal" placeholder="e.g. Remote, CET ±2 hours" /></label></div>
    <label className="font-black">Work email<input name="workEmail" required type="email" autoComplete="email" maxLength={320} className="field mt-2 font-normal" placeholder="you@company.com" /></label>
    <label className="sr-only" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
    <div><button disabled={busy} className="button w-full md:w-auto">{busy ? "Saving…" : "Find matching capabilities"} <span>→</span></button><p className="mt-3 text-xs leading-5 text-black/50">Free for now. By submitting, you agree that Monetizable may email you about relevant capability matches.</p></div>
  </form></Localized>;
}
