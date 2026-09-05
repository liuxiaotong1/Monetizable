import { createHash } from "node:crypto";
import { addSuppression, activeGmailConnections, createReplySignal, gmailConnectionForAddress, markOutreachHardBounced, markReplyNotified, outreachForThread, positiveReplyForOutreach, updateGmailConnection } from "@/lib/opportunity-agent/storage";
import { classifyReply } from "@/lib/opportunity-agent/replies";
import { decryptToken, encryptToken, gmailHeader, gmailHistory, gmailMessage, gmailText, GmailReconnectRequiredError, refreshGmailAccessToken, startGmailWatch } from "@/lib/opportunity-agent/gmail";

async function accessToken(connection: Record<string, unknown>) {
  const expires = connection.access_token_expires_at ? new Date(String(connection.access_token_expires_at)).getTime() : 0;
  if (connection.encrypted_access_token && expires > Date.now() + 60_000) return decryptToken(String(connection.encrypted_access_token));
  const refreshed = await refreshGmailAccessToken(String(connection.encrypted_refresh_token));
  await updateGmailConnection(String(connection.user_id), { encrypted_access_token: encryptToken(refreshed.access_token), access_token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() });
  return refreshed.access_token;
}

async function positiveReplyNotification(address: string, subject: string) {
  if (!process.env.RESEND_API_KEY || !process.env.OPPORTUNITY_EMAIL_FROM) return false;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ from: process.env.OPPORTUNITY_EMAIL_FROM, to: [address], subject: "Positive reply found by SuperCharlie", html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h1>You received a positive reply</h1><p>A contact responded positively to <strong>${subject.replace(/[<>]/g, "")}</strong>.</p><p>Open Gmail to review and respond. SuperCharlie will continue market scanning and outreach.</p></div>` }) });
  return response.ok;
}

export async function processGmailPush(input: { emailAddress: string; historyId: string }) {
  const connection = await gmailConnectionForAddress(input.emailAddress);
  if (!connection) return { ignored: true, reason: "connection_not_found" };
  let token: string;
  try { token = await accessToken(connection); }
  catch (error) {
    if (!(error instanceof GmailReconnectRequiredError)) throw error;
    await updateGmailConnection(String(connection.user_id), { status: "error" });
    return { ignored: true, reason: "gmail_reconnect_required" };
  }
  const start = String(connection.history_id ?? input.historyId);
  let history;
  try { history = await gmailHistory(token, start); } catch (error) {
    if (!(error instanceof Error) || !/Gmail API failed \(404\)/.test(error.message)) throw error;
    await updateGmailConnection(String(connection.user_id), { history_id: input.historyId });
    return { ignored: true, reason: "history_expired" };
  }
  let classified = 0; let notified = 0;
  const additions = (history.history ?? []).flatMap((entry) => entry.messagesAdded ?? []).map((item) => item.message);
  for (const added of additions) {
    const outreach = await outreachForThread(String(connection.user_id), added.threadId);
    if (!outreach || await positiveReplyForOutreach(String(outreach.id))) continue;
    const message = await gmailMessage(token, added.id);
    const from = gmailHeader(message, "from") ?? "";
    if (from.toLowerCase().includes(String(connection.gmail_address).toLowerCase())) continue;
    const body = gmailText(message); if (!body) continue;
    const subject = gmailHeader(message, "subject") ?? "";
    if (/mailer-daemon|mail delivery subsystem/i.test(from) || /delivery status notification|undeliverable|delivery failure/i.test(subject)) {
      await markOutreachHardBounced(String(outreach.id));
      const hash = createHash("sha256").update(String(outreach.recipient).toLowerCase()).digest("hex");
      await Promise.all([addSuppression({ userId: String(connection.user_id), addressHash: hash, domain: String(outreach.recipient_domain), reason: "hard_bounce" }), addSuppression({ userId: null, addressHash: hash, domain: String(outreach.recipient_domain), reason: "hard_bounce" })]);
      continue;
    }
    const signal = await classifyReply(body); classified += 1;
    if (signal.classification === "negative" && /unsubscribe|remove me|do not contact|stop emailing|not interested/i.test(body)) {
      const hash = createHash("sha256").update(String(outreach.recipient).toLowerCase()).digest("hex");
      await Promise.all([addSuppression({ userId: String(connection.user_id), addressHash: hash, domain: String(outreach.recipient_domain), reason: "negative_reply" }), addSuppression({ userId: null, addressHash: hash, domain: String(outreach.recipient_domain), reason: "negative_reply" })]);
    }
    const row = await createReplySignal({ user_id: connection.user_id, outreach_message_id: outreach.id, gmail_message_id: message.id, gmail_thread_id: message.threadId, classification: signal.classification, confidence_label: signal.confidenceLabel, received_at: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString() });
    if (row && signal.classification === "positive" && await positiveReplyNotification(String(connection.gmail_address), String(outreach.subject))) { await markReplyNotified(String(row.id)); notified += 1; }
  }
  await updateGmailConnection(String(connection.user_id), { history_id: history.historyId ?? input.historyId });
  return { classified, notified };
}

export async function renewGmailWatches() {
  let renewed = 0; let failed = 0;
  for (const connection of await activeGmailConnections() ?? []) {
    const expires = connection.watch_expiration ? new Date(connection.watch_expiration).getTime() : 0;
    if (expires > Date.now() + 48 * 3_600_000) continue;
    try {
      const token = await accessToken(connection); const watch = await startGmailWatch(token);
      await updateGmailConnection(String(connection.user_id), { watch_expiration: new Date(Number(watch.expiration)).toISOString(), history_id: connection.history_id ?? watch.historyId, status: "active" }); renewed += 1;
    } catch { await updateGmailConnection(String(connection.user_id), { status: "error" }); failed += 1; }
  }
  return { renewed, failed };
}
