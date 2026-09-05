import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";

const SCOPES = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"];

function encryptionKey() {
  const value = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;
  if (!value) throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY is not configured");
  return createHash("sha256").update(value).digest();
}

export function encryptToken(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptToken(value: string) {
  const [iv, tag, ciphertext] = value.split(".");
  if (!iv || !tag || !ciphertext) throw new Error("Invalid encrypted token");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

function stateSecret() { return process.env.GMAIL_TOKEN_ENCRYPTION_KEY ?? process.env.CRON_SECRET ?? ""; }

export function createOAuthState(userId: string) {
  if (!stateSecret()) throw new Error("OAuth state signing is not configured");
  const payload = Buffer.from(JSON.stringify({ userId, nonce: randomBytes(24).toString("base64url"), exp: Date.now() + 10 * 60_000 })).toString("base64url");
  const signature = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOAuthState(state: string) {
  try {
  const [payload, signature] = state.split(".");
  if (!payload || !signature || !stateSecret()) return null;
  const expected = createHmac("sha256", stateSecret()).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId: string; exp: number };
  return typeof value.userId === "string" && value.userId && value.exp > Date.now() ? value : null;
  } catch { return null; }
}

export function gmailAuthorizationUrl(userId: string) {
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID) throw new Error("GOOGLE_OAUTH_CLIENT_ID is not configured");
  const redirect = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${config.appUrl}/api/agent/gmail/callback`;
  const params = new URLSearchParams({ client_id: process.env.GOOGLE_OAUTH_CLIENT_ID, redirect_uri: redirect, response_type: "code", access_type: "offline", prompt: "consent", include_granted_scopes: "true", scope: SCOPES.join(" "), state: createOAuthState(userId) });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGmailCode(code: string) {
  const redirect = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${config.appUrl}/api/agent/gmail/callback`;
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "", redirect_uri: redirect, grant_type: "authorization_code" }) });
  if (!response.ok) throw new Error(`Gmail OAuth exchange failed (${response.status})`);
  return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number; scope: string; id_token?: string }>;
}

export class GmailReconnectRequiredError extends Error {
  constructor() { super("Gmail authorization has expired or been revoked. Reconnect Gmail."); this.name = "GmailReconnectRequiredError"; }
}

export async function refreshGmailAccessToken(encryptedRefreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ refresh_token: decryptToken(encryptedRefreshToken), client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "", grant_type: "refresh_token" }) });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (payload.error === "invalid_grant") throw new GmailReconnectRequiredError();
    throw new Error(`Gmail token refresh failed (${response.status})`);
  }
  return response.json() as Promise<{ access_token: string; expires_in: number }>;
}

async function gmailFetch(path: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { ...init, headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", ...init.headers } });
  if (!response.ok) throw new Error(`Gmail API failed (${response.status})`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function gmailProfile(accessToken: string) {
  return gmailFetch("profile", accessToken) as Promise<{ emailAddress: string; historyId: string }>;
}

interface GmailAttachment { filename: string; mimeType: string; content: Uint8Array }

function encodedMessage(input: { from: string; to: string; subject: string; body: string; attachments?: GmailAttachment[] }) {
  const headers = [`From: ${input.from}`, `To: ${input.to}`, `Subject: ${input.subject.replace(/[\r\n]+/g, " ")}`, "MIME-Version: 1.0"];
  if (!input.attachments?.length) {
    return Buffer.from(`${headers.join("\r\n")}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${input.body}`).toString("base64url");
  }
  const boundary = `monetizable_${randomBytes(12).toString("hex")}`;
  const parts = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.body,
  ];
  for (const attachment of input.attachments) {
    const safeFilename = attachment.filename.replace(/[\r\n"]/g, "_");
    const encoded = Buffer.from(attachment.content).toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "";
    parts.push(
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType}; name="${safeFilename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${safeFilename}"`,
      "",
      encoded,
    );
  }
  parts.push(`--${boundary}--`, "");
  return Buffer.from(parts.join("\r\n")).toString("base64url");
}

export async function sendGmail(accessToken: string, input: { from: string; to: string; subject: string; body: string; attachments?: GmailAttachment[] }) {
  return gmailFetch("messages/send", accessToken, { method: "POST", body: JSON.stringify({ raw: encodedMessage(input) }) }) as Promise<{ id: string; threadId: string }>;
}

export async function startGmailWatch(accessToken: string) {
  if (!process.env.GMAIL_PUBSUB_TOPIC) throw new Error("GMAIL_PUBSUB_TOPIC is not configured");
  return gmailFetch("watch", accessToken, { method: "POST", body: JSON.stringify({ topicName: process.env.GMAIL_PUBSUB_TOPIC, labelIds: ["INBOX"] }) }) as Promise<{ historyId: string; expiration: string }>;
}

export async function stopGmailWatch(accessToken: string) {
  return gmailFetch("stop", accessToken, { method: "POST", body: "{}" });
}

export async function revokeGoogleToken(encryptedRefreshToken: string) {
  const token = decryptToken(encryptedRefreshToken);
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" } });
}

export async function gmailHistory(accessToken: string, startHistoryId: string) {
  return gmailFetch(`history?startHistoryId=${encodeURIComponent(startHistoryId)}&historyTypes=messageAdded&labelId=INBOX`, accessToken) as Promise<{ historyId: string; history?: Array<{ messagesAdded?: Array<{ message: { id: string; threadId: string } }> }> }>;
}

export async function gmailMessage(accessToken: string, messageId: string) {
  return gmailFetch(`messages/${encodeURIComponent(messageId)}?format=full`, accessToken) as Promise<GmailMessage>;
}

interface GmailPart { mimeType?: string; body?: { data?: string }; parts?: GmailPart[] }
export interface GmailMessage { id: string; threadId: string; internalDate?: string; payload?: GmailPart & { headers?: Array<{ name: string; value: string }> } }

export function gmailHeader(message: GmailMessage, name: string) {
  return message.payload?.headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value;
}

export function gmailText(message: GmailMessage) {
  const visit = (part?: GmailPart): string[] => {
    if (!part) return [];
    const own = part.mimeType === "text/plain" && part.body?.data ? [Buffer.from(part.body.data, "base64url").toString("utf8")] : [];
    return [...own, ...(part.parts ?? []).flatMap(visit)];
  };
  return visit(message.payload).join("\n").slice(0, 8_000);
}
