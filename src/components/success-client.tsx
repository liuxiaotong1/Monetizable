"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/brand";
import { Report } from "@/components/report";
import { trackClient } from "@/lib/client-analytics";
import { getMessages, type Locale } from "@/lib/i18n";
import type { AnalysisResult } from "@/lib/types";

export function SuccessClient({ sessionId, locale }: { sessionId: string; locale: Locale }) {
  const copy = getMessages(locale);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const recoveryToken = sessionStorage.getItem("monetizable:pending-recovery");
    fetch("/api/checkout/verify", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({sessionId, recoveryToken}) })
      .then(async r => { const data=await r.json(); if(!r.ok) throw new Error(data.error); setResult(data.result); trackClient("purchase_completed", data.purchase ?? {}); sessionStorage.removeItem("monetizable:pending-analysis"); sessionStorage.removeItem("monetizable:pending-recovery"); })
      .catch(e => setError(e.message));
  }, [sessionId]);
  if (result) return <Report result={result} locale={locale}/>;
  return <main className="min-h-screen bg-black text-white"><Header locale={locale}/><section className="shell grid min-h-[70vh] place-items-center"><div className="max-w-xl text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[var(--gold-bright)] text-2xl text-[var(--gold-bright)]">{error ? "!" : "✓"}</div><h1 className="display mt-7 text-4xl md:text-5xl">{error ? copy.paymentError : copy.paymentReceived}</h1><p className="mt-4 text-white/60">{error || copy.verifying}</p>{error && <Link href="/" className="button gold-surface mt-7 border-[var(--gold-deep)]">{copy.returnHome}</Link>}</div></section></main>;
}

