"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Header } from "@/components/brand";
import {
  CapacityGraph3D,
  StaticCapacityGraph,
} from "@/components/capacity-graph-3d";
import { Report } from "@/components/report";
import { Stack } from "@/components/stack";
import { trackClient } from "@/lib/client-analytics";
import type { AnalysisResult, Preview } from "@/lib/types";
import { getMessages, intlLocale, type Locale } from "@/lib/i18n";
import { highestPriceRange, numericPriceDisplay } from "@/lib/pricing";
import { readAnalysisResponse } from "@/lib/analysis-response";

type BillingInterval = "week" | "month";

export function PreviewClient({
  id,
  weeklyPriceCents,
  monthlyPriceCents,
  locale,
}: {
  id: string;
  weeklyPriceCents: number;
  monthlyPriceCents: number;
  locale: Locale;
}) {
  const router = useRouter();
  const copy = getMessages(locale);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [paying, setPaying] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("month");
  const selectedPrice =
    billingInterval === "week"
      ? `$${(weeklyPriceCents / 100).toFixed(2)}`
      : `$${(monthlyPriceCents / 100).toFixed(2)}`;
  useEffect(() => {
    let cancelled = false;
    setError("");
    fetch(`/api/analysis/${id}`, { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 403) {
          let recoveryToken: string | null = null;
          try { recoveryToken = sessionStorage.getItem(`monetizable:recovery:${id}`); } catch { /* Storage may be disabled. */ }
          if (recoveryToken) response = await fetch(`/api/analysis/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recoveryToken }) });
        }
        const data = await readAnalysisResponse(response);
        if (cancelled) return;
        if (data.result) setResult(data.result);
        else if (data.preview) setPreview(data.preview);
        else throw new Error("Your analysis could not be loaded right now. Please try again.");
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof TypeError ? "Connection interrupted. Please try again." : e.message);
      });
    trackClient("preview_viewed", { analysisId: id });
    return () => { cancelled = true; };
  }, [id, reload]);
  async function checkout() {
    setPaying(true);
    setError("");
    trackClient("paywall_clicked", { analysisId: id });
    try {
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ analysisId: id, billingInterval }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      trackClient("checkout_started", { analysisId: id });
      sessionStorage.setItem("monetizable:pending-analysis", id);
      window.location.assign(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.analysisError);
      setPaying(false);
    }
  }
  async function remove() {
    try {
      const response = await fetch(`/api/analysis/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Deletion could not be completed. Please try again.");
      sessionStorage.removeItem(`monetizable:preview:${id}`);
      sessionStorage.removeItem(`monetizable:recovery:${id}`);
      router.push("/");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Deletion failed."); }
  }
  async function redeemAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRedeeming(true);
    setError("");
    try {
      const recoveryToken = sessionStorage.getItem(
        `monetizable:recovery:${id}`,
      );
      const response = await fetch("/api/access-pass", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          analysisId: id,
          code: accessCode,
          recoveryToken,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.agentAccessGrant)
        sessionStorage.setItem(
          "monetizable:agent-access-grant",
          data.agentAccessGrant,
        );
      if (data.agentSetupUrl) {
        window.location.assign(data.agentSetupUrl);
        return;
      }
      setResult(data.result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.analysisError);
    } finally {
      setRedeeming(false);
    }
  }
  if (result) return <Report result={result} locale={locale} />;
  if (error && !preview)
    return (
      <main>
        <Header locale={locale} />
        <div className="shell card mt-16 max-w-xl p-8">
          <h1 className="display text-4xl">{copy.unavailable}</h1>
          <p className="mt-4 text-black/60">{error}</p>
          <button className="button mt-6" onClick={() => setReload((value) => value + 1)}>Try again</button>
          <Link className="button secondary mt-6 ml-3" href="/">
            {copy.startAgain}
          </Link>
        </div>
      </main>
    );
  if (!preview)
    return (
      <main className="min-h-screen">
        <Header locale={locale} />
        <div className="shell mt-24 animate-pulse">
          <div className="h-4 w-40 rounded bg-black/10" />
          <div className="mt-8 h-24 max-w-3xl rounded bg-black/10" />
        </div>
      </main>
    );
  return (
    <main className="min-h-screen pb-16">
      <Header locale={locale} />
      <section className="shell pt-8 md:pt-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="eyebrow text-[var(--gold-deep)]">
            {copy.freePreview}
          </div>
          {preview.profileName && (
            <div className="rounded-full border border-[var(--gold)] bg-[var(--gold-soft)] px-3 py-1.5 text-xs font-black">
              {copy.analysisFor} {preview.profileName}
            </div>
          )}
        </div>
        {!preview.weakProfile && (
          <div className="priority-strip mt-5 grid gap-px overflow-hidden rounded-2xl border border-black bg-white/25 sm:grid-cols-2">
            <Priority
              label={copy.speed}
              value={preview.servicePreview.speed_to_monetize}
            />
            <Priority
              label={copy.locationDependency}
              value={
                preview.servicePreview.location_dependency === "low"
                  ? copy.lowPortable
                  : preview.servicePreview.location_dependency
              }
            />
          </div>
        )}
        {preview.weakProfile ? (
          <div className="card mt-6 border-[var(--gold)] bg-white p-7 md:p-10">
            <div className="eyebrow text-[var(--gold-deep)]">Honest signal</div>
            <h1 className="editorial-title mt-4 max-w-3xl text-3xl leading-tight md:text-4xl">
              The skills are there. The commercial proof needs one more step.
            </h1>
            <p className="mt-5 max-w-[72ch] text-base leading-8 text-black/65">
              {preview.weakProfile.message}
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <Signal
                label="Strongest asset"
                value={preview.weakProfile.strongestAsset}
              />
              <Signal
                label="Missing adjacent capability"
                value={preview.weakProfile.missingCapability}
              />
              <Signal
                label="Closest viable path"
                value={preview.weakProfile.closestPath}
              />
            </div>
          </div>
        ) : (
          <div className="card discovery-card mt-6 p-7 md:p-10">
            <div className="eyebrow text-[var(--gold-bright)]">
              {copy.skillAnalysis}
            </div>
            <h1 className="editorial-title mt-4 max-w-3xl text-3xl leading-tight md:text-4xl">
              {copy.combinationTitle}
            </h1>
            <Stack
              elements={preview.strongestCombination}
              className="mt-7 text-[clamp(1.45rem,2.3vw,2rem)] leading-[1.18] text-[var(--gold-bright)]"
            />
            <p className="mt-7 max-w-[74ch] text-sm leading-7 text-white/72 md:text-base">
              {preview.explanation}
            </p>
            <div className="mt-8 rounded-2xl border border-[var(--gold)]/55 bg-white/[.07] p-5 md:p-6">
              <div className="eyebrow text-[var(--gold-bright)]">
                {copy.evidence}
              </div>
              <ul className="mt-4 grid gap-4 md:grid-cols-2">
                {preview.combinationEvidence.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm leading-6 text-white/85"
                  >
                    <span className="shrink-0 font-black text-[var(--gold-bright)]">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {!preview.weakProfile && (
          <section className="mt-8 overflow-hidden rounded-[2rem] border border-[var(--gold)] bg-black text-white shadow-[0_24px_70px_rgba(0,0,0,0.16)]">
            <div className="p-7 md:p-10">
              <div className="eyebrow text-[var(--gold-bright)]">
                {copy.topPath}
              </div>
              <h2 className="editorial-title mt-4 max-w-4xl text-3xl leading-tight md:text-5xl">
                {copy.paidFor}
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-7 text-white/65 md:text-lg">
                {copy.buyerDemand}
              </p>
              <div className="mt-8 grid overflow-hidden rounded-2xl border border-white/15 md:grid-cols-2">
                <div className="border-b border-white/15 p-5 md:border-b-0 md:border-r md:p-7">
                  <div className="eyebrow text-white">{copy.liveDemand}</div>
                  <div className="mt-3 text-3xl font-black text-[var(--gold-bright)] md:text-4xl">
                    {preview.demandLevel === "Low"
                      ? "SELECTIVE"
                      : preview.demandLevel.toUpperCase()}
                  </div>
                </div>
                <div className="p-5 md:p-7">
                  <div className="eyebrow text-white">{copy.marketSignals}</div>
                  <div className="mt-3 text-2xl font-black leading-tight md:text-3xl">
                    {preview.searchStatus === "failed"
                      ? copy.unavailableSignal
                      : copy.strongActivity}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-px border-t border-[var(--gold)]/40 bg-white/10 md:grid-cols-2">
              <div className="bg-[#111] p-6 md:p-8">
                <div className="eyebrow text-white">{copy.bestOffer}</div>
                <div className="mt-4 text-xl font-black leading-tight text-white md:text-2xl">
                  {preview.servicePreview.name}
                </div>
              </div>
              <div className="bg-[#111] p-6 md:p-8">
                <div className="eyebrow text-white">{copy.marketValue}</div>
                <div className="mt-4 text-xl font-black leading-tight text-white md:text-2xl">
                  {previewEarningRange(preview)}
                </div>
              </div>
            </div>
          </section>
        )}
        <CapacityGraph3D
          graph={preview.capacityGraph}
          mode="personalized"
          onExploreOpportunities={() =>
            document
              .getElementById("live-opportunities")
              ?.scrollIntoView({ behavior: "smooth", block: "center" })
          }
          fallback={<StaticCapacityGraph graph={preview.capacityGraph} />}
        />
        <TopCombinations preview={preview} />
        <FreeAnalysisSections preview={preview} locale={locale} />
        <LockedOpportunityFeed
          preview={preview}
          price={selectedPrice}
          billingInterval={billingInterval}
          paying={paying}
          onIntervalChange={setBillingInterval}
          onCheckout={checkout}
        />
        <div
          aria-hidden="true"
          className="mx-auto h-14 w-px bg-gradient-to-b from-black via-[var(--gold)] to-black"
        />
        <div
          id="opportunity-agent"
          className="card grid scroll-mt-8 gap-8 border-2 border-black p-6 md:grid-cols-[1fr_auto] md:items-center md:p-9"
        >
          <div>
            <div className="eyebrow text-[var(--gold-deep)]">
              Keep this market map working
            </div>
            <h2 className="display mt-3 text-3xl md:text-4xl">
              Turn one clear offer into daily buyer conversations
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-black/62">
              Your analysis is the starting point. SuperCharlie keeps
              finding fresh freelance, consulting, fractional and buyer-demand
              signals, verifies relevant contacts, and sends personal outreach
              for your chosen offer.
            </p>
            <div className="mt-5 grid gap-2 text-sm md:grid-cols-2">
              {[
                "Fresh buyer signals every day",
                "Verified professional contacts",
                "Personalized email outreach with your CV",
                "New targets instead of repeated follow-ups",
              ].map((item) => (
                <div key={item}>✓ {item}</div>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            <div>
              <button
                onClick={checkout}
                disabled={paying}
                className="button gold-surface min-w-72 border-[var(--gold-deep)]"
              >
                {paying
                  ? copy.openingCheckout
                  : copy.subscriptionTrialButton.replace(
                      "{price}",
                      selectedPrice,
                    )}
              </button>
              <p className="mt-2 max-w-72 text-center text-xs leading-5 text-black/55">
                {copy.subscriptionTrialTerms.replace("{price}", selectedPrice)}
              </p>
            </div>
            <form
              onSubmit={redeemAccess}
              className="rounded-2xl border border-black/15 bg-[#faf9f6] p-3"
            >
              <label
                htmlFor="access-code"
                className="text-xs font-black uppercase tracking-wider"
              >
                {copy.passLabel}
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="access-code"
                  className="field min-w-0 flex-1"
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  placeholder={copy.enterCode}
                  autoComplete="off"
                />
                <button
                  className="button min-h-0 shrink-0 px-4"
                  disabled={!accessCode.trim() || redeeming}
                >
                  {redeeming ? copy.checking : copy.apply}
                </button>
              </div>
            </form>
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-[var(--gold)] bg-[var(--gold-soft)] p-3 text-sm text-black"
          >
            {error}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-black/50">
          <span>
            {copy.expires}{" "}
            {new Date(preview.expiresAt).toLocaleString(intlLocale(locale))}.
          </span>
          <button onClick={remove} className="underline underline-offset-4">
            {copy.deleteNow}
          </button>
        </div>
      </section>
    </main>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="eyebrow text-black/50">{label}</div>
      <div className="mt-3 text-xl font-black leading-tight">{value}</div>
    </div>
  );
}
function Priority({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black p-4 md:px-6">
      <div className="eyebrow text-[var(--gold-bright)]">{label}</div>
      <div className="mt-2 text-lg font-black capitalize">{value}</div>
    </div>
  );
}

function previewEarningRange(preview: Preview) {
  const value =
    preview.freeAnalysis.positioning.estimatedEarningRange ??
    highestPriceRange(preview.freeAnalysis.pricing[0]?.range);
  return numericPriceDisplay(value) ?? "$1,500–$5,000";
}

function constructiveCombinationCopy(value: string) {
  if (
    /no evidence of (?:their|the) combined application|demonstrates? expertise in each of these areas separately/i.test(
      value,
    )
  ) {
    return "You already demonstrate strength across all 3 areas. We're going to combine and position them as one marketable offer.";
  }
  return value;
}

function TopCombinations({ preview }: { preview: Preview }) {
  return (
    <section className="mt-8 border-t border-[var(--line)] pt-10">
      <div className="eyebrow text-[var(--gold-deep)]">
        Your complete monetizable stack
      </div>
      <h2 className="editorial-title mt-3 text-3xl md:text-4xl">
        All three combinations are included free
      </h2>
      <div className="mt-7 grid gap-5">
        {preview.freeAnalysis.combinations.map((combination, index) => (
          <article
            key={combination.elements.join("-")}
            className={`card p-6 md:p-9 ${index === 0 ? "discovery-card text-white" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span
                className={`text-lg font-black uppercase tracking-[.12em] ${index === 0 ? "text-[var(--gold-bright)]" : ""}`}
              >
                Rank {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-black ${index === 0 ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-bright)]" : "border-black/10 bg-[var(--gold-soft)]"}`}
              >
                {combination.demandLevel === "Low"
                  ? "Selective demand"
                  : `${combination.demandLevel} demand`}
              </span>
            </div>
            <Stack
              elements={combination.elements}
              className={`mt-6 text-xl leading-tight md:text-2xl ${index === 0 ? "text-[var(--gold-bright)]" : ""}`}
            />
            <p
              className={`mt-5 max-w-[74ch] leading-7 ${index === 0 ? "text-white/72" : "text-black/65"}`}
            >
              {constructiveCombinationCopy(combination.differentiation)}
            </p>
            <p
              className={`mt-3 max-w-[74ch] text-sm leading-6 ${index === 0 ? "text-white/55" : "text-black/50"}`}
            >
              {combination.noveltyReason}
            </p>
            <div
              className={`mt-7 rounded-2xl border p-5 ${index === 0 ? "border-[var(--gold)]/55 bg-white/[.07]" : "border-[var(--gold)]/45 bg-[var(--gold-soft)]/35"}`}
            >
              <div
                className={`eyebrow ${index === 0 ? "text-[var(--gold-bright)]" : "text-[var(--gold-deep)]"}`}
              >
                Evidence found in your profile
              </div>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {combination.evidence.map((evidence) => (
                  <li
                    key={evidence}
                    className={`flex gap-3 text-sm leading-6 ${index === 0 ? "text-white/85" : "text-black/75"}`}
                  >
                    <span className="font-black text-[var(--gold-bright)]">
                      ✓
                    </span>
                    <span>{evidence}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FreeAnalysisSections({
  preview,
  locale,
}: {
  preview: Preview;
  locale: Locale;
}) {
  const copy = getMessages(locale);
  const analysis = preview.freeAnalysis;
  const firstService = analysis.combinations[0]?.services[0];
  const targetClient =
    analysis.positioning.targetClient ??
    (firstService
      ? `Teams buying ${firstService.name.toLowerCase()}`
      : "buyers in your strongest niche");
  const earningRange = previewEarningRange(preview);

  return (
    <>
      <section className="mt-12 border-t border-[var(--line)] pt-12">
        <FreeSectionTitle
          number="02"
          title={copy.whatSell}
          intro={copy.sellIntro}
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {analysis.combinations.flatMap((combination) =>
            combination.services.map((service) => (
              <article
                key={`${combination.elements.join("-")}-${service.name}`}
                className="card flex flex-col p-6"
              >
                <div className="eyebrow text-[var(--gold-deep)]">
                  {combination.elements.join(" × ")}
                </div>
                <h3 className="editorial-title mt-4 text-2xl leading-tight md:text-3xl">
                  {service.name}
                </h3>
                <p className="mt-4 leading-7 text-black/62">
                  {service.description}
                </p>
                <div className="mt-6 grid gap-3 border-t border-[var(--line)] pt-5 text-sm">
                  <div>
                    <div className="eyebrow text-black/45">
                      {copy.projectStructure}
                    </div>
                    <p className="mt-2 leading-6">{service.projectStructure}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--gold-soft)] px-3 py-1 font-black">
                      {service.speed_to_monetize} to monetize
                    </span>
                    <span className="rounded-full bg-black/5 px-3 py-1 font-black">
                      {service.location_dependency} location dependency
                    </span>
                  </div>
                </div>
              </article>
            )),
          )}
        </div>
        <p className="mt-7 max-w-5xl border-l-[3px] border-[var(--gold)] pl-5 text-lg font-bold leading-8 md:text-xl">
          {copy.reminder}
        </p>
      </section>

      <section className="mt-12 border-t border-[var(--line)] pt-12">
        <FreeSectionTitle
          number="03"
          title={copy.positionTitle}
          intro={copy.positionIntro}
        />
        <div className="card mt-8 grid gap-8 p-6 md:p-10">
          <FreePositionModule label={copy.yourPositioning}>
            <p className="max-w-[65ch] text-xl font-bold leading-8 md:text-2xl">
              {analysis.positioning.sentence}
            </p>
          </FreePositionModule>
          <FreePositionModule label={copy.leadEdge}>
            <p className="max-w-[65ch] text-lg font-black leading-8 md:text-xl">
              {analysis.positioning.leadWithEdge ??
                analysis.combinations[0]?.elements.join(" + ")}
            </p>
          </FreePositionModule>
          <FreePositionModule label={copy.serviceTitle}>
            <p className="editorial-title max-w-[65ch] text-2xl leading-tight md:text-3xl">
              {analysis.positioning.serviceTitle}
            </p>
            <p className="mt-2 max-w-[65ch] text-sm leading-6 text-black/55">
              {targetClient}
            </p>
          </FreePositionModule>
          <FreePositionModule label={copy.earning}>
            <p className="text-xl font-black md:text-2xl">{earningRange}</p>
          </FreePositionModule>
          <FreePositionModule label={copy.outreach}>
            <blockquote className="max-w-[65ch] text-lg leading-8 text-black/85">
              “{analysis.positioning.outreachAngle}”
            </blockquote>
          </FreePositionModule>
        </div>

        <div className="mt-12">
          <div className="eyebrow text-[var(--gold-deep)]">
            {copy.careerProspect}
          </div>
          <div className="mt-5 grid gap-5">
            {analysis.combinations.map(
              (combination) =>
                combination.careerProspect && (
                  <article
                    key={`${combination.elements.join("-")}-prospect`}
                    className="card p-6 md:p-9"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-5">
                      <div className="flex min-w-0 items-center gap-5">
                        {combination.careerProspect.imageUrl && (
                          <Image
                            src={combination.careerProspect.imageUrl}
                            alt={`${combination.careerProspect.name} portrait`}
                            width={128}
                            height={128}
                            unoptimized
                            className="h-24 w-24 shrink-0 rounded-full border-2 border-[var(--gold)] object-cover object-[center_18%] shadow-lg md:h-32 md:w-32"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="eyebrow text-[var(--gold-deep)]">
                            {copy.roleModel}
                          </div>
                          <h3 className="editorial-title mt-2 text-3xl font-black leading-none md:text-5xl">
                            {combination.careerProspect.name}
                          </h3>
                          <p className="mt-3 text-sm font-bold text-black/55 md:text-base">
                            {combination.careerProspect.roleModelTitle}
                          </p>
                          <div className="mt-3 text-sm font-black text-[var(--gold-deep)]">
                            {combination.elements.join(" × ")}
                          </div>
                        </div>
                      </div>
                      {combination.careerProspect.profileUrl && (
                        <a
                          href={combination.careerProspect.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-[var(--gold)]/50 bg-[var(--gold-soft)] px-3 py-2 text-[.68rem] font-black uppercase tracking-wider"
                        >
                          {copy.verifiedProfile} ↗
                        </a>
                      )}
                    </div>
                    <div className="mt-7 grid gap-6 md:grid-cols-2">
                      <FreeCareerField
                        label={copy.built}
                        value={combination.careerProspect.whatTheyBuilt}
                      />
                      <FreeCareerField
                        label={copy.relevant}
                        value={combination.careerProspect.whyRelevant}
                      />
                      <FreeCareerField
                        label={copy.different}
                        value={
                          combination.careerProspect.whatTheyDidDifferently
                        }
                      />
                      <FreeCareerField
                        label={copy.steal}
                        value={combination.careerProspect.stealThisMove}
                      />
                    </div>
                  </article>
                ),
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function FreeSectionTitle({
  number,
  title,
  intro,
}: {
  number: string;
  title: string;
  intro: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[70px_1fr_1fr] md:items-start">
      <div className="eyebrow text-[var(--gold-deep)]">{number}</div>
      <h2 className="editorial-title text-3xl md:text-4xl">{title}</h2>
      <p className="max-w-xl leading-7 text-black/62">{intro}</p>
    </div>
  );
}

function FreePositionModule({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-l-[3px] border-[var(--gold)] py-1 pl-5 md:pl-7">
      <div className="eyebrow mb-3 text-black/45">{label}</div>
      {children}
    </div>
  );
}

function FreeCareerField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-[3px] border-[var(--gold)] pl-5">
      <div className="eyebrow text-black/45">{label}</div>
      <p className="mt-3 max-w-[65ch] leading-7 text-black/75">{value}</p>
    </div>
  );
}

function LockedOpportunityFeed({
  preview,
  price,
  billingInterval,
  paying,
  onIntervalChange,
  onCheckout,
}: {
  preview: Preview;
  price: string;
  billingInterval: BillingInterval;
  paying: boolean;
  onIntervalChange(value: BillingInterval): void;
  onCheckout: () => void;
}) {
  const visibleCount = Math.min(preview.liveOpportunityCount, 10);
  const teasers = preview.opportunityTeasers ?? [];

  if (visibleCount === 0) {
    return (
      <section
        id="live-opportunities"
        className="mt-8 overflow-hidden rounded-[2rem] border-2 border-black bg-black p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.14)] md:p-9"
      >
        <div className="eyebrow text-[var(--gold-bright)]">
          Live opportunity scan
        </div>
        <h2 className="display mt-3 max-w-4xl text-3xl text-white md:text-4xl">
          Your market search is expanding across more buyer signals
        </h2>
        <p className="mt-4 max-w-3xl leading-7 text-white/65">
          Your Capacity Graph is ready. Activate SuperCharlie below to
          keep widening the search, refresh demand daily, and reach the
          strongest verified buyers.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {[
            "Freelance + contract demand",
            "Consulting + fractional signals",
            "Direct buyer signals",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/15 bg-white/[.04] p-4 text-sm font-bold"
            >
              ↗ {item}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      id="live-opportunities"
      className="mt-8 scroll-mt-8 overflow-hidden rounded-[2rem] border-2 border-black bg-[#f6f3ec] shadow-[0_24px_70px_rgba(0,0,0,0.10)]"
    >
      <div className="grid gap-6 border-b border-black/15 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-9">
        <div>
          <div className="eyebrow text-[var(--gold-deep)]">
            Live opportunity matches found
          </div>
          <h2 className="display mt-3 max-w-4xl text-3xl leading-tight md:text-5xl">
            Your top {visibleCount} live{" "}
            {visibleCount === 1 ? "opportunity is" : "opportunities are"} ready
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-black/62">
            See the buyer, compensation, direct link, and exactly why each
            opportunity fits your Capacity Graph.
          </p>
        </div>
        <div className="rounded-full border border-[var(--gold-deep)] bg-[var(--gold-soft)] px-4 py-2 text-xs font-black uppercase tracking-[.14em]">
          Updated from live public demand
        </div>
      </div>
      <div className="relative p-4 md:p-7">
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: visibleCount }, (_, index) => {
            const teaser = teasers[index];
            return (
              <article
                key={`${teaser?.source ?? "locked"}-${index}`}
                className="relative overflow-hidden rounded-2xl border border-black/15 bg-white p-5 shadow-[0_10px_28px_rgba(0,0,0,0.05)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-[.16em] text-[var(--gold-deep)]">
                    Match {String(index + 1).padStart(2, "0")}
                  </span>
                  {teaser?.fitLabel && (
                    <span className="rounded-full bg-[var(--gold-soft)] px-3 py-1 text-[.68rem] font-black">
                      {teaser.fitLabel}
                    </span>
                  )}
                </div>
                <div
                  aria-label="Opportunity title locked"
                  className="mt-5 h-6 w-[82%] rounded-md bg-[linear-gradient(90deg,rgba(0,0,0,.15),rgba(198,145,35,.18),rgba(0,0,0,.1))] blur-[3px]"
                />
                <div
                  aria-label="Buyer and compensation locked"
                  className="mt-3 h-4 w-[58%] rounded bg-black/10 blur-[3px]"
                />
                <div className="mt-5 flex flex-wrap gap-2 text-[.68rem] font-black uppercase tracking-[.08em] text-black/58">
                  {teaser?.source && (
                    <span className="rounded-full border border-black/10 px-2.5 py-1">
                      {teaser.source}
                    </span>
                  )}
                  {teaser?.kind && (
                    <span className="rounded-full border border-black/10 px-2.5 py-1">
                      {formatOpportunityKind(teaser.kind)}
                    </span>
                  )}
                  {teaser?.speedToMonetize && (
                    <span className="rounded-full border border-black/10 px-2.5 py-1">
                      {teaser.speedToMonetize} path
                    </span>
                  )}
                  {teaser?.locationDependency && (
                    <span className="rounded-full border border-black/10 px-2.5 py-1">
                      {teaser.locationDependency} location dependency
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#f6f3ec] via-[#f6f3ec]/92 to-transparent" />
        <div className="relative z-10 mx-auto -mt-16 max-w-xl rounded-[1.6rem] border border-[var(--gold-deep)] bg-black p-6 text-center text-white shadow-[0_24px_55px_rgba(0,0,0,.28)] md:p-8">
          <div className="eyebrow text-[var(--gold-bright)]">
            Your matches are ready to act on
          </div>
          <h3 className="mt-3 text-2xl font-black tracking-[-.03em]">
            Unlock the opportunities — then keep SuperCharlie scanning
          </h3>
          <div
            className="mt-5 grid grid-cols-2 gap-2"
            aria-label="Billing plan"
          >
            {(["week", "month"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onIntervalChange(value)}
                className={`rounded-full border px-3 py-2 text-xs font-black ${billingInterval === value ? "border-[var(--gold)] bg-[var(--gold)] text-black" : "border-white/25"}`}
              >
                {value === "week" ? "Weekly · $9.99" : "Monthly · $29.99"}
              </button>
            ))}
          </div>
          <button
            onClick={onCheckout}
            disabled={paying}
            className="button gold-surface mt-4 w-full border-[var(--gold-deep)]"
          >
            {paying
              ? "Opening secure checkout…"
              : `Start free 2-day trial — ${price}/${billingInterval}`}
          </button>
          <p className="mt-3 text-xs leading-5 text-white/55">
            Then {price}/{billingInterval}. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
}

function formatOpportunityKind(
  value: NonNullable<
    NonNullable<Preview["opportunityTeasers"]>[number]["kind"]
  >,
) {
  return value.replaceAll("_", " ");
}
