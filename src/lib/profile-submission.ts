import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { CANDIDATE_CONSENT_VERSION } from "@/lib/candidate-profile";
import { supabaseRest, uploadCandidateCv, claimAnalysisForUser } from "@/lib/storage";

export const PENDING_PROFILE_COOKIE = "monetizable_pending_profile";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function validSubmissionToken(value: string) { return /^[a-f0-9-]{72}$/i.test(value); }
export function sameSubmissionToken(token: string, hash: string) {
  const a = Buffer.from(digest(token)), b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function beginProfileSubmission(input: { id: string; token: string; userId?: string; linkedinUrl: string; manualText: string; file: File | null; context?: unknown; preservedEvidence?: unknown; locale?: string }) {
  if (!uuid.test(input.id) || !validSubmissionToken(input.token)) throw new Error("Invalid upload recovery credentials");
  const retention = new Date(); retention.setUTCMonth(retention.getUTCMonth() + 24);
  await supabaseRest("profile_submissions?on_conflict=id", {
    method: "POST", headers: { prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ id: input.id, user_id: input.userId ?? null, claim_token_hash: digest(input.token), linkedin_url: input.linkedinUrl || null, manual_text: input.manualText || null, request_context: input.context ?? {}, preserved_evidence: input.preservedEvidence ?? [], locale: input.locale ?? "en", consent_version: CANDIDATE_CONSENT_VERSION, retention_until: retention.toISOString() }),
  });
  const rows = await supabaseRest(`profile_submissions?id=eq.${input.id}&select=*&limit=1`);
  const row = rows?.[0];
  if (!row || (row.user_id !== input.userId && !sameSubmissionToken(input.token, row.claim_token_hash)) || (row.user_id && row.user_id !== input.userId)) throw new Error("Upload belongs to another session");
  if (new Date(row.retention_until).getTime() <= Date.now()) throw new Error("Upload retention period has ended");
  const cookieStore = await cookies();
  cookieStore.set(PENDING_PROFILE_COOKIE, `${input.id}.${input.token}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 86400 });
  if (input.file && !row.raw_cv_path) {
    const file = await uploadCandidateCv(input.file, `submissions/${input.id}`, input.id);
    await supabaseRest(`profile_submissions?id=eq.${input.id}`, { method: "PATCH", body: JSON.stringify({ raw_cv_bucket: file.bucket, raw_cv_path: file.path, raw_cv_filename: file.filename, raw_cv_mime_type: file.mimeType, raw_cv_size_bytes: file.sizeBytes }) });
    Object.assign(row, { raw_cv_bucket: file.bucket, raw_cv_path: file.path, raw_cv_filename: file.filename, raw_cv_mime_type: file.mimeType, raw_cv_size_bytes: file.sizeBytes });
  }
  return row;
}

export async function updateProfileSubmission(id: string, values: { status: "processing" | "complete" | "failed"; candidate_profile_id?: string; error_code?: string | null }) {
  await supabaseRest(`profile_submissions?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ ...values, updated_at: new Date().toISOString() }) });
}

export async function attachPendingProfile(userId: string) {
  const store = await cookies();
  const raw = store.get(PENDING_PROFILE_COOKIE)?.value;
  if (!raw) return;
  const [id, token] = raw.split(".");
  if (!uuid.test(id ?? "") || !validSubmissionToken(token ?? "")) return;
  const rows = await supabaseRest(`profile_submissions?id=eq.${id}&select=claim_token_hash,user_id,retention_until&limit=1`);
  const row = rows?.[0];
  if (!row || !sameSubmissionToken(token, row.claim_token_hash) || (row.user_id && row.user_id !== userId) || new Date(row.retention_until).getTime() <= Date.now()) return;
  const linked = await supabaseRest(`profile_submissions?id=eq.${id}&or=(user_id.is.null,user_id.eq.${encodeURIComponent(userId)})`, { method: "PATCH", body: JSON.stringify({ user_id: userId, updated_at: new Date().toISOString() }) });
  if (!linked?.length) return;
  await claimAnalysisForUser(id, userId);
  return id;
}
