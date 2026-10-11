
import { Localized } from "@/components/localized";
import { currentUser } from "@/lib/auth";
import { isAccountAdmin } from "@/lib/admin";
import { getAnalysis, supabaseRest } from "@/lib/storage";
import { redirect } from "next/navigation";
import { SubscriptionGate } from "@/components/subscription-gate";
import { config, formatAgentPrice } from "@/lib/config";
import { directionValue, monthlySavings } from "@/lib/subscription-presentation";
export default async function SubscribePage() {
  const user=await currentUser(); if(!user) redirect("/auth?next=/subscribe");
  if (await isAccountAdmin(user.id)) redirect("/agent");
  const rows=await supabaseRest(`candidate_scans?select=analysis_id,candidate_profiles!inner(user_id)&candidate_profiles.user_id=eq.${user.id}&order=created_at.desc&limit=1`);
  if(!rows?.[0]) redirect("/#analyze");
  const [analysis, onboarding] = await Promise.all([
    getAnalysis(rows[0].analysis_id),
    supabaseRest(`agent_onboarding?user_id=eq.${user.id}&select=intent_capabilities&limit=1`),
  ]);
  const value = directionValue(analysis, onboarding?.[0]?.intent_capabilities ?? []);
  const savings = monthlySavings(config.agentWeeklyPriceCents, config.agentMonthlyPriceCents);
  return <Localized><main><SubscriptionGate analysisId={rows[0].analysis_id} value={value}
    monthlyPrice={formatAgentPrice(config.agentMonthlyPriceCents)} weeklyPrice={formatAgentPrice(config.agentWeeklyPriceCents)}
    savings={savings > 0 ? formatAgentPrice(savings) : undefined} fourWeeksPrice={formatAgentPrice(config.agentWeeklyPriceCents * 4)}/></main></Localized>;
}
