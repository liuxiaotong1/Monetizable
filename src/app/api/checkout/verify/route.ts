import { NextResponse } from "next/server";
import { trackServer } from "@/lib/analytics";
import { retrieveCheckoutSession } from "@/lib/stripe";
import { analysisBelongsToUser, claimAnalysisForUser, getAnalysis, markAnalysisPaid } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import { openAnalysis } from "@/lib/analysis-token";

export async function POST(request: Request) {
  try {
    const { sessionId, recoveryToken } = await request.json();
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in is required" }, { status: 401 });
    const session = await retrieveCheckoutSession(String(sessionId));
    if (session.mode !== "payment" || session.payment_status !== "paid") return NextResponse.json({ error: "One-time payment is not complete." }, { status: 402 });
    const analysisId = session.metadata?.analysis_id ?? session.client_reference_id;
    if (!analysisId) throw new Error("Missing analysis reference");
    if (!await analysisBelongsToUser(analysisId, user.id)) {
      const recovery = openAnalysis(String(recoveryToken ?? ""));
      if (recovery?.id !== analysisId || !await claimAnalysisForUser(analysisId, user.id)) return NextResponse.json({ error: "Analysis not found for this account" }, { status: 403 });
    }
    await markAnalysisPaid(analysisId, session.id);
    const result = await getAnalysis(analysisId) ?? openAnalysis(String(recoveryToken ?? ""));
    if (!result || result.id !== analysisId) {
      return NextResponse.json({ error: "Analysis expired." }, { status: 404 });
    }
    await trackServer("purchase_completed", { analysisId, amount: session.amount_total });
    return NextResponse.json({
      result: { ...result, paid: true },
      purchase: {
        value: typeof session.amount_total === "number" ? session.amount_total / 100 : undefined,
        currency: typeof session.currency === "string" ? session.currency.toUpperCase() : undefined,
      },
    });
  } catch {
    return NextResponse.json({ error: "We couldn’t verify this payment." }, { status: 400 });
  }
}
