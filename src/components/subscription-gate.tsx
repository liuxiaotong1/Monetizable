"use client";
import { Localized } from "@/components/localized";

import { useState } from "react";
export function SubscriptionGate({analysisId, monthlyPrice, weeklyPrice, savings, fourWeeksPrice, value}:{analysisId:string; monthlyPrice:string; weeklyPrice:string; savings?:string; fourWeeksPrice:string; value:{title:string;range?:string;basis:string;label:string;sourceUrl?:string}}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function checkout(billingInterval:"week"|"month") {
    setBusy(true); setError("");
    try {
      const r=await fetch("/api/subscription/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({analysisId,billingInterval})});
      const data=await r.json(); if(!r.ok) throw new Error(data.error);
      window.location.assign(data.url);
    } catch(e) { setError(e instanceof Error?e.message:"Checkout unavailable"); setBusy(false); }
  }
  return <Localized><section className="shell card my-8 max-w-4xl p-6 md:p-10">
    <div className="eyebrow">SuperCharlie subscription</div>
    <h1 className="display mt-4 text-3xl md:text-5xl">Put your expertise in front of real opportunities.</h1>
    <div className="mt-6 rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold-soft)]/40 p-5 md:p-6">
      <div className="eyebrow text-[var(--gold-deep)]">Your selected direction</div>
      <h2 className="mt-2 text-xl font-black">{value.title}</h2>
      {value.range ? <><p className="mt-3 text-3xl font-black text-[var(--gold-deep)] md:text-4xl">{value.range}</p><p className="mt-2 text-sm font-bold">{value.label}</p></> : <p className="mt-3 text-lg font-bold">Turn this direction into a priced offer.</p>}
      <p className="mt-2 text-sm leading-6 text-black/60">{value.basis} Actual value depends on scope, experience and market. This is not the subscription price.</p>
      {value.sourceUrl && <a href={value.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm underline">View pricing source ↗</a>}
    </div>
    <h2 className="mt-7 text-xl font-black">Both plans include</h2>
    <ul className="mt-3 grid gap-3 text-sm leading-6 sm:grid-cols-2">
      <li>✓ Package your expertise into clear service offers</li>
      <li>✓ Ongoing market scans and capability-matched opportunities</li>
      <li>✓ Continue analyses, change direction and open applications beyond the free limits</li>
      <li>✓ Personalized email outreach, sent only after your approval</li>
    </ul>
    <p className="mt-3 text-sm text-black/55">You review and submit platform applications yourself. Cancel renewal anytime.</p>
    <div className="mt-7 grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border-2 border-[var(--gold)] bg-[var(--gold-soft)]/20 p-5">
        <div className="eyebrow text-[var(--gold-deep)]">Monthly · best value</div>
        <p className="mt-3"><strong className="text-4xl">{monthlyPrice}</strong><span className="text-black/60"> / month</span></p>
        {savings && <p className="mt-3 text-sm font-bold text-[var(--gold-deep)]">Save {savings} versus 4 weekly payments ({fourWeeksPrice}).</p>}
        <p className="mt-2 text-xs leading-5 text-black/55">Billed every calendar month; comparison uses four weekly charges.</p>
        <button className="button gold-surface mt-5 w-full justify-center" disabled={busy} onClick={()=>checkout("month")}>Choose monthly →</button>
      </div>
      <div className="rounded-2xl border border-black/15 p-5">
        <div className="eyebrow">Weekly · flexible start</div>
        <p className="mt-3"><strong className="text-4xl">{weeklyPrice}</strong><span className="text-black/60"> / week</span></p>
        <p className="mt-3 text-sm text-black/60">The same SuperCharlie services, billed weekly.</p>
        <p className="mt-2 text-xs leading-5 text-black/55">Renews every 7 days until you cancel.</p>
        <button className="button secondary mt-5 w-full justify-center" disabled={busy} onClick={()=>checkout("week")}>Choose weekly →</button>
      </div>
    </div>
    <p className="mt-5 text-xs leading-5 text-black/55">Two successful analyses, two direction changes and two application openings are included free. Subscribe beyond any allowance; saved results remain available. Review the final price and billing frequency at checkout.</p>
    {error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}
    <a className="mt-6 block underline" href="/agent">Back to SuperCharlie</a>
  </section></Localized>;
}
