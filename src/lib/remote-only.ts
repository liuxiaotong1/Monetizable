// Fail closed: absence of an office requirement is not evidence of remote work.
export function isRemoteOnlyOpportunity(item: {
  title?: unknown; summary?: unknown; content?: unknown; remoteStatus?: unknown;
  remote_status?: unknown; location?: unknown; url?: unknown; source_url?: unknown;
  raw_payload?: unknown; listingEvidence?: unknown;
}): boolean {
  const url = String(item.url ?? item.source_url ?? "");
  // Aggregator snippets have repeatedly contradicted Jooble's destination page.
  // Keep them hidden until a verified remote destination is available.
  try { if (/(?:^|\.)(?:jooble\.[a-z.]+|remotive\.com)$/i.test(new URL(url).hostname)) return false; } catch { return false; }
  const raw = item.raw_payload && typeof item.raw_payload === "object" ? item.raw_payload as Record<string, unknown> : {};
  if (/\b(?:videographer|camera operator|shooting editor)\b/i.test(String(item.title ?? ""))) return false;
  const text = [item.title, item.summary, item.content, item.listingEvidence, item.location, item.remoteStatus, item.remote_status, raw.summary, raw.content, raw.listingEvidence]
    .filter(value => typeof value === "string").join(" ").replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").toLowerCase();
  const evidence = text.replace(/\b(?:no|without) (?:required )?(?:office attendance|on[- ]?site work|in[- ]person work|commut(?:e|ing))\b/g, "");
  if (/\b(?:on[- ]?site|in[- ]person|hybrid|office[- ]based|local presence|local candidates? only|commut(?:e|ing)|relocation required|not remote|non[- ]remote|no remote|remote (?:is )?not (?:available|allowed)|remote work (?:is )?not (?:available|allowed))\b/.test(evidence)) return false;
  if (/(?:report|travel|come|return|work|working|attendance|presence|required).{0,35}(?:at|to|in) (?:our |the |an? )?office|\d+ days? (?:per |a |each )?week.{0,30}office|sur site|présentiel|vor ort|vor-ort|presencial|到岗|坐班|线下办公/.test(evidence)) return false;
  return /\b(?:remote|remotely|work(?:ing)? from (?:home|anywhere)|home[- ]based|fully distributed|telecommut(?:e|ing))\b|télétravail|远程/.test(evidence);
}
