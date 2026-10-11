import type { Opportunity, SkillCombination, UserContext } from "@/lib/types";
import { isRemoteOnlyOpportunity } from "@/lib/remote-only";
import { capabilityMatches, hasUnsupportedEditingRequirement, missingOptionalLanguages } from "@/lib/capability-evidence";

const TECHNICAL_TITLE = /\b(?:full[ -]?stack|front[ -]?end|back[ -]?end|software|devops|cloud|mobile|web)\s+(?:developer|engineer)|\bdeveloper\b/i;
const TECHNICAL_CAPABILITY = /software|development|coding|programming|engineering|devops|cloud/i;

export function isDirectApplicationDestination(method?: string, url?: string) {
  void url;
  return method === "public_email";
}

export function opportunityTitleSupportsIntent(title: string, elements: string[], supportingText = "") {
  if (hasUnsupportedEditingRequirement(elements, supportingText)) return false;
  const lower = title.toLowerCase();
  if (TECHNICAL_TITLE.test(title) && !elements.some((element) => TECHNICAL_CAPABILITY.test(element))) return false;
  if (/\b(?:3d|character|environment|concept) artist\b/i.test(title) && !elements.some(element => /3d|blender|maya|modeling|modelling|illustration|concept art/i.test(element))) return false;
  if (/\bgraphic designer\b/i.test(title) && !elements.some(element => /graphic|visual design|photoshop|illustrator|canva/i.test(element))) return false;
  if (/\b(?:senior producer|project manager)\b/i.test(title) && !elements.some(element => /produc(?:er|tion)|project management|delivery|operations/i.test(element))) return false;
  if (/\b(?:mentor|teacher|instructor|lecturer)\b/i.test(title) && !elements.some(element => /teach|educat|train|mentor|coach/i.test(element))) return false;
  // A broad "content" capability does not prove professional writing intent.
  // Generic writer listings were previously promoted from incidental words in
  // snippets even when the selected direction was finance/social/marketing.
  if (/\b(?:freelance |content |blog |article |copy)?writer\b|\bcopywriter\b/i.test(title)
    && !elements.some((element) => /\b(?:writing|copywriting|writer|editorial|journalism)\b/i.test(element))) return false;
  const titleMatches = elements.filter((element) => capabilityMatches(element, lower));
  const evidenceText = `${title} ${supportingText}`.toLowerCase();
  const supportedElements = elements.filter((element) => capabilityMatches(element, evidenceText));
  return elements.length > 0 && supportedElements.length === elements.length
    && (titleMatches.length > 0 || supportingText.trim().length >= 80);
}

const LANGUAGE_NAMES = [
  "arabic", "cantonese", "chinese", "dutch", "english", "french", "german",
  "italian", "japanese", "korean", "mandarin", "portuguese", "spanish", "thai",
];

function requiresUnsupportedLanguage(opportunity: Opportunity, elements: string[]) {
  const text = `${opportunity.title} ${opportunity.listingEvidence ?? opportunity.summary ?? ""}`.toLowerCase();
  const evidenced = elements.join(" ").toLowerCase();
  return LANGUAGE_NAMES.some((language) => {
    const required = new RegExp(`(?:native(?:-level)?|fluent|fluency|proficien(?:t|cy)|speaking|required|requires?)\\W{0,24}${language}|${language}\\W{0,16}(?:speaking|required|fluency|speaker)`, "i").test(text);
    return required && !evidenced.includes(language);
  });
}

function explicitForeignRemoteRestriction(opportunity: Opportunity, context?: UserContext) {
  const country = context?.country?.toLowerCase().trim();
  if (!country) return false;
  const text = `${opportunity.title} ${opportunity.location ?? ""} ${opportunity.authorization ?? ""} ${opportunity.listingEvidence ?? opportunity.summary ?? ""}`.toLowerCase();
  if (/worldwide|anywhere|global remote/.test(text)) return false;
  if (country !== "united states" && /(?:remote\s*[·,-]\s*)?united states|u\.?s\.? work authorization|us[- ]only/.test(text)) return true;
  if (country !== "united states" && /\b[a-z][a-z .'-]{1,40},\s*(?:al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b/i.test(text)) return true;
  if (country !== "canada" && /(?:remote\s*[·,-]\s*)?canada\b/.test(text)) return true;
  return false;
}

export function canAutoExecuteOpportunity(input: {
  opportunity: Opportunity;
  method?: string;
  combinations: SkillCombination[];
  context?: UserContext;
}) {
  const { opportunity, method, combinations, context } = input;
  if (!isRemoteOnlyOpportunity(opportunity)) return false;
  const elements = combinations[opportunity.combinationIndex]?.elements ?? opportunity.requiredSkills ?? [];
  if (!isDirectApplicationDestination(method, opportunity.url)) return false;
  if (missingOptionalLanguages(elements, `${opportunity.title} ${opportunity.listingEvidence ?? opportunity.summary ?? ""}`).length) return false;
  if (!opportunityTitleSupportsIntent(opportunity.title, elements, opportunity.listingEvidence ?? opportunity.summary ?? "")) return false;
  if (requiresUnsupportedLanguage(opportunity, elements)) return false;
  if (explicitForeignRemoteRestriction(opportunity, context)) return false;
  return true;
}
