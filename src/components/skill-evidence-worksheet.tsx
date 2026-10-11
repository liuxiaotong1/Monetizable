"use client";
import { useLocale } from "@/components/localization-provider";
import { Localized } from "@/components/localized";


import { useMemo, useState } from "react";
import Link from "next/link";
import { positioningHypothesis, skillStackFromLayers, worksheetSummary, type WorksheetEvidence } from "@/lib/worksheet";

const emptyRow = (): WorksheetEvidence => ({ situation: "", action: "", result: "" });

export function SkillEvidenceWorksheet() {
  const locale = useLocale();
  const [evidence, setEvidence] = useState<WorksheetEvidence[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [domain, setDomain] = useState("");
  const [execution, setExecution] = useState("");
  const [people, setPeople] = useState("");
  const [tools, setTools] = useState("");
  const [buyer, setBuyer] = useState("");
  const [problem, setProblem] = useState("");
  const [outcome, setOutcome] = useState("");
  const [copied, setCopied] = useState(false);

  const stack = useMemo(() => skillStackFromLayers([domain, execution, people, tools]), [domain, execution, people, tools]);
  const positioning = useMemo(() => positioningHypothesis({ stack, buyer, problem, outcome }, locale), [buyer, outcome, problem, stack, locale]);
  const summary = worksheetSummary({ evidence, domain, execution, people, tools, positioning }, locale);

  function updateEvidence(index: number, field: keyof WorksheetEvidence, value: string) {
    setEvidence((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  }

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Localized><div className="mt-10 grid gap-7 xl:grid-cols-[1.15fr_.85fr] xl:items-start">
      <form className="card p-6 md:p-8" onSubmit={(event) => event.preventDefault()}>
        <fieldset>
          <legend className="text-2xl font-black">1. Capture evidence from real work</legend>
          <p className="mt-2 leading-7 text-black/60">Use projects, difficult situations, volunteer work, or moments when someone relied on you. Avoid unsupported skill labels.</p>
          <div className="mt-6 space-y-6">
            {evidence.map((row, index) => (
              <div key={index} className="rounded-[18px] border border-black/12 bg-[#faf9f6] p-5">
                <div className="eyebrow text-[var(--gold-deep)]">Evidence {index + 1}</div>
                <label className="mt-4 block text-sm font-bold">Situation or problem<textarea className="field mt-2 min-h-24 resize-y font-normal" value={row.situation} onChange={(event) => updateEvidence(index, "situation", event.target.value)} placeholder="What was happening, for whom, and why did it matter?" /></label>
                <label className="mt-4 block text-sm font-bold">Your action<textarea className="field mt-2 min-h-24 resize-y font-normal" value={row.action} onChange={(event) => updateEvidence(index, "action", event.target.value)} placeholder="What did you personally analyze, build, decide, communicate, or improve?" /></label>
                <label className="mt-4 block text-sm font-bold">Result or proof<textarea className="field mt-2 min-h-24 resize-y font-normal" value={row.result} onChange={(event) => updateEvidence(index, "result", event.target.value)} placeholder="What changed? Include truthful scale, artifact, decision, or outcome." /></label>
              </div>
            ))}
          </div>
          <button type="button" className="button secondary mt-5" onClick={() => setEvidence((rows) => [...rows, emptyRow()])}>+ Add another evidence example</button>
        </fieldset>

        <fieldset className="mt-10 border-t border-black/10 pt-8">
          <legend className="text-2xl font-black">2. Group the capabilities</legend>
          <p className="mt-2 leading-7 text-black/60">Enter comma-separated skills you can support with the evidence above.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="text-sm font-bold">Domain knowledge<textarea className="field mt-2 min-h-28 resize-y font-normal" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="Fintech, hospitality, clinical workflows…" /></label>
            <label className="text-sm font-bold">Execution skills<textarea className="field mt-2 min-h-28 resize-y font-normal" value={execution} onChange={(event) => setExecution(event.target.value)} placeholder="Analysis, research, writing, operations…" /></label>
            <label className="text-sm font-bold">People skills<textarea className="field mt-2 min-h-28 resize-y font-normal" value={people} onChange={(event) => setPeople(event.target.value)} placeholder="Negotiation, teaching, facilitation…" /></label>
            <label className="text-sm font-bold">Tools and methods<textarea className="field mt-2 min-h-28 resize-y font-normal" value={tools} onChange={(event) => setTools(event.target.value)} placeholder="Excel, SQL, Figma, languages, frameworks…" /></label>
          </div>
        </fieldset>

        <fieldset className="mt-10 border-t border-black/10 pt-8">
          <legend className="text-2xl font-black">3. Form a market hypothesis</legend>
          <div className="mt-5 grid gap-5">
            <label className="text-sm font-bold">Who has the problem?<input className="field mt-2 font-normal" value={buyer} onChange={(event) => setBuyer(event.target.value)} placeholder="A specific team, buyer, profession, or business type" /></label>
            <label className="text-sm font-bold">What costly or recurring problem do they have?<textarea className="field mt-2 min-h-24 resize-y font-normal" value={problem} onChange={(event) => setProblem(event.target.value)} /></label>
            <label className="text-sm font-bold">What useful outcome could you deliver?<textarea className="field mt-2 min-h-24 resize-y font-normal" value={outcome} onChange={(event) => setOutcome(event.target.value)} /></label>
          </div>
        </fieldset>
      </form>

      <aside className="card p-6 xl:sticky xl:top-6 md:p-8" aria-live="polite">
        <div className="eyebrow text-[var(--gold-deep)]">Your working hypothesis</div>
        <h2 className="editorial-title mt-3 text-3xl">A skill stack you can test.</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {stack.length ? stack.map((skill) => <span key={skill} className="rounded-full border border-black/15 bg-[var(--gold-soft)] px-3 py-2 text-sm font-bold">{skill}</span>) : <p className="text-sm text-black/50">Your evidence-backed skills will appear here.</p>}
        </div>
        <blockquote className="mt-6 border-l-2 border-[var(--gold)] pl-5 text-lg font-bold leading-8">{positioning}</blockquote>
        <div className="mt-7 grid gap-3">
          <button type="button" className="button w-full" onClick={() => void copySummary()}>{copied ? "Copied" : "Copy worksheet summary"}</button>
          <button type="button" className="button secondary w-full" onClick={() => window.print()}>Print or save as PDF</button>
        </div>
        <p className="mt-4 text-xs leading-5 text-black/50">This worksheet stays in your browser and is not submitted to Monetizable. Copy or print it before leaving the page.</p>
        <div className="mt-8 rounded-[18px] bg-black p-6 text-white">
          <div className="eyebrow text-[var(--gold-bright)]">Go beyond self-assessment</div>
          <h3 className="mt-3 text-xl font-black">Check the combination against current demand.</h3>
          <p className="mt-3 text-sm leading-6 text-white/65">Paste the summary into Monetizable or upload your CV to generate and rank evidence-backed opportunity hypotheses.</p>
          <Link href="/" className="button mt-5 border-white bg-white text-black">Analyze my skill stack →</Link>
        </div>
      </aside>
    </div></Localized>
  );
}

