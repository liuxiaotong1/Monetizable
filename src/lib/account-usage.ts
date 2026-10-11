import { supabaseRest } from "@/lib/storage";

export class SubscriptionRequired extends Error {
  constructor() { super("Your two free uses or direction changes have been used. Subscribe to continue."); }
}
export async function reserveAnalysis(userId: string, id: string): Promise<string> {
  return supabaseRest("rpc/reserve_analysis", { method: "POST", body: JSON.stringify({ p_user: userId, p_id: id }) });
}
export async function finishAnalysisUsage(userId: string, id: string, success: boolean) {
  await supabaseRest(`account_usage_events?id=eq.${id}&user_id=eq.${userId}&status=eq.reserved`, {
    method: "PATCH", body: JSON.stringify({ status: success ? "complete" : "failed", updated_at: new Date().toISOString() }),
  });
}
