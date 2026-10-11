"use client";
import { useDisplayTranslations } from "@/components/localization-provider";
import { translateText } from "@/lib/localized-text";
import { Localized } from "@/components/localized";


import { Header } from "@/components/brand";
import { Stack } from "@/components/stack";
import { ensureCapacityGraph } from "@/lib/capacity-graph";
import { RoleModelPortrait } from "@/components/role-model-portrait";
import type { AnalysisResult, Opportunity } from "@/lib/types";
import { highestPriceRange, numericPriceDisplay } from "@/lib/pricing";
import { trackClient } from "@/lib/client-analytics";
import { getMessages, type Locale } from "@/lib/i18n";
import { isRemoteOnlyOpportunity } from "@/lib/remote-only";

function trackClick(resultId: string, opportunity: Opportunity) {
  trackClient("opportunity_clicked", { analysisId: resultId, opportunityId: opportunity.id, source: opportunity.source });
}

function copyReadyOutreach(value: string, positioning: string, targetClient: string, locale: Locale, translations: Record<string, string>) {
  if (/^(hi|hello|hey|dear|i help|i work|i specialize|bonjour|bonsoir|salut|madame|monsieur|je )/i.test(value.trim())) return translateText(value, locale, translations);
  const statement = translateText(positioning, locale, translations);
  const buyer = translateText(targetClient, locale, translations);
  return locale === "fr"
    ? `Bonjour — ${statement} Je vous contacte car cette offre pourrait intéresser ${buyer}. Seriez-vous ouvert à une courte mission pilote rémunérée ?`
    : `Hi — ${statement} I’m reaching out because this may be relevant to ${buyer}. Would you be open to a small paid pilot?`;
}

function constructiveCombinationCopy(value: string) {
  if (/no evidence of (?:their|the) combined application|demonstrates? expertise in each of these areas separately/i.test(value)) {
    return "You already demonstrate strength across all 3 areas. We're going to combine and position them as one marketable offer.";
  }
  return value;
}

export function Report({ result: rawResult, locale }: { result: AnalysisResult; locale: Locale }) {
  const translations = useDisplayTranslations();
  const result = ensureCapacityGraph(rawResult);
  const copy = getMessages(locale);
  const topOpportunities = result.opportunities.filter(isRemoteOnlyOpportunity).slice(0, 3);
  const fastestService = result.combinations[0]?.services[0];
  const targetClient = result.positioning.targetClient ?? (fastestService ? `Teams buying ${fastestService.name.toLowerCase()}` : "buyers in your strongest niche");
  const pricing = result.pricing[0];
  const highestPricing = highestPriceRange(pricing?.range);
  const earningRange = numericPriceDisplay(result.positioning.estimatedEarningRange ?? highestPricing) ?? "$1,500–$5,000";
  const outreach = copyReadyOutreach(result.positioning.outreachAngle, result.positioning.sentence, targetClient, locale, translations);

  return <Localized><main className="min-h-screen pb-24">
    <Header locale={locale} />
    <section className="shell pt-8 md:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--line)] pb-8">
        <div>
          <div className="eyebrow text-[var(--gold-deep)]">{copy.reportEyebrow}</div>
          <h1 className="editorial-title mt-3 text-4xl md:text-6xl">{copy.reportTitle}</h1>
        </div>
        <div className="gold-surface rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider">{result.paid ? copy.unlocked : (locale === "fr" ? "Analyse prête" : "Analysis ready")}</div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-4"><a href={`/unlock/${result.id}`} className="button gold-surface">Build my personal skill stack and outreach {result.paid ? "→" : "🔒"}</a><p className="text-sm text-black/60">{result.paid ? "Emails are sent only after your approval." : "One-time unlock. Your analysis remains free to read."}</p></div>

      {fastestService && <div className="priority-strip mt-7 grid gap-px overflow-hidden rounded-2xl border border-black bg-white/25 sm:grid-cols-2">
        <Priority label={copy.speed} value={fastestService.speed_to_monetize} />
        <Priority label={copy.locationDependency} value={fastestService.location_dependency === "low" ? copy.lowPortable : fastestService.location_dependency} />
      </div>}

      <section className="py-12">
        <SectionTitle number="01" title={copy.stackTitle} intro={copy.stackIntro} />
        <div className="mt-8 grid gap-5">
          {result.combinations.slice(0, 3).map((combo, index) => <article key={combo.elements.join()} className={`card p-7 md:p-10 ${index === 0 ? "discovery-card text-white" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`eyebrow ${index === 0 ? "text-[var(--gold-bright)]" : "text-black/45"}`}>{copy.rank} {String(index + 1).padStart(2, "0")}</div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${index === 0 ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-bright)]" : "border-[var(--line)] bg-black/[.03]"}`}>{combo.demandLevel === "Low" ? "Selective Demand" : `${combo.demandLevel} demand`}</span>
            </div>
            <Stack elements={combo.elements} className={`mt-7 text-[clamp(1.45rem,2.25vw,2rem)] leading-[1.18] ${index === 0 ? "text-[var(--gold-bright)]" : ""}`} />
            <p className={`mt-7 max-w-[74ch] text-base leading-8 ${index === 0 ? "text-white/72" : "text-black/65"}`}>{constructiveCombinationCopy(combo.differentiation)}</p>
            <div className={`mt-8 rounded-2xl border p-5 ${index === 0 ? "border-[var(--gold)]/55 bg-white/[.07]" : "border-[var(--gold)]/45 bg-[var(--gold-soft)]/35"}`}>
              <div className={`eyebrow ${index === 0 ? "text-[var(--gold-bright)]" : "text-[var(--gold-deep)]"}`}>{copy.evidence}</div>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {combo.evidence.map((evidence) => <li key={evidence} className={`flex gap-3 text-sm leading-6 ${index === 0 ? "text-white/85" : "text-black/75"}`}><span className="font-black text-[var(--gold-bright)]">✓</span><span>{evidence}</span></li>)}
              </ul>
            </div>
          </article>)}
        </div>
      </section>

      <section className="border-t border-[var(--line)] py-12">
        <SectionTitle number="02" title={copy.whatSell} intro={copy.sellIntro} />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {result.combinations.slice(0, 3).flatMap((combo) => combo.services.map((service) => <article key={service.name} className="card flex flex-col p-6">
            <div className="eyebrow text-[var(--gold-deep)]">{combo.elements.join(" × ")}</div>
            <h3 className="editorial-title mt-4 text-2xl leading-tight md:text-3xl">{service.name}</h3>
            <p className="mt-4 leading-7 text-black/62">{service.description}</p>
            <div className="mt-6 border-t border-[var(--line)] pt-5"><div className="eyebrow text-black/45">{copy.projectStructure}</div><p className="mt-2 text-sm leading-6">{service.projectStructure}</p></div>
          </article>))}
        </div>
        <p className="mt-7 max-w-5xl border-l-[3px] border-[var(--gold)] pl-5 text-lg font-bold leading-8 md:text-xl">{copy.reminder}</p>
      </section>

      <section className="border-t border-[var(--line)] py-12">
        <SectionTitle number="03" title={`${topOpportunities.length} ${copy.opportunities}`} intro={copy.opportunitiesIntro} />
        {result.searchStatus !== "complete" && <p className="mt-5 rounded-2xl bg-[var(--gold-soft)] p-4 text-sm">Search coverage was {result.searchStatus}. The list contains only results we actually found and validated.</p>}
        <div className="mt-8 grid gap-4">
          {topOpportunities.length ? topOpportunities.map((opportunity, index) => <article key={opportunity.id} className="card grid gap-5 p-5 md:grid-cols-[48px_1fr_auto] md:items-start md:p-7">
            <div className="display text-3xl text-black/30">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="eyebrow text-[var(--gold-deep)]">{opportunity.source}</span><span className="rounded-full bg-[var(--gold-soft)] px-2 py-1 text-[.68rem] font-black">{opportunity.fitLabel}</span><span className="rounded-full bg-[var(--gold-soft)] px-2 py-1 text-[.68rem] font-black">{opportunity.speed_to_monetize} to monetize</span><span className="rounded-full bg-black/5 px-2 py-1 text-[.68rem] font-black">{opportunity.location_dependency} location dependency</span></div>
              <h3 className="mt-3 text-xl font-black tracking-[-.02em]">{opportunity.title}</h3>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-black/50">{opportunity.compensation && <span>◉ {opportunity.compensation}</span>}{opportunity.postedDate && <span>Posted {opportunity.postedDate}</span>}{opportunity.location && <span>{opportunity.location}</span>}<span>{opportunity.remoteStatus}</span></div>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-black/62"><strong className="text-black">{copy.whyMatches}: </strong>{opportunity.fitReason}</p>
            </div>
            <a href={opportunity.url} target="_blank" rel="noopener noreferrer" onClick={() => trackClick(result.id, opportunity)} className="button secondary min-w-36">{copy.viewOpportunity} ↗</a>
          </article>) : <div className="card p-8"><h3 className="text-xl font-black">The live search is expanding across more buyer signals.</h3><p className="mt-3 text-black/60">Your positioning is ready while SuperCharlie broadens its search across freelance, consulting, fractional and direct buyer demand.</p></div>}
        </div>
      </section>

      <section className="border-t border-[var(--line)] py-12">
        <SectionTitle number="04" title={copy.positionTitle} intro={copy.positionIntro} />
        <div className="card mt-8 grid gap-8 p-6 md:p-10">
          <PositionModule label={copy.yourPositioning}><p className="max-w-[65ch] text-xl font-bold leading-8 md:text-2xl">{result.positioning.sentence}</p></PositionModule>
          <PositionModule label={copy.leadEdge}><p className="max-w-[65ch] text-lg font-black leading-8 md:text-xl">{result.positioning.leadWithEdge ?? result.combinations[0].elements.join(" + ")}</p></PositionModule>
          <PositionModule label={copy.serviceTitle}><p className="editorial-title max-w-[65ch] text-2xl leading-tight md:text-3xl">{result.positioning.serviceTitle}</p><p className="mt-2 max-w-[65ch] text-sm leading-6 text-black/55">{targetClient}</p></PositionModule>
          <PositionModule label={copy.earning}><p className="text-xl font-black md:text-2xl">{earningRange}</p></PositionModule>
          <PositionModule label={copy.outreach}><blockquote className="max-w-[65ch] text-lg leading-8 text-black/85">“{outreach}”</blockquote></PositionModule>
        </div>

        <div className="mt-12">
          <div className="eyebrow text-[var(--gold-deep)]">{copy.careerProspect}</div>
          <div className="mt-5 grid gap-5">
            {result.combinations.slice(0, 3).map((combo) => combo.careerProspect && <article key={`${combo.elements.join("-")}-prospect`} className="card p-6 md:p-9">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex min-w-0 items-center gap-5">
                  <RoleModelPortrait prospect={combo.careerProspect} />
                  <div className="min-w-0">
                    <div className="eyebrow text-[var(--gold-deep)]">{copy.roleModel}</div>
                    <h3 className="editorial-title mt-2 text-3xl font-black leading-none md:text-5xl"><span translate="no">{combo.careerProspect.name}</span></h3>
                    <p className="mt-3 text-sm font-bold text-black/55 md:text-base">{combo.careerProspect.roleModelTitle}</p>
                    <div className="mt-3 text-sm font-black text-[var(--gold-deep)]">{combo.elements.join(" × ")}</div>
                  </div>
                </div>
                {combo.careerProspect.profileUrl && <a href={combo.careerProspect.profileUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[var(--gold)]/50 bg-[var(--gold-soft)] px-3 py-2 text-[.68rem] font-black uppercase tracking-wider">{copy.verifiedProfile} ↗</a>}
              </div>
              <div className="mt-7 grid gap-6 md:grid-cols-2">
                <CareerField label={copy.built} value={combo.careerProspect.whatTheyBuilt} />
                <CareerField label={copy.relevant} value={combo.careerProspect.whyRelevant} />
                <CareerField label={copy.different} value={combo.careerProspect.whatTheyDidDifferently} />
                <CareerField label={copy.steal} value={combo.careerProspect.stealThisMove} />
              </div>
            </article>)}
          </div>
        </div>
      </section>

      <div className="border-t border-[var(--line)] pt-7"><a href={`/unlock/${result.id}`} className="button gold-surface">Build my personal skill stack and outreach {result.paid ? "→" : "🔒"}</a><p className="mt-3 text-sm text-black/60">{result.paid ? "Choose your direction. Emails are sent only after your approval." : "One-time unlock. Your analysis remains free to read."}</p></div>
    </section>
  </main></Localized>;
}

function SectionTitle({ number, title, intro }: { number: string; title: string; intro: string }) {
  return <Localized><div className="grid gap-3 md:grid-cols-[70px_1fr_1fr] md:items-start"><div className="eyebrow text-[var(--gold-deep)]">{number}</div><h2 className="editorial-title text-3xl md:text-4xl">{title}</h2><p className="max-w-xl leading-7 text-black/62">{intro}</p></div></Localized>;
}

function PositionModule({ label, children }: { label: string; children: React.ReactNode }) {
  return <Localized><div className="border-l-[3px] border-[var(--gold)] py-1 pl-5 md:pl-7"><div className="eyebrow mb-3 text-black/45">{label}</div>{children}</div></Localized>;
}

function CareerField({ label, value }: { label: string; value: string }) {
  return <Localized><div className="border-l-[3px] border-[var(--gold)] pl-5"><div className="eyebrow text-black/45">{label}</div><p className="mt-3 max-w-[65ch] leading-7 text-black/75">{value}</p></div></Localized>;
}

function Priority({ label, value }: { label: string; value: string }) {
  return <Localized><div className="bg-black p-4 md:px-6"><div className="eyebrow text-[var(--gold-bright)]">{label}</div><div className="mt-2 text-lg font-black capitalize">{value}</div></div></Localized>;
}
