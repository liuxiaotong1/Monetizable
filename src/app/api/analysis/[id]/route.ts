import { getDisplayTranslations } from "@/lib/display-translations";
import { getRequestLocale } from "@/lib/request-locale";
import { NextResponse } from "next/server";
import { analysisBelongsToUser, claimAnalysisForUser, deleteAnalysis, getAnalysis } from "@/lib/storage";
import { toPreview } from "@/lib/preview";
import { currentUser } from "@/lib/auth";
import { isAccountAdmin } from "@/lib/admin";
import { openAnalysis } from "@/lib/analysis-token";
import { canViewFullReport } from "@/lib/access-policy";
import { agentOnboardingForUser, candidateProfileIdForAnalysis } from "@/lib/opportunity-agent/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

async function canAccessAnalysis(request: Request, id: string, userId: string) {
  if (await analysisBelongsToUser(id, userId)) return true;
  // Recovery payloads can contain a complete CV/report: never require them in
  // HTTP headers, which have much smaller platform limits than request bodies.
  const body = request.method === "POST" || request.method === "DELETE" ? await request.json().catch(() => ({})) : {};
  const recovery = openAnalysis(typeof body.recoveryToken === "string" ? body.recoveryToken : "");
  return recovery?.id === id ? claimAnalysisForUser(id, userId) : false;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!await canAccessAnalysis(request, id, user.id)) return NextResponse.json({ error: "This analysis belongs to another account." }, { status: 403 });
  const result = await getAnalysis(id);
  if (!result) return NextResponse.json({ error: "This analysis has expired or was deleted." }, { status: 404 });
  // Preserve the saved analysis. Translation changes presentation only, without
  // rerunning analysis, consuming quota, or writing to the report.
  const onboarding = await agentOnboardingForUser(user.id);
  const directionSelected = Boolean(onboarding?.intent_capabilities?.length && onboarding.candidate_profile_id === await candidateProfileIdForAnalysis(id));
  const visible = (canViewFullReport(result.paid) || await isAccountAdmin(user.id)) ? { result, directionSelected } : { preview: toPreview(result) };
  const locale = await getRequestLocale();
  const translations = locale === "fr" || result.locale === "fr" || /[\p{Script=Han}àâçéèêëîïôùûüœ]/u.test(JSON.stringify([result.combinations, result.positioning]))
    ? await getDisplayTranslations("result" in visible ? visible.result : visible.preview, locale) : {};
  return NextResponse.json({ ...visible, ...(Object.keys(translations).length ? { translations } : {}) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("Analysis retrieval failed", error);
    return NextResponse.json({ error: "Your analysis could not be loaded right now. Please try again.", retryable: true }, { status: 503 });
  }
}

export const POST = GET;

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!await canAccessAnalysis(request, id, user.id)) return NextResponse.json({ error: "This analysis belongs to another account." }, { status: 403 });
  await deleteAnalysis(id);
  return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Analysis deletion failed", error);
    return NextResponse.json({ error: "Deletion could not be completed. Please try again." }, { status: 503 });
  }
}
