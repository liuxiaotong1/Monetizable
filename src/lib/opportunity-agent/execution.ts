import { createHash } from "node:crypto";
import { config } from "@/lib/config";
import { candidateCvSignedUrl } from "@/lib/storage";
import { adaptiveDailyLimit, withinDailyBudget } from "@/lib/opportunity-agent/budgets";
import { decryptToken, encryptToken, GmailReconnectRequiredError, refreshGmailAccessToken, sendGmail } from "@/lib/opportunity-agent/gmail";
import { agentJobForUser, authorizationForUser, claimAgentJobForUser, claimQueuedJobsForProfileByKind, createOutreachMessage, dailyAgentActionStats, deferAgentJob, finishAgentJob, getActiveAgentProfiles, gmailConnectionForUser, isCurrentAgentExecutionTarget, isSuppressed, retryAgentJob, sentOutreachStats, updateGmailConnection } from "@/lib/opportunity-agent/storage";
import { isValidProfessionalEmail } from "@/lib/opportunity-agent/signatures";

interface AgentJobRow { id: string; user_id: string; candidate_profile_id: string; opportunity_match_id: string; kind: "email_outreach" | "reply_classification"; attempts?: number; created_at?: string; input: Record<string, unknown> }

const CURRENT_MATCHING_RELEASE_AT = new Date("2026-09-02T19:48:00.000Z").getTime();

function addressHash(address: string) { return createHash("sha256").update(address.trim().toLowerCase()).digest("hex"); }

async function activeAccessToken(connection: Record<string, unknown>, forceRefresh = false) {
  const expiresAt = connection.access_token_expires_at ? new Date(String(connection.access_token_expires_at)).getTime() : 0;
  if (!forceRefresh && connection.encrypted_access_token && expiresAt > Date.now() + 60_000) return decryptToken(String(connection.encrypted_access_token));
  const refreshed = await refreshGmailAccessToken(String(connection.encrypted_refresh_token));
  await updateGmailConnection(String(connection.user_id), { encrypted_access_token: encryptToken(refreshed.access_token), access_token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(), status: "active" });
  return refreshed.access_token;
}

async function executeEmailJobs(jobs: AgentJobRow[]) {
  let sent = 0; let failed = 0;
  const approvedJobs = jobs.filter((job) => job.input.approvalVersion === "user-approved-v1"
    && Boolean(job.input.outreachDraftId)
    && Boolean(job.input.approvedByUserAt)
    && Boolean(String(job.input.approvedSubject ?? "").trim())
    && Boolean(String(job.input.approvedBody ?? "").trim()));
  for (const job of jobs) {
    if (!approvedJobs.includes(job)) await finishAgentJob(job.id, "skipped", { errorCode: "user_approval_required" });
  }
  const byUser = new Map<string, AgentJobRow[]>();
  approvedJobs.forEach((job) => byUser.set(job.user_id, [...(byUser.get(job.user_id) ?? []), job]));
  for (const [userId, userJobs] of byUser) {
    const [authorization, connection, stats] = await Promise.all([authorizationForUser(userId), gmailConnectionForUser(userId), sentOutreachStats(userId)]);
    if (!authorization || authorization.status !== "active" || !authorization.allow_email_outreach || !connection || connection.status !== "active") {
      for (const job of userJobs) await finishAgentJob(job.id, "skipped", { errorCode: "email_not_authorized" });
      continue;
    }
    const health = { connectedAt: String(connection.connected_at), sentLast72Hours: stats.sentLast72Hours, sentLast7Days: stats.sentLast7Days, hardBouncesLast7Days: stats.hardBouncesLast7Days, providerLimitErrors: 0, paused: false };
    const dailyLimit = Math.min(config.agentDailyActionLimit, adaptiveDailyLimit(health));
    await updateGmailConnection(userId, { daily_limit: dailyLimit });
    let token: string | undefined;
    let sentForUser = 0;
    let mailboxPaused = false;
    for (const job of userJobs) {
      if (new Date(job.created_at ?? 0).getTime() < CURRENT_MATCHING_RELEASE_AT) { await finishAgentJob(job.id, "skipped", { errorCode: "matching_rules_updated" }); continue; }
      if (!await isCurrentAgentExecutionTarget(userId, job.candidate_profile_id, job.created_at)) { await finishAgentJob(job.id, "skipped", { errorCode: "agent_direction_updated" }); continue; }
      if (mailboxPaused) { await finishAgentJob(job.id, "skipped", { errorCode: "gmail_provider_limit" }); continue; }
      if (!withinDailyBudget(stats.sentToday + sentForUser, health, config.agentDailyActionLimit)) { await deferAgentJob(job.id); continue; }
      const recipient = String(job.input.recipient ?? "").trim().toLowerCase(); const domain = recipient.split("@")[1] ?? "";
      if (!isValidProfessionalEmail(recipient) || !domain || await isSuppressed(userId, addressHash(recipient), domain)) { await finishAgentJob(job.id, "skipped", { errorCode: "invalid_or_suppressed_contact" }); continue; }
      const message = { subject: String(job.input.approvedSubject), body: String(job.input.approvedBody) };
      const body = message.body;
      let deliveryAttempted = false;
      let deliveryConfirmed = false;
      try {
        token ??= await activeAccessToken(connection);
        const attachments = [];
        if (job.input.attachCv === true) {
          const cv = await candidateCvSignedUrl(job.candidate_profile_id);
          if (!cv) {
            await finishAgentJob(job.id, "skipped", { errorCode: "cv_unavailable" });
            continue;
          }
          const response = await fetch(cv.url, { signal: AbortSignal.timeout(20_000) });
          if (!response.ok) throw new Error(`CV download failed (${response.status})`);
          const filename = cv.filename || "CV.pdf";
          const mimeType = filename.toLowerCase().endsWith(".docx")
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf";
          attachments.push({ filename, mimeType, content: new Uint8Array(await response.arrayBuffer()) });
        }
        let result;
        // Recheck immediately before the external action: a user may pause or
        // change direction while this batch is downloading its attachments.
        const [currentAuthorization, currentJob] = await Promise.all([authorizationForUser(userId), agentJobForUser(userId, job.id)]);
        if (currentAuthorization?.status !== "active" || !currentAuthorization.allow_email_outreach || currentJob?.status !== "running" || !await isCurrentAgentExecutionTarget(userId, job.candidate_profile_id, job.created_at)) {
          await finishAgentJob(job.id, "skipped", { errorCode: "email_not_authorized" });
          continue;
        }
        try {
          deliveryAttempted = true;
          result = await sendGmail(token, { from: String(connection.gmail_address), to: recipient, subject: message.subject, body, attachments });
        } catch (sendError) {
          if (!/Gmail API failed \(401\)/i.test(sendError instanceof Error ? sendError.message : String(sendError))) throw sendError;
          const refreshedToken = await activeAccessToken(connection, true);
          result = await sendGmail(refreshedToken, { from: String(connection.gmail_address), to: recipient, subject: message.subject, body, attachments });
          token = refreshedToken;
        }
        deliveryConfirmed = true;
        sent += 1; sentForUser += 1;
        const sentAt = new Date().toISOString();
        await finishAgentJob(job.id, "sent", { result: {
          gmailMessageId: result.id,
          gmailThreadId: result.threadId,
          company: String(job.input.buyer ?? job.input.source ?? "Opportunity contact"),
          title: String(job.input.title ?? "Opportunity"),
          recipient,
          subject: message.subject,
          body,
          sourceUrl: String(job.input.sourceUrl ?? ""),
          discoveryUrl: String(job.input.discoveryUrl ?? job.input.sourceUrl ?? ""),
          sentAt,
        } });
        // Gmail confirmation is the source of truth. A secondary audit-row
        // failure must never turn a successfully sent email into a retry that
        // could send the same message twice.
        await createOutreachMessage({ user_id: userId, agent_job_id: job.id, opportunity_match_id: job.opportunity_match_id, recipient, recipient_domain: domain, subject: message.subject, body_hash: createHash("sha256").update(body).digest("hex"), gmail_message_id: result.id, gmail_thread_id: result.threadId, sent_at: sentAt }).catch((auditError) => {
          console.error("Outreach audit row failed", auditError);
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (deliveryConfirmed) {
          // Persisting the receipt may fail after Gmail accepted the message.
          // Never re-send an accepted message because our database is unavailable.
          console.error("Gmail accepted outreach but receipt persistence failed", { jobId: job.id, errorMessage });
          continue;
        }
        const providerLimited = /\b(?:403|429)\b|rate.?limit|quota/i.test(errorMessage);
        if (error instanceof GmailReconnectRequiredError) {
          await updateGmailConnection(userId, { status: "error" });
          await finishAgentJob(job.id, "failed", { errorCode: "gmail_reconnect_required", errorMessage });
          failed += 1;
          mailboxPaused = true;
          continue;
        }
        if (providerLimited) await updateGmailConnection(userId, { status: "paused", daily_limit: 0 });
        const errorCode = providerLimited ? "gmail_provider_limit" : deliveryAttempted ? "gmail_delivery_unconfirmed" : "gmail_send_failed";
        if (!deliveryAttempted && !providerLimited && Number(job.attempts ?? 0) < 3) await retryAgentJob(job.id, errorCode, errorMessage);
        else await finishAgentJob(job.id, "failed", { errorCode, errorMessage });
        failed += 1;
        if (providerLimited) mailboxPaused = true;
      }
    }
  }
  return { sent, failed };
}

export async function consumeExecutionQueue() {
  if (!config.opportunityAgentExecutionEnabled) return { disabled: true, sent: 0, submitted: 0, failed: 0, browserbaseSessions: 0 };
  let sent = 0;
  let failed = 0;
  const profiles = await getActiveAgentProfiles();
  for (const profile of profiles) {
    const daily = await dailyAgentActionStats(profile.userId, profile.candidateProfileId);
    const remaining = Math.max(0, config.agentDailyOutreachTarget - daily.completedToday);
    if (!remaining) continue;
    const jobs = await claimQueuedJobsForProfileByKind(profile.userId, profile.candidateProfileId, "email_outreach", remaining) as AgentJobRow[];
    const result = await executeEmailJobs(jobs);
    sent += result.sent;
    failed += result.failed;
  }
  return { disabled: false, sent, submitted: 0, failed, browserbaseSessions: 0 };
}

export async function consumeExecutionQueueForUser(userId: string) {
  if (!config.opportunityAgentExecutionEnabled) return { disabled: true, sent: 0, submitted: 0, failed: 0, browserbaseSessions: 0 };
  const profile = (await getActiveAgentProfiles()).find((item) => item.userId === userId);
  if (!profile) return { disabled: false, sent: 0, submitted: 0, failed: 0, browserbaseSessions: 0 };
  const daily = await dailyAgentActionStats(userId, profile.candidateProfileId);
  const remaining = Math.max(0, config.agentDailyOutreachTarget - daily.completedToday);
  if (!remaining) return { disabled: false, sent: 0, submitted: 0, failed: 0, browserbaseSessions: 0 };
  const jobs = await claimQueuedJobsForProfileByKind(userId, profile.candidateProfileId, "email_outreach", remaining) as AgentJobRow[];
  const email = await executeEmailJobs(jobs.filter((job) => job.kind === "email_outreach"));
  return { disabled: false, sent: email.sent, submitted: 0, failed: email.failed, browserbaseSessions: 0 };
}

export async function executeAgentJobForUser(userId: string, jobId: string) {
  if (!config.opportunityAgentExecutionEnabled) return { disabled: true, job: await agentJobForUser(userId, jobId) };
  const job = await claimAgentJobForUser(userId, jobId) as AgentJobRow | null;
  if (!job) return { disabled: false, job: await agentJobForUser(userId, jobId) };
  if (job.kind === "email_outreach") await executeEmailJobs([job]);
  return { disabled: false, job: await agentJobForUser(userId, jobId) };
}
