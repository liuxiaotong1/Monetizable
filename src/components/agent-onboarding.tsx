"use client";
import { Localized } from "@/components/localized";


import { useRef, useState } from "react";
import { CapacityGraph3D } from "@/components/capacity-graph-3d";
import type { CapacityGraph } from "@/lib/types";
import { isCapabilityLabel } from "@/lib/capability-label";
import { submitAnalysis } from "@/lib/client-analysis";
import { getAgentCopy } from "@/lib/agent-copy";
import { suggestedAgentIntents } from "@/lib/agent-intents";
import type { Locale } from "@/lib/i18n";

interface AgentOnboardingProps {
  graph: CapacityGraph;
  existingAnalysisId?: string;
  selectedIntentIndex?: number | null;
  initialProfile?: Record<string, unknown> | null;
  locale?: Locale;
  hasOngoingApproval?: boolean;
  authorizationStatus?: "active" | "paused" | "revoked";
}

export function AgentOnboarding({
  graph,
  existingAnalysisId,
  selectedIntentIndex,
  initialProfile,
  locale = "en",
  hasOngoingApproval = false,
  authorizationStatus = "revoked",
}: AgentOnboardingProps) {
  const copy = getAgentCopy(locale);
  const fileRef = useRef<HTMLInputElement>(null);
  const [intentIndex, setIntentIndex] = useState<number | null>(
    selectedIntentIndex ?? null,
  );
  const [intentLabel, setIntentLabel] = useState("");
  const [customCapabilities, setCustomCapabilities] = useState<string[]>([]);
  const [showCustom, setShowCustom] = useState(true);
  const [progress, setProgress] = useState("");
  const [stage, setStage] = useState<"intent" | "cv" | "approval">(
    selectedIntentIndex === null || selectedIntentIndex === undefined
      ? "intent"
      : "cv",
  );
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [executionConsent, setExecutionConsent] = useState(false);
  const [error, setError] = useState("");
  const previousAnswers =
    (initialProfile?.confirmed_answers as Record<string, string> | undefined) ??
    {};
  const previousAuthorization =
    (initialProfile?.work_authorization as { summary?: string } | undefined)
      ?.summary ?? "";
  const [details, setDetails] = useState({
    targetLocations: Array.isArray(initialProfile?.target_locations)
      ? initialProfile.target_locations.join(", ")
      : "",
    remote: String(initialProfile?.remote_preference ?? "global_remote"),
    relocation: String(initialProfile?.relocation_preference ?? "depends"),
    workAuthorization: previousAuthorization,
    contractTypes:
      Array.isArray(initialProfile?.contract_types) &&
      initialProfile.contract_types.length
        ? (initialProfile.contract_types as string[])
        : ["Freelance / contract", "Consulting", "Fractional"],
    availableFrom: String(initialProfile?.available_from ?? ""),
    fullName: previousAnswers.full_name ?? "",
    phone: previousAnswers.phone ?? "",
  });

  const intentOptions = suggestedAgentIntents(graph, 2);
  const selectableCapabilities = dedupeCapabilities(graph);
  const expandedCustomCapabilities = customCapabilities;

  async function chooseIntent(option?: {
    combinationIndex?: number;
    capabilities: string[];
    label: string;
  }) {
    if (!option?.capabilities.length) {
      setError("Select a direction for SuperCharlie.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/agent/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "intent",
          analysisId: existingAnalysisId,
          combinationIndex: option.combinationIndex,
          capabilities: option.capabilities,
        }),
      });
      const data = await response.json();
      if (response.status === 402) { window.location.assign("/subscribe"); return; }
      if (!response.ok)
        throw new Error(data.error ?? "Could not save this intent");
      setIntentIndex(option.combinationIndex ?? -1);
      setIntentLabel(option.label);
      if (existingAnalysisId && hasOngoingApproval && details.fullName && details.contractTypes.length) {
        await startAgent();
        return;
      }
      setStage("cv");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save this intent",
      );
    } finally {
      setSaving(false);
    }
  }

  async function startAgent() {
    if (
      (!file && !existingAnalysisId) ||
      (!hasOngoingApproval && !executionConsent) ||
      !details.fullName ||
      !details.contractTypes.length
    ) {
      setError(
        !file && !existingAnalysisId
          ? "Upload your latest CV to continue."
          : !details.fullName || !details.contractTypes.length
            ? "Complete the required facts before starting SuperCharlie."
            : "Confirm the scanning and outreach authorization to continue.",
      );
      return;
    }
    setSaving(true);
    setProgress(file ? "Uploading and reading your CV…" : "Using your saved analysis…");
    setError("");
    try {
      let analysisId = existingAnalysisId;
      if (file) {
      const form = new FormData();
      form.set("file", file);
      form.set("text", "");
      form.set("linkedinUrl", "");
      form.set("locale", locale);
      form.set("candidateConsent", "true");
      form.set("preservedEvidence", "[]");
      form.set("context", JSON.stringify({ workMode: "global_remote" }));
      const analysisResponse = await submitAnalysis(form);
      const analysis = analysisResponse.data;
      if (!analysisResponse.ok)
        throw new Error(analysis.error ?? "We could not analyze this CV");
      analysisId = analysis.preview?.analysisId;
      }
      if (!analysisId)
        throw new Error("The CV analysis did not return an analysis ID");
      if (file) {
        window.location.assign(`/preview/${analysisId}`);
        return;
      }

      setProgress("Saving your direction and confirmed facts…");
      const completionResponse = await fetch("/api/agent/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          analysisId,
          executionConsent: hasOngoingApproval ? undefined : true,
          profile: {
            target_locations: details.targetLocations
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
            remote_preference: details.remote,
            relocation_preference: details.relocation,
            work_authorization: { summary: details.workAuthorization },
            contract_types: details.contractTypes,
            available_from: details.availableFrom || undefined,
            confirmed_answers: {
              full_name: details.fullName,
              phone: details.phone,
            },
          },
        }),
      });
      const completion = await completionResponse.json();
      if (!completionResponse.ok)
        throw new Error(completion.error ?? "SuperCharlie could not be started");
      setProgress("Starting your first live market scan…");
      window.location.assign(
        authorizationStatus === "paused" ? "/agent" : "/agent?scan=1",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "SuperCharlie could not be started",
      );
    } finally {
      setSaving(false);
    }
  }

  function reviewAuthorization() {
    if ((!file && !existingAnalysisId) || !details.fullName || !details.contractTypes.length) {
      setError(
        !file && !existingAnalysisId
          ? "Upload your latest CV to continue."
          : "Complete the required facts before reviewing SuperCharlie’s authorization.",
      );
      return;
    }
    setError("");
    if (hasOngoingApproval) void startAgent();
    else setStage("approval");
  }

  return (
    <Localized><section className="mt-10">
      <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,.07)] md:p-10">
        <div className="eyebrow text-[var(--gold-deep)]">{copy.direction}</div>
        <h2 className="editorial-title mt-4 max-w-4xl text-3xl leading-tight md:text-5xl">
          {stage === "intent"
            ? copy.intentTitle
            : stage === "approval"
              ? "Approve SuperCharlie once"
              : copy.evidenceTitle}
        </h2>
        {stage !== "intent" && <button type="button" disabled={saving} onClick={() => { setError(""); setStage("intent"); }} className="button gold-surface mt-5 w-full justify-center sm:w-auto">Change direction ↗</button>}
        <p className="mt-4 max-w-3xl leading-7 text-black/60">
          {stage === "intent"
            ? copy.intentBody
            : stage === "approval"
              ? "Approve once. SuperCharlie then scans and acts continuously within these confirmed rules."
              : `Your selected intent is ${intentLabel || (intentIndex !== null && intentIndex >= 0 ? graph.combinations[intentIndex]?.elements.join(" × ") : "saved")}. ${existingAnalysisId ? "Your saved CV or LinkedIn analysis will be used." : "Upload your latest CV before scanning starts."}`}
        </p>

        {stage === "intent" ? (
          <>
            <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-black/10">
              <CapacityGraph3D
                graph={graph}
                mode="personalized"
                onChooseCapabilities={(capabilities) => {
                  if (!saving) void chooseIntent({ capabilities, label: capabilities.join(" × ") });
                }}
                onExploreOpportunities={(index) => {
                  const option = intentOptions.find(
                    (item) => item.combinationIndex === index,
                  );
                  if (option) void chooseIntent(option);
                }}
              />
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {intentOptions.map((option, index) => (
                <button
                  key={option.label}
                  type="button"
                  disabled={saving}
                  onClick={() => void chooseIntent(option)}
                  className="rounded-2xl border border-black/10 p-5 text-left transition hover:border-[var(--gold)] hover:bg-[var(--gold-soft)] disabled:opacity-50"
                >
                  <span className="text-[.65rem] font-black uppercase tracking-[.16em] text-[var(--gold-deep)]">
                    Intent {String(index + 1).padStart(2, "0")}
                  </span>
                  <strong className="mt-3 block leading-6">
                    {option.label}
                  </strong>
                </button>
              ))}
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowCustom(true)}
                className="rounded-2xl border border-dashed border-black/20 p-5 text-left transition hover:border-[var(--gold)] hover:bg-[var(--gold-soft)] disabled:opacity-50"
              >
                <span className="text-[.65rem] font-black uppercase tracking-[.16em] text-[var(--gold-deep)]">
                  Intent 03
                </span>
                <strong className="mt-3 block leading-6">
                  Build my own direction
                </strong>
                <span className="mt-2 block text-sm text-black/50">
                  Combine 1–3 proven capabilities or interests.
                </span>
              </button>
            </div>
            {showCustom && (
              <div className="mt-4 rounded-2xl border border-dashed border-black/20 p-5">
                <button
                  type="button"
                  onClick={() => setShowCustom(false)}
                  className="flex w-full items-center justify-between text-left font-black"
                >
                  <span>Intent 03 · Build my own direction</span>
                  <span>−</span>
                </button>
                {showCustom && (
                  <div className="mt-4">
                    <p className="text-sm text-black/55">
                      Choose 1–3 evidenced capabilities, including proven
                      interests from your CV.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectableCapabilities.map((node) => {
                        const selected = customCapabilities.includes(
                          node.label,
                        );
                        return (
                          <button
                            key={node.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setCustomCapabilities((values) =>
                                selected
                                  ? values.filter(
                                      (value) => value !== node.label,
                                    )
                                  : values.length < 3
                                    ? [...values, node.label]
                                    : values,
                              )
                            }
                            className={`rounded-full border px-3 py-2 text-xs font-bold ${selected ? "border-black bg-black text-white" : "border-black/15 bg-white"}`}
                          >
                            {node.label}
                            {node.type === "interest" ? " · interest" : ""}
                          </button>
                        );
                      })}
                    </div>
                    {expandedCustomCapabilities.length > 0 && (
                      <div className="mt-5 rounded-xl bg-black/[.04] p-4 text-sm leading-6 text-black/65">
                        <strong className="block text-black">What SuperCharlie will do next</strong>
                        It will package this direction as <strong>{expandedCustomCapabilities.join(" × ")}</strong>, scan for matching freelance, consulting and buyer-demand signals, and prepare personalized email drafts for your review. Nothing is sent until you approve the exact email.
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={saving || customCapabilities.length < 1}
                      onClick={() =>
                        void chooseIntent({
                          capabilities: customCapabilities,
                          label: customCapabilities.join(" × "),
                        })
                      }
                      className="button gold-surface mt-5 disabled:opacity-40"
                    >
                      Use this direction →
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-black/10 p-6">
              <div className="text-xs font-black uppercase tracking-[.16em] text-[var(--gold-deep)]">
                {copy.facts}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <SetupField
                  label="Full legal name *"
                  value={details.fullName}
                  onChange={(value) =>
                    setDetails({ ...details, fullName: value })
                  }
                />
                <SetupField
                  label="Phone"
                  value={details.phone}
                  onChange={(value) => setDetails({ ...details, phone: value })}
                />
                <SetupField
                  label="Target locations"
                  value={details.targetLocations}
                  placeholder="France, EU, worldwide"
                  onChange={(value) =>
                    setDetails({ ...details, targetLocations: value })
                  }
                />
                <label className="text-xs font-black uppercase tracking-[.12em] text-black/55">
                  Available from
                  <input
                    type="date"
                    className="field mt-2 w-full normal-case tracking-normal text-black"
                    value={details.availableFrom}
                    onChange={(event) =>
                      setDetails({
                        ...details,
                        availableFrom: event.target.value,
                      })
                    }
                  />
                </label>
                <SetupSelect
                  label="Remote preference"
                  value={details.remote}
                  onChange={(value) =>
                    setDetails({ ...details, remote: value })
                  }
                  options={[
                    ["global_remote", "Global remote"],
                    ["regional_remote", "Remote within my region"],
                    ["hybrid", "Hybrid"],
                    ["local", "On-site / local"],
                    ["flexible", "Flexible"],
                  ]}
                />
                <SetupSelect
                  label="Relocation"
                  value={details.relocation}
                  onChange={(value) =>
                    setDetails({ ...details, relocation: value })
                  }
                  options={[
                    ["not_open", "Not open"],
                    ["within_country", "Within my country"],
                    ["international", "International"],
                    ["depends", "Depends on the opportunity"],
                  ]}
                />
              </div>
              <fieldset className="mt-5">
                <legend className="text-xs font-black uppercase tracking-[.12em] text-black/55">
                  Opportunity types *
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "Freelance / contract",
                    "Consulting",
                    "Fractional",
                    "Productized service",
                    "Buyer demand",
                  ].map((option) => {
                    const active = details.contractTypes.includes(option);
                    return (
                      <button
                        type="button"
                        key={option}
                        aria-pressed={active}
                        onClick={() =>
                          setDetails({
                            ...details,
                            contractTypes: active
                              ? details.contractTypes.filter(
                                  (value) => value !== option,
                                )
                              : [...details.contractTypes, option],
                          })
                        }
                        className={`rounded-full border px-3 py-2 text-xs font-bold ${active ? "border-black bg-black text-white" : "border-black/15"}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
            {!existingAnalysisId && <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid min-h-64 place-items-center rounded-[1.5rem] border border-dashed border-black/30 bg-black/[.015] p-8 text-center hover:border-[var(--gold-deep)]"
            >
              <span>
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--gold-soft)] text-3xl">
                  ↑
                </span>
                <strong className="mt-5 block text-xl">
                  {file?.name ?? copy.upload}
                </strong>
                <span className="mt-2 block text-sm text-black/50">
                  PDF or DOCX · up to 8 MB
                </span>
              </span>
            </button>}
            <div className="flex flex-col justify-between rounded-[1.5rem] border border-black/10 p-6 lg:col-span-2">
              {stage === "approval" ? (
                <div>
                  <div className="text-xs font-black uppercase tracking-[.16em] text-[var(--gold-deep)]">
                    Final approval
                  </div>
                  <h3 className="mt-3 text-2xl font-black">
                    Start scanning and reaching buyers for this direction?
                  </h3>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-black/58">
                    SuperCharlie will continuously find fresh buyer signals, verify
                    public professional contacts, and send relevant one-to-one
                    outreach from your connected Gmail using your confirmed CV
                    evidence.
                  </p>
                  <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--gold)]/45 bg-[var(--gold-soft)]/30 p-4">
                    <input
                      className="mt-1 h-4 w-4 accent-[var(--gold-deep)]"
                      type="checkbox"
                      checked={executionConsent}
                      onChange={(event) =>
                        setExecutionConsent(event.target.checked)
                      }
                    />
                    <span>
                      <strong className="block">
                        I approve ongoing scanning and personalized email
                        outreach
                      </strong>
                      <span className="mt-1 block text-sm leading-6 text-black/55">
                        Approve once; SuperCharlie keeps working until you pause or
                        change direction.
                      </span>
                    </span>
                  </label>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-black uppercase tracking-[.16em] text-[var(--gold-deep)]">
                    Ready for review
                  </div>
                  <p className="mt-3 text-sm leading-6 text-black/55">
                    Your direction, confirmed facts and latest CV are required
                    before SuperCharlie asks for execution approval.
                  </p>
                </div>
              )}
              {saving && (
                <div
                  aria-live="polite"
                  className="mt-6 flex items-center gap-3 rounded-xl bg-[var(--gold-soft)] p-4 text-sm font-bold"
                >
                  <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--gold-deep)]" />
                  {progress || "Preparing SuperCharlie…"}
                </div>
              )}
              {stage === "approval" ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={saving || !executionConsent}
                    onClick={() => void startAgent()}
                    className="rounded-full bg-black px-6 py-4 font-black text-white disabled:cursor-not-allowed disabled:bg-black/35"
                  >
                    {saving
                      ? "Starting SuperCharlie…"
                      : "Approve & start 24h Agent"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setStage("cv")}
                    className="rounded-full border border-black/15 px-6 py-4 font-black"
                  >
                    Back to details
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={
                    saving ||
                    (!file && !existingAnalysisId) ||
                    !details.fullName ||
                    !details.contractTypes.length
                  }
                  onClick={reviewAuthorization}
                  className="mt-6 rounded-full bg-black px-6 py-4 font-black text-white disabled:cursor-not-allowed disabled:bg-black/35"
                >
                  {saving
                    ? "Updating SuperCharlie…"
                    : hasOngoingApproval
                      ? "Use this CV & restart scan →"
                      : "Review SuperCharlie authorization →"}
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              className="sr-only"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
        )}
        {error && (
          <p className="mt-5 rounded-xl border border-[var(--gold)] bg-[var(--gold-soft)] p-4 text-sm">
            {error}
          </p>
        )}
      </div>
    </section></Localized>
  );
}

function dedupeCapabilities(graph: CapacityGraph) {
  const unique = new Map<string, CapacityGraph["nodes"][number]>();
  [...graph.nodes]
    .filter((node) => node.type !== "constraint" && node.evidence.length && isCapabilityLabel(node.label))
    .sort(
      (a, b) =>
        Number(b.type === "interest") - Number(a.type === "interest") ||
        b.evidence.length - a.evidence.length,
    )
    .forEach((node) => {
      const key = node.label.trim().toLocaleLowerCase();
      if (key && !unique.has(key)) unique.set(key, node);
    });
  graph.combinations.forEach((combination, combinationIndex) => {
    combination.elements.forEach((label, elementIndex) => {
      const key = label.trim().toLocaleLowerCase();
      if (!key || !isCapabilityLabel(label) || unique.has(key) || !combination.evidence.length) return;
      unique.set(key, {
        id: `combination-${combinationIndex}-${elementIndex}`,
        type: "skill",
        label: label.trim(),
        evidence: combination.evidence.slice(0, 3),
        confidence: combination.evidence.length > 1 ? "high" : "medium",
      });
    });
  });
  return [...unique.values()].slice(0, 32);
}

function SetupField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange(value: string): void;
}) {
  return (
    <Localized><label className="text-xs font-black uppercase tracking-[.12em] text-black/55">
      {label}
      <input
        className="field mt-2 w-full normal-case tracking-normal text-black"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label></Localized>
  );
}

function SetupSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  options: Array<[string, string]>;
  onChange(value: string): void;
}) {
  return (
    <Localized><label className="text-xs font-black uppercase tracking-[.12em] text-black/55">
      {label}
      <select
        className="field mt-2 w-full bg-white normal-case tracking-normal text-black"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label></Localized>
  );
}
