import type { Opportunity, SkillCombination, UserContext } from "@/lib/types";

const TECHNICAL_TITLE = /\b(?:full[ -]?stack|front[ -]?end|back[ -]?end|software|devops|cloud|mobile|web)\s+(?:developer|engineer)|\bdeveloper\b/i;
const TECHNICAL_CAPABILITY = /software|development|coding|programming|engineering|devops|cloud/i;

export function isDirectApplicationDestination(method?: string, url?: string) {
  void url;
  return method === "public_email";
}

function capabilityTerms(elements: string[]) {
  const terms = new Set<string>();
  for (const element of elements) {
    const lower = element.toLowerCase();
    lower.split(/[^a-z0-9+#]+/).filter((part) => (part.length >= 4 || ["ai", "sql", "crm", "ux", "seo", "c++", "c#"].includes(part)) && !["management", "development", "analysis", "creation", "strategy", "professional"].includes(part)).forEach((part) => terms.add(part));
    if (/content/.test(lower)) ["content", "editorial", "copywriter", "creator"].forEach((term) => terms.add(term));
    if (/social media|influencer/.test(lower)) ["social", "community", "influencer"].forEach((term) => terms.add(term));
    if (/marketing/.test(lower)) ["marketing", "growth", "campaign"].forEach((term) => terms.add(term));
    if (/financial|finance|account/.test(lower)) ["financial", "finance", "accounting", "budget", "forecast"].forEach((term) => terms.add(term));
    if (/sales|business development/.test(lower)) ["sales", "partnership", "business development"].forEach((term) => terms.add(term));
  }
  return [...terms];
}

export function opportunityTitleSupportsIntent(title: string, elements: string[], supportingText = "") {
  const includesTerm = (text: string, term: string) => new RegExp(`(?:^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`, "i").test(text);
  const lower = title.toLowerCase();
  if (TECHNICAL_TITLE.test(title) && !elements.some((element) => TECHNICAL_CAPABILITY.test(element))) return false;
  // A broad "content" capability does not prove professional writing intent.
  // Generic writer listings were previously promoted from incidental words in
  // snippets even when the selected direction was finance/social/marketing.
  if (/\b(?:freelance |content |blog |article |copy)?writer\b|\bcopywriter\b/i.test(title)
    && !elements.some((element) => /\b(?:writing|copywriting|writer|editorial|journalism)\b/i.test(element))) return false;
  const titleMatches = elements.filter((element) => capabilityTerms([element]).some((term) => includesTerm(lower, term)));
  const evidenceText = `${title} ${supportingText}`.toLowerCase();
  const supportedElements = elements.filter((element) => capabilityTerms([element]).some((term) => includesTerm(evidenceText, term)));
  const requiredCoverage = elements.length <= 1 ? 1 : 2;
  return supportedElements.length >= requiredCoverage
    && (titleMatches.length > 0 || supportingText.trim().length >= 80);
}

const LANGUAGE_NAMES = [
  "arabic", "cantonese", "chinese", "dutch", "english", "french", "german",
  "italian", "japanese", "korean", "mandarin", "portuguese", "spanish", "thai",
];

function requiresUnsupportedLanguage(opportunity: Opportunity, elements: string[]) {
  const text = `${opportunity.title} ${opportunity.summary ?? ""}`.toLowerCase();
  const evidenced = elements.join(" ").toLowerCase();
  return LANGUAGE_NAMES.some((language) => {
    const required = new RegExp(`(?:native(?:-level)?|fluent|fluency|proficien(?:t|cy)|speaking|required|requires?)\\W{0,24}${language}|${language}\\W{0,16}(?:speaking|required|fluency|speaker)`, "i").test(text);
    return required && !evidenced.includes(language);
  });
}

function explicitForeignRemoteRestriction(opportunity: Opportunity, context?: UserContext) {
  const country = context?.country?.toLowerCase().trim();
  if (!country) return false;
  const text = `${opportunity.title} ${opportunity.location ?? ""} ${opportunity.authorization ?? ""} ${opportunity.summary ?? ""}`.toLowerCase();
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
  const elements = combinations[opportunity.combinationIndex]?.elements ?? opportunity.requiredSkills ?? [];
  if (!isDirectApplicationDestination(method, opportunity.url)) return false;
  if (!opportunityTitleSupportsIntent(opportunity.title, elements, `${opportunity.summary ?? ""} ${(opportunity.publicSignals ?? []).join(" ")}`)) return false;
  if (requiresUnsupportedLanguage(opportunity, elements)) return false;
  if (explicitForeignRemoteRestriction(opportunity, context)) return false;
  return true;
}
