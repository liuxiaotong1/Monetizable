import { DisplayTranslations } from "@/components/localization-provider";
import { getDisplayTranslations } from "@/lib/display-translations";

import { Localized } from "@/components/localized";
import { Header } from "@/components/brand";
import { AgentFeed } from "@/components/agent-feed";
import { AgentControls } from "@/components/agent-controls";
import { AgentRadar } from "@/components/agent-radar";
import { AgentOnboarding } from "@/components/agent-onboarding";
import { AgentProcess } from "@/components/agent-process";
import { SuperCharlieGuide } from "@/components/supercharlie-guide";
import { SuperCharlieCompanion } from "@/components/supercharlie-companion";
import { currentUser } from "@/lib/auth";
import { agentFeed, agentJobsForUser, agentOnboardingForUser, agentRadarStats, analysisIdForCandidateProfile, applicationProfileForUser, authorizationForUser, capacityGraphForCandidate, linkSubscriptionUser, subscriptionForUser } from "@/lib/opportunity-agent/storage";
import { getRequestLocale } from "@/lib/request-locale";
import { getAgentCopy } from "@/lib/agent-copy";
import { redirect } from "next/navigation";
import { PAYWALL_ENABLED } from "@/lib/access-policy";
import { canBuildSkillStack } from "@/lib/skill-stack-access";

export const dynamic = "force-dynamic";

export default async function AgentPage({ searchParams }: { searchParams: Promise<{ setup?: string; scan?: string }> }) {
  const locale = await getRequestLocale();
  const copy = getAgentCopy(locale);
  const query = await searchParams;
  const user = await currentUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/agent${query.setup ? `?setup=${query.setup}` : ""}`)}`);
  if (user.email) await linkSubscriptionUser(user.email, user.id);
  const subscription = await subscriptionForUser(user.id);
  if (!subscription && !PAYWALL_ENABLED) redirect("/?welcome=supercharlie#analyze");
  if (!subscription) return <Localized><main className="min-h-screen pb-20"><Header locale={locale} accountEmail={user.email}/><section className="shell pt-10 md:pt-16"><div className="eyebrow text-[var(--gold-deep)]">Account check</div><h1 className="editorial-title mt-4 max-w-4xl text-4xl md:text-6xl">This account is not linked to your Agent subscription</h1><p className="mt-5 max-w-3xl leading-7 text-black/60">You are signed in as <strong className="text-black">{user.email}</strong>. Agent access is linked only to the email used for activation or checkout.</p><div className="mt-7 flex flex-wrap gap-3"><a href="/auth?next=/agent" className="button">Use the subscribed account</a><a href="/?welcome=supercharlie#analyze" className="button secondary">Run a free analysis</a></div><SuperCharlieGuide compact title="SuperCharlie is online—switch to the subscribed account to continue." body="Your existing subscription and private market data remain attached to the email used when Agent access was activated."/></section></main></Localized>;
  const [graph, onboarding, setupProfile, setupAuthorization] = await Promise.all([
    capacityGraphForCandidate(subscription.candidate_profile_id),
    agentOnboardingForUser(user.id),
    applicationProfileForUser(user.id),
    authorizationForUser(user.id),
  ]);
  if (!graph) redirect("/?welcome=supercharlie#analyze");
  const graphTranslations = locale === "fr" ? await getDisplayTranslations(graph, locale) : {};
  const onboardingComplete = onboarding?.completed_at && onboarding?.candidate_profile_id === subscription.candidate_profile_id;
  const existingAnalysisId = await analysisIdForCandidateProfile(subscription.candidate_profile_id);
  if (!existingAnalysisId) redirect("/?welcome=supercharlie#analyze");
  if (existingAnalysisId && !await canBuildSkillStack(user.id, existingAnalysisId)) redirect(`/unlock/${existingAnalysisId}`);
  if (!onboardingComplete || query.setup === "intent") return <DisplayTranslations translations={graphTranslations}><Localized><main className="min-h-screen pb-20"><Header locale={locale} accountEmail={user.email}/><section className="shell pt-10 md:pt-16"><div className="eyebrow text-[var(--gold-deep)]">{copy.setupEyebrow}</div><h1 className="editorial-title mt-4 max-w-4xl text-4xl md:text-6xl">{copy.setupTitle}</h1><p className="mt-5 max-w-3xl leading-7 text-black/60">{copy.setupBody}</p><SuperCharlieGuide compact title="Let’s turn your strongest capability into a visible offer."/><AgentOnboarding graph={graph} existingAnalysisId={existingAnalysisId} selectedIntentIndex={query.setup === "intent" || !onboarding?.intent_capabilities?.length ? null : onboarding.intent_combination_index ?? -1} initialProfile={setupProfile} locale={locale} hasOngoingApproval={Boolean(setupAuthorization?.consent_version && setupAuthorization.status !== "revoked")} authorizationStatus={setupAuthorization?.status}/></section></main></Localized></DisplayTranslations>;
  const [matches, jobs, radarStats, analysisId] = await Promise.all([agentFeed(user.id, subscription.candidate_profile_id), agentJobsForUser(user.id, subscription.candidate_profile_id), agentRadarStats(user.id, subscription.candidate_profile_id), analysisIdForCandidateProfile(subscription.candidate_profile_id)]);
  const translations = locale === "fr" ? { ...graphTranslations, ...await getDisplayTranslations(matches, locale) } : {};
  const combinationLabels = graph?.combinations.map((combination) => combination.elements.join(" × ")) ?? [];
  const hasResults = (matches?.length ?? 0) > 0 || radarStats.hotLeads > 0 || radarStats.strongOpportunities > 0;
  const radarKey = `${radarStats.lastCompletedAt ?? "pending"}:${radarStats.capacityMatches}:${radarStats.strongOpportunities}:${radarStats.hotLeads}`;
  return <DisplayTranslations translations={translations}><Localized><main className="min-h-screen pb-20">
    <Header locale={locale} accountEmail={user.email}/>
    <SuperCharlieCompanion message={radarStats.capacityMatches > 0 ? `I found ${radarStats.capacityMatches} opportunities for you.` : "I’m scanning the market for you."}/>
    <section className="shell pt-10 md:pt-16">
      <div className="eyebrow text-[var(--gold-deep)]">Your opportunity shortlist</div>
      <h1 className="editorial-title mt-4 max-w-4xl text-4xl md:text-6xl">Found for you. Ready for your next move.</h1>
      <a href="/agent?setup=intent" className="button gold-surface mt-5 inline-flex w-full justify-center sm:w-auto">Change direction <span aria-hidden="true">↗</span></a>
      <p className="mt-5 max-w-3xl leading-7 text-black/60">SuperCharlie finds and ranks relevant opportunities. Review the evidence, choose where to apply, and make the final submission on the platform.</p>
      <AgentRadar key={radarKey} initialStats={radarStats} locale={locale} startImmediately={query.scan === "1"} analysisHref={analysisId ? `/preview/${analysisId}` : undefined}/>
      <AgentFeed initialMatches={matches ?? []} initialJobs={jobs ?? []} combinationLabels={combinationLabels} scanning={!hasResults && (radarStats.scanning || !radarStats.hasScanned)}/>
      <AgentProcess initialJobs={jobs ?? []} initialRadar={{ scanning: radarStats.scanning, marketSignalsScanned: radarStats.marketSignalsScanned, capacityMatches: radarStats.capacityMatches, hotLeads: radarStats.hotLeads, platformLeads: radarStats.platformLeads, emailLeads: radarStats.emailLeads }}/>
      <AgentControls/>
    </section>
  </main></Localized></DisplayTranslations>;
}
