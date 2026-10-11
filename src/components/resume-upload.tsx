"use client";
import { Localized } from "@/components/localized";

import { useState } from "react";
export function ResumeUpload() {
  const [busy,setBusy]=useState(false), [error,setError]=useState("");
  async function resume() {
    setBusy(true); setError("");
    try {
      const r=await fetch("/api/profile/resume",{method:"POST"});
      const data=await r.json();
      if(r.status===402) { window.location.assign("/subscribe"); return; }
      if(!r.ok) throw new Error(data.error ?? "Please retry.");
      window.location.assign(`/preview/${data.preview.analysisId}`);
    } catch(e) { setError(e instanceof Error?e.message:"Please retry."); setBusy(false); }
  }
  return <Localized><section className="shell card my-10 max-w-2xl p-8"><h1 className="display text-3xl">Continue with your saved upload</h1><p className="my-5">Your CV or LinkedIn URL is attached to your account. Your first two successful analyses are free.</p><button className="button" disabled={busy} onClick={resume}>{busy?"Analyzing…":"Continue analysis"}</button>{error&&<p role="alert" className="mt-4">{error}</p>}<a className="block mt-5 underline" href="/#analyze">Upload a different profile</a></section></Localized>;
}
