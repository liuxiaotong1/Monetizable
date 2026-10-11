import { analysisBelongsToUser, getAnalysis, supabaseRest } from "@/lib/storage";
import { isAccountAdmin } from "@/lib/admin";

// Separate from report visibility: reading an analysis remains free.
export async function canBuildSkillStack(userId: string, analysisId: string) {
  if (!await analysisBelongsToUser(analysisId, userId)) return false;
  if (await isAccountAdmin(userId)) return true;
  const analysis = await getAnalysis(analysisId);
  if (!analysis) return false;
  if (analysis.paid) return true;
  // Honour existing subscribers; never treat the synthetic "free" entitlement as payment.
  const rows = await supabaseRest(`agent_subscriptions?user_id=eq.${encodeURIComponent(userId)}&status=in.(active,trialing)&select=id&limit=1`);
  return Boolean(rows?.length);
}
