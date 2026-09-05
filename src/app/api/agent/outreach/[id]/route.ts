import { after, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { isValidProfessionalEmail } from "@/lib/opportunity-agent/signatures";
import { executeAgentJobForUser } from "@/lib/opportunity-agent/execution";
import { activeAgentJobForMatch, authorizationForUser, enqueueAgentJob, gmailConnectionForUser, matchForUser, outreachDraftForUser, subscriptionForUser, updateOutreachDraft } from "@/lib/opportunity-agent/storage";

export const maxDuration = 120;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await outreachDraftForUser(user.id, id);
  if (!existing) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  const input = await request.json();
  if (input.action === "approve") {
    const recipient = String(input.recipient ?? "").trim();
    const subject = String(input.subject ?? existing.subject).trim();
    const body = String(input.body ?? existing.body).trim();
    if (!subject || !body) return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    if (recipient.length > 320 || subject.length > 200 || body.length > 5_000) return NextResponse.json({ error: "Draft is too long" }, { status: 400 });
    const rows = await updateOutreachDraft(user.id, id, { recipient: recipient || null, subject, body, status: "approved", approved_at: new Date().toISOString() });
    return NextResponse.json({ draft: rows?.[0] });
  }
  if (input.action === "open_email") {
    if (existing.status !== "approved" && existing.status !== "email_client_opened") return NextResponse.json({ error: "Approve the draft first" }, { status: 409 });
    const rows = await updateOutreachDraft(user.id, id, { status: "email_client_opened", email_client_opened_at: new Date().toISOString() });
    return NextResponse.json({ draft: rows?.[0] });
  }
  if (input.action === "send") {
    const recipient = String(input.recipient ?? existing.recipient ?? "").trim().toLowerCase();
    const subject = String(input.subject ?? existing.subject).trim();
    const body = String(input.body ?? existing.body).trim();
    if (!isValidProfessionalEmail(recipient)) return NextResponse.json({ error: "Use a valid professional email on the recipient’s company domain." }, { status: 400 });
    if (!subject || !body || recipient.length > 320 || subject.length > 200 || body.length > 5_000) return NextResponse.json({ error: "Valid subject and body are required" }, { status: 400 });
    const [subscription, authorization, gmail, match] = await Promise.all([subscriptionForUser(user.id), authorizationForUser(user.id), gmailConnectionForUser(user.id), matchForUser(user.id, existing.opportunity_match_id)]);
    if (!subscription || !match || subscription.candidate_profile_id !== match.candidate_profile_id) return NextResponse.json({ error: "Active subscription and opportunity are required" }, { status: 403 });
    if (!authorization || authorization.status !== "active" || !authorization.allow_email_outreach) return NextResponse.json({ error: "Enable email authorization first" }, { status: 409 });
    if (!gmail || gmail.status !== "active") return NextResponse.json({ error: "Connect Gmail before sending" }, { status: 409 });
    if (await activeAgentJobForMatch(user.id, match.id, "email_outreach")) return NextResponse.json({ error: "An email for this opportunity is already queued or sent. Refresh to see its status." }, { status: 409 });
    const opportunity = Array.isArray(match.market_opportunities) ? match.market_opportunities[0] : match.market_opportunities;
    const job = await enqueueAgentJob({
      idempotencyKey: `manual:${user.id}:${match.id}:email:v2`, userId: user.id, candidateProfileId: match.candidate_profile_id, matchId: match.id,
      kind: "email_outreach", priority: Number(match.score ?? 0) + 1_000,
      payload: { recipient, email: user.email ?? "", approvedSubject: subject, approvedBody: body, approvedByUserAt: new Date().toISOString(), approvalVersion: "user-approved-v1", outreachDraftId: id, templateVersion: "outreach-v2", attachCv: true, title: opportunity?.title, buyer: opportunity?.buyer, source: opportunity?.source, sourceUrl: opportunity?.source_url, fitReason: match.fit_reason },
    });
    if (!job) return NextResponse.json({ error: "Could not create email task" }, { status: 500 });
    const rows = await updateOutreachDraft(user.id, id, { recipient, subject, body, status: "approved", approved_at: new Date().toISOString() });
    if (job.status === "queued") after(() => executeAgentJobForUser(user.id, job.id));
    return NextResponse.json({ draft: rows?.[0], job: { id: job.id, status: job.status, required_answers: job.required_answers ?? [], error_code: job.error_code } });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
