import { supabaseConfig, supabaseRest } from "@/lib/storage";
import { countCapabilityMatches, type MatchableCandidateProfile } from "@/lib/company-need-match";

export type CompanyNeedInput = { need: string; successOutcome: string; expertise: string[]; expertiseOther?: string; engagementType: string; budgetRange: string; locationTimezone: string; workEmail: string };
type CompanyNeedRow = CompanyNeedInput & { id: string; notified_at?: string | null };

async function candidateProfiles(candidateProfileId?: string) {
  if (!supabaseConfig()) return [] as MatchableCandidateProfile[];
  const filter = candidateProfileId ? `id=eq.${encodeURIComponent(candidateProfileId)}&` : "";
  return supabaseRest(`candidate_profiles?${filter}select=id,top_skills,skill_combinations,languages,destination_markets&limit=500`) as Promise<MatchableCandidateProfile[]>;
}
function appUrl() { return process.env.NEXT_PUBLIC_APP_URL ?? "https://getmonetizable.com"; }

async function sendCandidateMatchEmail(need: CompanyNeedRow, matchCount: number) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OPPORTUNITY_EMAIL_FROM;
  if (!apiKey || !from) return false;
  const signupUrl = new URL("/auth", appUrl());
  signupUrl.searchParams.set("mode", "signup");
  signupUrl.searchParams.set("next", "/for-companies?submitted=1");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from, to: [need.workEmail], subject: "Monetizable found capabilities that match your need",
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#111;background:#faf8f2;padding:32px;border-radius:24px"><h1 style="font-size:30px;margin:0 0 14px">A capability match is available</h1><p style="font-size:16px;line-height:1.65;color:#555">Monetizable found ${matchCount} candidate profile${matchCount === 1 ? "" : "s"} with proven capabilities relevant to the expertise you selected. We have not shared anyone’s private details.</p><p style="font-size:16px;line-height:1.65;color:#555">Create a free company account so we can keep this request connected to you and contact you about the right match.</p><p style="margin:28px 0"><a href="${signupUrl.toString()}" style="display:inline-block;background:#e4b13b;color:#111;padding:14px 24px;border-radius:999px;font-weight:700;text-decoration:none">Create company account</a></p></div>`,
    }),
  });
  return response.ok;
}

export async function createCompanyNeed(input: CompanyNeedInput) {
  if (!supabaseConfig()) throw new Error("Company need storage is not configured");
  const rows = await supabaseRest("company_needs", { method: "POST", body: JSON.stringify({ need: input.need, success_outcome: input.successOutcome, expertise: input.expertise, expertise_other: input.expertiseOther || null, engagement_type: input.engagementType, budget_range: input.budgetRange, location_timezone: input.locationTimezone, work_email: input.workEmail.toLowerCase() }) }) as Array<Record<string, unknown>>;
  const row = rows?.[0];
  if (!row?.id) throw new Error("Company need was not returned after save");
  // The request is already saved. A matching/email outage must not make the
  // form report failure and cause the company to submit the same request again.
  try {
  const matchCount = countCapabilityMatches(input, await candidateProfiles());
  const updatedAt = new Date().toISOString();
  await supabaseRest(`company_needs?id=eq.${encodeURIComponent(String(row.id))}`, { method: "PATCH", body: JSON.stringify({ matched_candidate_count: matchCount, updated_at: updatedAt }) });
  let emailSent = false;
  if (matchCount > 0) {
    emailSent = await sendCandidateMatchEmail({ ...input, id: String(row.id) }, matchCount);
    if (emailSent) await supabaseRest(`company_needs?id=eq.${encodeURIComponent(String(row.id))}`, { method: "PATCH", body: JSON.stringify({ notified_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
  }
  return { id: String(row.id), matchCount, emailSent };
  } catch (error) {
    console.error("Company need saved; matching notification pending", error);
    return { id: String(row.id), matchCount: 0, emailSent: false };
  }
}

export async function notifyMatchingCompanyNeeds(candidateProfileId?: string) {
  if (!supabaseConfig()) return;
  const [needs, profiles] = await Promise.all([
    supabaseRest("company_needs?status=eq.open&notified_at=is.null&select=id,need,success_outcome,expertise,expertise_other,engagement_type,budget_range,location_timezone,work_email,notified_at&limit=200") as Promise<Array<Record<string, unknown>>>,
    candidateProfiles(candidateProfileId),
  ]);
  for (const raw of needs ?? []) {
    const need: CompanyNeedRow = { id: String(raw.id), need: String(raw.need), successOutcome: String(raw.success_outcome), expertise: Array.isArray(raw.expertise) ? raw.expertise.map(String) : [], expertiseOther: raw.expertise_other ? String(raw.expertise_other) : undefined, engagementType: String(raw.engagement_type), budgetRange: String(raw.budget_range), locationTimezone: String(raw.location_timezone), workEmail: String(raw.work_email), notified_at: raw.notified_at ? String(raw.notified_at) : null };
    const matchCount = countCapabilityMatches(need, profiles);
    if (!matchCount || !await sendCandidateMatchEmail(need, matchCount)) continue;
    await supabaseRest(`company_needs?id=eq.${encodeURIComponent(need.id)}&notified_at=is.null`, { method: "PATCH", body: JSON.stringify({ matched_candidate_count: matchCount, notified_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
  }
}
