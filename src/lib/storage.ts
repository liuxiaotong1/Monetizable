import type { AnalysisResult } from "@/lib/types";
import { createHash } from "node:crypto";
import { buildCandidateProfile, CANDIDATE_CONSENT_VERSION } from "@/lib/candidate-profile";

declare global {
  var monetizableStore: Map<string, AnalysisResult> | undefined;
  var monetizableOwners: Map<string, string> | undefined;
}

const memoryStore = global.monetizableStore ?? new Map<string, AnalysisResult>();
global.monetizableStore = memoryStore;
const memoryOwners = global.monetizableOwners ?? new Map<string, string>();
global.monetizableOwners = memoryOwners;
const CANDIDATE_CV_BUCKET = "candidate-cvs";
const AGENT_AUDIT_BUCKET = "agent-audits";
let candidateBucketReady = false;
let agentAuditBucketReady = false;

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export async function supabaseRest(path: string, init: RequestInit = {}) {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured");
  const response = await fetch(`${cfg.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: cfg.key,
      authorization: `Bearer ${cfg.key}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Storage request failed (${response.status})`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function supabaseStorage(path: string, init: RequestInit = {}) {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured");
  return fetch(`${cfg.url}/storage/v1/${path}`, {
    ...init,
    headers: {
      apikey: cfg.key,
      authorization: `Bearer ${cfg.key}`,
      ...init.headers,
    },
    cache: "no-store",
  });
}

async function ensureCandidateCvBucket() {
  if (candidateBucketReady) return;
  const existing = await supabaseStorage(`bucket/${CANDIDATE_CV_BUCKET}`);
  if (existing.ok) {
    candidateBucketReady = true;
    return;
  }
  if (existing.status !== 404) throw new Error(`Candidate CV bucket check failed (${existing.status})`);
  const response = await supabaseStorage("bucket", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: CANDIDATE_CV_BUCKET,
      name: CANDIDATE_CV_BUCKET,
      public: false,
      file_size_limit: 8 * 1024 * 1024,
      allowed_mime_types: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    }),
  });
  if (!response.ok) {
    const retry = await supabaseStorage(`bucket/${CANDIDATE_CV_BUCKET}`);
    if (!retry.ok) throw new Error(`Candidate CV bucket setup failed (${response.status})`);
  }
  candidateBucketReady = true;
}

async function ensureAgentAuditBucket() {
  if (agentAuditBucketReady) return;
  const existing = await supabaseStorage(`bucket/${AGENT_AUDIT_BUCKET}`);
  if (existing.ok) { agentAuditBucketReady = true; return; }
  if (existing.status !== 404) throw new Error(`Agent audit bucket check failed (${existing.status})`);
  const response = await supabaseStorage("bucket", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: AGENT_AUDIT_BUCKET, name: AGENT_AUDIT_BUCKET, public: false, file_size_limit: 4 * 1024 * 1024, allowed_mime_types: ["image/png"] }) });
  if (!response.ok) { const retry = await supabaseStorage(`bucket/${AGENT_AUDIT_BUCKET}`); if (!retry.ok) throw new Error(`Agent audit bucket setup failed (${response.status})`); }
  agentAuditBucketReady = true;
}

export async function storeAgentAuditScreenshot(data: Uint8Array, userId: string, jobId: string, label: string) {
  await ensureAgentAuditBucket();
  const path = `${userId}/${jobId}/${Date.now()}-${label.replace(/[^a-z0-9-]/gi, "-")}.png`;
  const response = await supabaseStorage(`object/${AGENT_AUDIT_BUCKET}/${path}`, { method: "POST", headers: { "content-type": "image/png", "x-upsert": "false" }, body: Buffer.from(data) });
  if (!response.ok) throw new Error(`Agent audit screenshot upload failed (${response.status})`);
  return `${AGENT_AUDIT_BUCKET}:${path}`;
}

async function uploadCandidateCv(file: File, candidateProfileId: string, analysisId: string) {
  await ensureCandidateCvBucket();
  const extension = file.name.toLowerCase().endsWith(".docx") ? "docx" : "pdf";
  const path = `${candidateProfileId}/${analysisId}/source.${extension}`;
  const response = await supabaseStorage(`object/${CANDIDATE_CV_BUCKET}/${path}`, {
    method: "POST",
    headers: { "content-type": file.type || "application/octet-stream", "x-upsert": "true" },
    body: await file.arrayBuffer(),
  });
  if (!response.ok) throw new Error(`Candidate CV upload failed (${response.status})`);
  return { bucket: CANDIDATE_CV_BUCKET, path, filename: file.name, mimeType: file.type, sizeBytes: file.size };
}

async function deleteCandidateCvObjects(objects: Array<{ raw_cv_bucket?: string; raw_cv_path?: string }>) {
  const grouped = new Map<string, string[]>();
  for (const object of objects) {
    if (!object.raw_cv_bucket || !object.raw_cv_path) continue;
    grouped.set(object.raw_cv_bucket, [...(grouped.get(object.raw_cv_bucket) ?? []), object.raw_cv_path]);
  }
  for (const [bucket, prefixes] of grouped) {
    const response = await supabaseStorage(`object/${bucket}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prefixes }),
    });
    if (!response.ok) throw new Error(`Candidate CV deletion failed (${response.status})`);
  }
}

export async function candidateCvSignedUrl(candidateProfileId: string, expiresIn = 900) {
  if (!supabaseConfig()) return null;
  const scans = await supabaseRest(`candidate_scans?candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&raw_cv_path=not.is.null&select=raw_cv_bucket,raw_cv_path,raw_cv_filename&order=created_at.desc&limit=1`);
  const scan = scans?.[0];
  if (!scan?.raw_cv_bucket || !scan?.raw_cv_path) return null;
  const response = await supabaseStorage(`object/sign/${scan.raw_cv_bucket}/${scan.raw_cv_path}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expiresIn }),
  });
  if (!response.ok) return null;
  const payload = await response.json() as { signedURL?: string; signedUrl?: string };
  const path = payload.signedURL ?? payload.signedUrl;
  const cfg = supabaseConfig();
  return path && cfg ? { url: path.startsWith("http") ? path : `${cfg.url}/storage/v1${path}`, filename: scan.raw_cv_filename as string | undefined } : null;
}

export async function saveAnalysis(result: AnalysisResult) {
  if (!supabaseConfig()) {
    if (memoryStore.has(result.id)) throw new Error("Analysis request already exists");
    memoryStore.set(result.id, result);
    return;
  }
  await supabaseRest("analyses", {
    method: "POST",
    body: JSON.stringify({
      id: result.id,
      created_at: result.createdAt,
      expires_at: result.expiresAt,
      context: result.context,
      result,
      paid: result.paid,
    }),
  });
}

export async function saveCandidateProfile(result: AnalysisResult, rawCv?: File | null, userId?: string) {
  if (!supabaseConfig()) { if (userId) memoryOwners.set(result.id, userId); return; }
  const profile = buildCandidateProfile(result);
  const now = new Date();
  const retentionUntil = new Date(now);
  retentionUntil.setUTCMonth(retentionUntil.getUTCMonth() + 24);
  const rows = await supabaseRest("candidate_profiles?on_conflict=profile_fingerprint", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      // A public CV is not proof of account ownership. Keep uploads isolated
      // until the owner explicitly attaches their analysis during onboarding.
      profile_fingerprint: createHash("sha256").update(`${result.id}:${profile.profileFingerprint}`).digest("hex"),
      user_id: userId ?? null,
      display_name: profile.displayName,
      headline: profile.headline,
      profile_location: profile.profileLocation,
      source_types: profile.sourceTypes,
      top_skills: profile.topSkills,
      languages: profile.languages,
      constraints: profile.constraints,
      skill_combinations: profile.skillCombinations,
      adjacent_roles: profile.adjacentRoles,
      destination_markets: profile.destinationMarkets,
      potential: profile.potential,
      consent_version: CANDIDATE_CONSENT_VERSION,
      consented_at: now.toISOString(),
      retention_until: retentionUntil.toISOString(),
      updated_at: now.toISOString(),
    }),
  });
  const candidateProfileId = rows?.[0]?.id;
  if (!candidateProfileId) throw new Error("Candidate profile was not returned after save");
  const rawCvObject = rawCv ? await uploadCandidateCv(rawCv, candidateProfileId, result.id) : null;
  await supabaseRest("candidate_scans?on_conflict=analysis_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      candidate_profile_id: candidateProfileId,
      analysis_id: result.id,
      derived_snapshot: profile,
      raw_cv_bucket: rawCvObject?.bucket,
      raw_cv_path: rawCvObject?.path,
      raw_cv_filename: rawCvObject?.filename,
      raw_cv_mime_type: rawCvObject?.mimeType,
      raw_cv_size_bytes: rawCvObject?.sizeBytes,
    }),
  });
  if (result.capacityGraph) {
    const versions = await supabaseRest(`capacity_graphs?candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&select=version&order=version.desc&limit=1`);
    const nextVersion = Number(versions?.[0]?.version ?? 0) + 1;
    await supabaseRest(`capacity_graphs?candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&is_active=eq.true`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: false, updated_at: now.toISOString() }),
    });
    await supabaseRest("capacity_graphs", {
      method: "POST",
      body: JSON.stringify({
        candidate_profile_id: candidateProfileId,
        version: nextVersion,
        graph: { ...result.capacityGraph, version: nextVersion },
        is_active: true,
        updated_at: now.toISOString(),
      }),
    });
  }
  try {
    const { notifyMatchingCompanyNeeds } = await import("@/lib/company-needs");
    await notifyMatchingCompanyNeeds(candidateProfileId);
  } catch (error) {
    console.error("Company capability-match notification failed", error);
  }
  return candidateProfileId as string;
}

export async function getAnalysis(id: string): Promise<AnalysisResult | null> {
  if (!supabaseConfig()) {
    const result = memoryStore.get(id);
    return result && new Date(result.expiresAt).getTime() > Date.now() ? result : null;
  }
  const rows = await supabaseRest(`analyses?id=eq.${encodeURIComponent(id)}&select=result,paid,expires_at&limit=1`);
  if (!rows?.[0] || new Date(rows[0].expires_at) < new Date()) return null;
  return { ...rows[0].result, paid: rows[0].paid };
}

export async function analysisBelongsToUser(analysisId: string, userId: string) {
  if (!supabaseConfig()) return memoryOwners.get(analysisId) === userId;
  const scans = await supabaseRest(`candidate_scans?analysis_id=eq.${encodeURIComponent(analysisId)}&select=candidate_profile_id&limit=1`);
  const candidateProfileId = scans?.[0]?.candidate_profile_id as string | undefined;
  if (!candidateProfileId) return false;
  const profiles = await supabaseRest(`candidate_profiles?id=eq.${encodeURIComponent(candidateProfileId)}&user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`);
  return Boolean(profiles?.[0]);
}

export async function claimAnalysisForUser(analysisId: string, userId: string) {
  if (!supabaseConfig()) {
    if (!memoryStore.has(analysisId) || (memoryOwners.has(analysisId) && memoryOwners.get(analysisId) !== userId)) return false;
    memoryOwners.set(analysisId, userId);
    return true;
  }
  const scans = await supabaseRest(`candidate_scans?analysis_id=eq.${encodeURIComponent(analysisId)}&select=candidate_profile_id&limit=1`);
  const candidateProfileId = scans?.[0]?.candidate_profile_id as string | undefined;
  if (!candidateProfileId) return false;
  await supabaseRest(`candidate_profiles?id=eq.${encodeURIComponent(candidateProfileId)}&user_id=is.null`, {
    method: "PATCH",
    body: JSON.stringify({ user_id: userId, updated_at: new Date().toISOString() }),
  });
  return analysisBelongsToUser(analysisId, userId);
}

export async function replaceAnalysisResult(result: AnalysisResult) {
  if (!supabaseConfig()) {
    memoryStore.set(result.id, result);
    return;
  }
  await supabaseRest(`analyses?id=eq.${encodeURIComponent(result.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ result }),
  });
}

export async function markAnalysisPaid(id: string, checkoutSessionId: string) {
  if (!supabaseConfig()) {
    const result = memoryStore.get(id);
    if (result) memoryStore.set(id, { ...result, paid: true });
    return;
  }
  await supabaseRest(`analyses?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ paid: true, checkout_session_id: checkoutSessionId }),
  });
}

export async function deleteAnalysis(id: string) {
  if (!supabaseConfig()) { memoryOwners.delete(id); return memoryStore.delete(id); }
    const scans = await supabaseRest(`candidate_scans?analysis_id=eq.${encodeURIComponent(id)}&select=candidate_profile_id,raw_cv_bucket,raw_cv_path`);
    const candidateProfileId = scans?.[0]?.candidate_profile_id;
    if (candidateProfileId) {
      const allScans = await supabaseRest(`candidate_scans?candidate_profile_id=eq.${encodeURIComponent(candidateProfileId)}&select=analysis_id,raw_cv_bucket,raw_cv_path`);
      await deleteCandidateCvObjects(allScans ?? []);
      for (const scan of allScans ?? []) {
        if (scan.analysis_id) await supabaseRest(`analyses?id=eq.${encodeURIComponent(scan.analysis_id)}`, { method: "DELETE" });
      }
      await supabaseRest(`candidate_profiles?id=eq.${encodeURIComponent(candidateProfileId)}`, { method: "DELETE" });
    }
  await supabaseRest(`analyses?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  return true;
}

export async function deleteCandidateProfilesForUser(userId: string) {
  if (!supabaseConfig()) {
    for (const [id, owner] of memoryOwners) if (owner === userId) { memoryStore.delete(id); memoryOwners.delete(id); }
    return true;
  }
  const profiles = await supabaseRest(`candidate_profiles?user_id=eq.${encodeURIComponent(userId)}&select=id`);
  for (const profile of profiles ?? []) {
    const scans = await supabaseRest(`candidate_scans?candidate_profile_id=eq.${encodeURIComponent(profile.id)}&select=analysis_id,raw_cv_bucket,raw_cv_path`);
    await deleteCandidateCvObjects(scans ?? []);
    for (const scan of scans ?? []) {
      if (scan.analysis_id) await supabaseRest(`analyses?id=eq.${encodeURIComponent(scan.analysis_id)}`, { method: "DELETE" });
    }
    await supabaseRest(`candidate_profiles?id=eq.${encodeURIComponent(profile.id)}&user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" });
  }
  return true;
}
