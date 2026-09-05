import { normalizeManualText, parseCvFile, type CvParseResult } from "@/lib/cv";
import { normalizeLinkedInProfileUrl, retrieveLinkedInPublicProfile, type LinkedInRetrieval } from "@/lib/linkedin";
import type { NormalizedProfile, ProfileEvidence, ProfileRole, ProfileSource } from "@/lib/types";

export class ProfileIngestionError extends Error {
  constructor(public code: "NO_INPUT" | "FILE_PARSE_FAILED" | "PROFILE_INSUFFICIENT", message: string, public details?: object) { super(message); }
}

function cleanKey(value?: string) {
  return value?.toLowerCase().replace(/[^a-zà-ž0-9]+/g, " ").trim() ?? "";
}

function lines(text: string) {
  return text.split(/\n+/).map((line) => line.replace(/^[•·▪◦*\-–—]+\s*/, "").trim()).filter(Boolean);
}

function extractIdentity(evidence: ProfileEvidence[]) {
  const linkedin = evidence.find((item) => item.source === "linkedin_public");
  if (!linkedin) return {};
  const first = lines(linkedin.text)[0]?.replace(/\s*\|\s*LinkedIn.*$/i, "") ?? "";
  const parts = first.split(/\s+[–—-]\s+/).map((part) => part.trim()).filter(Boolean);
  return { name: parts[0], headline: parts.slice(1).join(" — ") || undefined };
}

function extractRoles(evidence: ProfileEvidence[]) {
  const roles: ProfileRole[] = [];
  for (const item of evidence) {
    for (const line of lines(item.text)) {
      if (/^(?:profile|location|education|certification|language|services?)\s*:/i.test(line)) continue;
      const match = line.match(/^(.{2,80}?)\s+(?:at|@)\s+(.{2,100}?)(?:\s*[|,]\s*(.*))?$/i);
      if (match) roles.push({ title: match[1], company: match[2], description: match[3], source: item.source });
    }
  }
  const merged = new Map<string, ProfileRole>();
  for (const role of roles) {
    const key = `${cleanKey(role.title)}|${cleanKey(role.company)}`;
    const current = merged.get(key);
    if (!current || (role.description?.length ?? 0) > (current.description?.length ?? 0)) merged.set(key, { ...current, ...role });
  }
  return [...merged.values()];
}

function extractLists(evidence: ProfileEvidence[], heading: RegExp) {
  const found = new Set<string>();
  for (const item of evidence) {
    const content = lines(item.text);
    content.forEach((line, index) => {
      const inline = line.match(heading)?.[1];
      const value = inline || (heading.test(`${line}:`) ? content[index + 1] : undefined);
      value?.split(/[,;|•·]/).map((part) => part.trim()).filter((part) => part.length >= 2 && part.length <= 80).forEach((part) => found.add(part));
    });
  }
  return [...found];
}

function completeness(evidence: ProfileEvidence[], roles: ProfileRole[], skills: string[]) {
  const text = evidence.map((item) => item.text).join("\n");
  const roleSignal = roles.length > 0 || /(?:experience|expérience|employment|worked|consultant|manager|engineer|developer|designer|analyst|director|specialist|founder|chair|ceo)/i.test(text);
  const capabilitySignal = skills.length > 0 || /(?:skills?|expertise|proficient|managed|built|created|launched|sold|researched|research|designed|developed|operations|marketing|finance|sales|medical|healthcare|clinical|surgery|consulting|engineering|product|education|formation|certification|services?)/i.test(text);
  const structuredCategoryCount = [/(?:experience|expérience|employment)/i, /(?:education|formation)/i, /(?:certification|licen[cs]e)/i, /(?:languages?|langues?)/i, /(?:services?)/i, /(?:company|organization|employer|works for)/i, /(?:location|lieu|based in)/i].filter((pattern) => pattern.test(text)).length;
  const evidenceSignal = /(?:19|20)\d{2}|\b\d+\+? years?\b|\b(?:led|built|created|managed|launched|delivered|increased|reduced|developed)\b/i.test(text) || evidence.length > 1 || structuredCategoryCount >= 3;
  const sufficient = roleSignal && capabilitySignal && evidenceSignal;
  const signalCount = [roleSignal, capabilitySignal, evidenceSignal].filter(Boolean).length;
  return { completeness: sufficient ? "sufficient" as const : "insufficient" as const, confidence: signalCount === 3 && evidence.length > 1 ? "high" as const : signalCount >= 2 ? "medium" as const : "low" as const };
}

export function normalizeProfile(evidenceInput: ProfileEvidence[]): NormalizedProfile {
  const evidence = evidenceInput.filter((item, index, all) => item.text.trim() && all.findIndex((other) => cleanKey(other.text) === cleanKey(item.text)) === index);
  const identity = extractIdentity(evidence);
  const roles = extractRoles(evidence);
  const skills = extractLists(evidence, /^(?:skills?|expertise|competencies)\s*:?\s*(.*)$/i);
  const languages = extractLists(evidence, /^(?:languages?)\s*:?\s*(.*)$/i);
  const education = extractLists(evidence, /^(?:education|qualifications?)\s*:?\s*(.*)$/i);
  const certifications = extractLists(evidence, /^(?:certifications?|licenses?)\s*:?\s*(.*)$/i);
  const projects = extractLists(evidence, /^(?:projects?)\s*:?\s*(.*)$/i);
  const status = completeness(evidence, roles, skills);
  const sources = [...new Set(evidence.map((item) => item.source))] as ProfileSource[];
  const statedLocations = evidence.flatMap((item) => lines(item.text).filter((line) => /^(?:location|based in)\s*:/i.test(line)).map((line) => line.replace(/^[^:]+:\s*/, "")));
  const conflicts = [...new Set(statedLocations.map(cleanKey))].length > 1 ? [`Conflicting stated locations: ${statedLocations.join(" | ")}`] : [];
  return {
    sources, ...identity, summary: evidence.map((item) => item.text).join("\n\n").slice(0, 50_000), roles, education, skills, languages, certifications, projects,
    rawEvidence: evidence, ...status, conflicts,
  };
}

export interface IngestionResult {
  profile: NormalizedProfile;
  linkedIn?: LinkedInRetrieval;
  cv?: CvParseResult;
}

const LINKEDIN_ANONYMOUS_ACCESS_MESSAGE = "领英阻止了匿名访问, 请你 drop CV 或者去领英生成你的 CV pdf instead";

export async function ingestProfile(input: { linkedinUrl?: string; file?: File | null; manualText?: string; preservedEvidence?: ProfileEvidence[] }): Promise<IngestionResult> {
  if (!input.linkedinUrl?.trim() && !input.file && !input.manualText?.trim() && !input.preservedEvidence?.length) throw new ProfileIngestionError("NO_INPUT", "Add your LinkedIn profile or upload your CV.");
  const targetLinkedInUrl = input.linkedinUrl?.trim() ? normalizeLinkedInProfileUrl(input.linkedinUrl) : undefined;
  const evidence: ProfileEvidence[] = targetLinkedInUrl ? [] : [...(input.preservedEvidence ?? [])];
  const linkedIn = input.linkedinUrl?.trim() ? await retrieveLinkedInPublicProfile(input.linkedinUrl) : undefined;
  if (linkedIn) evidence.push(...linkedIn.evidence);
  const cv = input.file ? await parseCvFile(input.file) : undefined;
  if (cv && cv.status !== "failed") evidence.push({ source: "cv", text: cv.text, retrievalSource: "uploaded_file" });
  const manual = normalizeManualText(input.manualText ?? "");
  if (manual) evidence.push({ source: "manual", text: manual, retrievalSource: "manual_input" });

  if (cv?.status === "failed" && evidence.length === 0) throw new ProfileIngestionError("FILE_PARSE_FAILED", cv.message, { reason: cv.reason });
  const profile = normalizeProfile(evidence);
  if (profile.completeness === "insufficient") {
    const message = linkedIn
      ? LINKEDIN_ANONYMOUS_ACCESS_MESSAGE
      : "We could read your information, but there isn’t quite enough professional evidence for a reliable analysis.";
    throw new ProfileIngestionError("PROFILE_INSUFFICIENT", message, { profile, linkedIn, cv });
  }
  return { profile, linkedIn, cv };
}
