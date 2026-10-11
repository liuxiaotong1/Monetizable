"use client";
import { Localized } from "@/components/localized";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";
import { Report } from "@/components/report";
import { suggestedAgentIntents } from "@/lib/agent-intents";
import type { Locale } from "@/lib/i18n";
export function ReportDirection({result,locale,selected}:{result:AnalysisResult;locale:Locale;selected:boolean}) {
  const [done,setDone]=useState(selected),[busy,setBusy]=useState(false),[error,setError]=useState("");
  if(done) return <Localized><Report result={result} locale={locale}/></Localized>;
  const options=result.capacityGraph?suggestedAgentIntents(result.capacityGraph,3):[];
  async function choose(combinationIndex:number|undefined,capabilities:string[]) {
    setBusy(true);setError("");
    try {
      const r=await fetch("/api/agent/onboarding",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"intent",analysisId:result.id,combinationIndex,capabilities})});
      const data=await r.json();if(r.status===402){window.location.assign("/subscribe");return;}
      if(!r.ok)throw new Error(data.error);setDone(true);
    }catch(e){setError(e instanceof Error?e.message:"Please retry");}finally{setBusy(false);}
  }
  return <Localized><main className="shell py-10"><div className="eyebrow">Choose your direction</div><h1 className="display text-4xl mt-4">What should SuperCharlie focus on?</h1><p className="my-5">Your analysis is saved. Choose a direction before starting SuperCharlie. Your first selection is free; two later changes are included.</p><div className="grid gap-4 md:grid-cols-3">{options.map(option=><button key={option.label} disabled={busy} className="card p-6 text-left" onClick={()=>choose(option.combinationIndex,option.capabilities)}><strong>{option.label}</strong><p className="mt-3 text-black/60">{option.capabilities.join(" · ")}</p></button>)}</div>{error&&<p role="alert" className="mt-4">{error}</p>}<button className="underline mt-6" onClick={()=>setDone(true)}>View saved analysis without starting SuperCharlie</button></main></Localized>;
}
