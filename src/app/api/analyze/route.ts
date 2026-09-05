import { NextResponse } from "next/server";
import { analyzeProfile } from "@/lib/ai";
import { trackServer } from "@/lib/analytics";
import { config } from "@/lib/config";
import { demoAnalysis } from "@/lib/demo";
import { toPreview } from "@/lib/preview";
import { contextSchema, preservedEvidenceSchema } from "@/lib/schemas";
import { ingestProfile, ProfileIngestionError } from "@/lib/profile";
import { deriveDemand, derivePricing, recommendationNeedsLocation, searchMarketOpportunities } from "@/lib/search";
import { enrichCareerProspects, needsReportIntelligenceRepair, normalizeReportIntelligence, repairReportIntelligence } from "@/lib/role-model";
import { saveAnalysis, saveCandidateProfile } from "@/lib/storage";
import type { AnalysisResult } from "@/lib/types";
import { sealAnalysis } from "@/lib/analysis-token";
import { isLocale, type Locale } from "@/lib/i18n";
import { ensureCapacityGraph } from "@/lib/capacity-graph";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file") instanceof File ? form.get("file") as File : null;
    const manualText = String(form.get("text") ?? "");
    const linkedinUrl = String(form.get("linkedinUrl") ?? "");
    const requestedLocale = String(form.get("locale") ?? "en");
    const submittedRequestId = String(form.get("requestId") ?? "");
    const analysisId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submittedRequestId)
      ? submittedRequestId
      : crypto.randomUUID();
    const candidateConsent = form.get("candidateConsent") === "true";
    if (!candidateConsent) {
      return NextResponse.json({ error: "CV storage permission is required before analysis.", code: "CONSENT_REQUIRED" }, { status: 400 });
    }
    const locale: Locale = isLocale(requestedLocale) ? requestedLocale : "en";
    const preservedEvidence = preservedEvidenceSchema.parse(JSON.parse(String(form.get("preservedEvidence") ?? "[]")));
    const context = contextSchema.parse(JSON.parse(String(form.get("context") ?? "{}")));
    const ingestion = await ingestProfile({ file, manualText, linkedinUrl, preservedEvidence });
    const demo = config.demoMode ? demoAnalysis(context, ingestion.profile) : null;
    const base = demo ?? await analyzeProfile(ingestion.profile, context, locale);
    const locationNeed = recommendationNeedsLocation(base.combinations);
    if (locationNeed && (!context.country || (locationNeed.cityRequired && !context.city))) {
      return NextResponse.json({
        error: `${locationNeed.serviceName} depends on location. Add only the location needed to validate it.`,
        code: "LOCATION_REQUIRED",
        details: locationNeed,
      }, { status: 409 });
    }
    let opportunities = demo?.opportunities ?? [];
    let searchStatus: AnalysisResult["searchStatus"] = demo?.searchStatus ?? "complete";
    if (!demo) {
      const search = await searchMarketOpportunities(base.combinations, context);
      opportunities = search.opportunities;
      searchStatus = search.status;
    }
    const combinations = deriveDemand(base.combinations, opportunities);
    const now = new Date();
    let result: AnalysisResult = {
      ...base, context, profile: ingestion.profile, id: analysisId, createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + config.resultTtlHours * 3600000).toISOString(), paid: false,
      combinations, opportunities, pricing: demo ? demo.pricing : derivePricing(opportunities, combinations.length), searchStatus,
    };
    result = normalizeReportIntelligence(result);
    if (needsReportIntelligenceRepair(result)) result = await repairReportIntelligence(result);
    result = { ...result, combinations: await enrichCareerProspects(result.combinations) };
    result = ensureCapacityGraph(result);
    if (searchStatus !== "failed" && opportunities.length < 2 && !result.weakProfile) {
      result.weakProfile = {
        message: "We wouldn’t recommend selling your current skill set directly yet.",
        strongestAsset: combinations[0].elements[0],
        missingCapability: "A more specific, buyer-recognized delivery capability",
        closestPath: combinations[0].services[0].name,
      };
    }
    await saveAnalysis(result);
    const user = await currentUser();
    await saveCandidateProfile(result, file, user?.id);
    await trackServer("analysis_completed", { analysisId: result.id, opportunityCount: opportunities.length, searchStatus, candidateProfileSaved: candidateConsent });
    return NextResponse.json({ preview: toPreview(result), recoveryToken: sealAnalysis(result) });
  } catch (error) {
    if (error instanceof ProfileIngestionError) {
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Analysis failed";
    console.error("Market analysis failure", error);
    if (/OpenAI is not configured/i.test(message)) {
      return NextResponse.json({ error: "Market analysis is not configured in this environment.", code: "ANALYSIS_NOT_CONFIGURED" }, { status: 503 });
    }
    const clientError = /Upload|PDF|DOCX|extract|country|city|CV|LinkedIn|readable/i.test(message);
    return NextResponse.json({ error: clientError ? message : "We couldn’t complete the market analysis. Please try again." }, { status: clientError ? 400 : 500 });
  }
}
