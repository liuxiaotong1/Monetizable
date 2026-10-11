import { getRequestLocale } from "@/lib/request-locale";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { supabaseRest, supabaseConfig } from "@/lib/storage";
import { POST as analyze } from "@/app/api/analyze/route";
export const runtime = "nodejs";
export const maxDuration = 90;
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = await supabaseRest(`profile_submissions?user_id=eq.${user.id}&status=neq.complete&retention_until=gt.${new Date().toISOString()}&order=created_at.desc&limit=1`);
  const source = rows?.[0];
  if (!source) return NextResponse.json({ error: "No pending upload. Upload a CV or add your LinkedIn URL." }, { status: 404 });
  const form = new FormData();
  form.set("requestId", source.id);
  form.set("submissionToken", crypto.randomUUID() + crypto.randomUUID());
  form.set("candidateConsent", "true");
  form.set("linkedinUrl", source.linkedin_url ?? "");
  form.set("text", source.manual_text ?? "");
  form.set("context", JSON.stringify(source.request_context ?? {}));
  form.set("preservedEvidence", JSON.stringify(source.preserved_evidence ?? []));
  form.set("locale", await getRequestLocale());
  if (source.raw_cv_path) {
    const cfg = supabaseConfig()!;
    const r = await fetch(`${cfg.url}/storage/v1/object/${source.raw_cv_bucket}/${source.raw_cv_path}`, { headers: { apikey: cfg.key, authorization: `Bearer ${cfg.key}` }, cache: "no-store" });
    if (!r.ok) return NextResponse.json({ error: "Your saved CV could not be read. Please retry." }, { status: 503 });
    form.set("file", new File([await r.arrayBuffer()], source.raw_cv_filename, { type: source.raw_cv_mime_type }));
  }
  return analyze(new Request("https://internal/api/analyze", { method: "POST", body: form }));
}
