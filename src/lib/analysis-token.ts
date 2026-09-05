import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { AnalysisResult } from "@/lib/types";

function tokenSecret() {
  // A coupon is shared with customers and cannot authenticate recovery grants.
  return process.env.ANALYSIS_TOKEN_SECRET || process.env.GMAIL_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function key() {
  const secret = tokenSecret();
  return secret ? createHash("sha256").update(secret).digest() : null;
}

export function sealAnalysis(result: AnalysisResult) {
  const encryptionKey = key();
  if (!encryptionKey) return undefined;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(result)), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function openAnalysis(token: string): AnalysisResult | null {
  const encryptionKey = key();
  if (!encryptionKey) return null;
  try {
    const [iv, tag, encrypted] = token.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString());
  } catch { return null; }
}

export function issueAgentAccessGrant(analysisId: string) {
  const secret = tokenSecret();
  if (!secret) return undefined;
  const payload = `${analysisId}.${Date.now() + 30 * 60_000}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function openAgentAccessGrant(token: string) {
  const secret = tokenSecret();
  if (!secret) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const [analysisId, expiresAt, submitted] = decoded.split(".");
    if (!analysisId || !expiresAt || !submitted || !Number.isFinite(Number(expiresAt)) || Number(expiresAt) <= Date.now()) return null;
    const payload = `${analysisId}.${expiresAt}`;
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    const left = Buffer.from(submitted);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right) ? analysisId : null;
  } catch {
    return null;
  }
}
