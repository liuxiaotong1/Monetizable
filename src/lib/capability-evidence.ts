import { normalizeOpportunityText } from "@/lib/opportunity-text";

const groups = [
  { match: /market analysis|market research|competitive intelligence|market intelligence/i, terms: ["market analysis", "market research", "market intelligence", "competitive intelligence", "consumer insights", "business research", "market insights"], queries: ["market research", "competitive intelligence", "consumer insights", "research analyst"] },
  { match: /final cut|premiere|davinci|capcut|video edit|post.production/i, terms: ["video editor", "video editing", "video production", "post production", "post-production"], queries: ["video editor", "social media video editor", "marketing video editor", "short form video", "YouTube editor", "content creator"] },
  { match: /after effects|motion design|motion graphics/i, terms: ["motion design", "motion graphics", "animation"], queries: ["motion designer", "motion graphics"] },
  { match: /photoshop|illustrator|graphic design|canva/i, terms: ["graphic design", "graphic designer", "visual design"], queries: ["graphic designer", "visual designer"] },
  { match: /figma|ux design|user experience|ui design/i, terms: ["ux", "ui", "user experience", "product designer"], queries: ["product designer", "UX designer"] },
  { match: /financial|finance|accounting/i, terms: ["financial", "finance", "accounting", "budget", "forecast"], queries: ["financial analyst"] },
  { match: /excel|power bi|tableau|data analy/i, terms: ["data analysis", "data analyst", "business intelligence", "analytics"], queries: ["data analyst", "business intelligence"] },
  { match: /marketing/i, terms: ["marketing", "campaign", "paid ads", "social media", "advertising", "brand content"], queries: ["marketing"] },
  { match: /social media|influencer/i, terms: ["social media", "community", "influencer"], queries: ["social media manager"] },
  { match: /sales|business development/i, terms: ["sales", "business development", "partnership", "account executive"], queries: ["account executive", "business development"] },
];
const normalized = (value: string) => normalizeOpportunityText(value).toLowerCase().replace(/[^\p{L}\p{N}+#]+/gu, " ").trim();
function contains(text: string, term: string) { return ` ${normalized(text)} `.includes(` ${normalized(term)} `); }

const languages = [
  ['Chinese', 'Mandarin', '中文', '普通话', '汉语'],
  ['French', 'Français'], ['Spanish', 'Español'], ['German', 'Deutsch'],
  ['English', 'Anglais'], ['Italian', 'Italiano'], ['Portuguese', 'Português'],
  ['Japanese', '日本語'], ['Korean', '한국어'], ['Arabic', 'العربية'],
  ['Cantonese', '粤语'], ['Dutch', 'Nederlands'], ['Thai', 'ไทย'],
];
function languageAliases(label: string) {
  const key = normalized(label).replace(/ language$/, '');
  return languages.find(aliases => aliases.some(alias => normalized(alias) === key));
}

// Treat named tools/compound capabilities as concepts, not incidental words
// such as "final" (interview), "cut" (costs), "pro" or "power".
export function capabilityMatches(label: string, text: string) {
  const aliases = languageAliases(label);
  if (aliases) {
    // Employer location or a negated requirement is not language demand.
    return normalizeOpportunityText(text).split(/[.!?\n]/).some(sentence => {
      if (!aliases.some(alias => contains(sentence, alias))) return false;
      return !aliases.some(alias => new RegExp(`(?:no|without)\\s+${alias}(?:[- ]language)?(?:\\s+skills?)?\\s+(?:needed|required|necessary)|${alias}(?:[- ]language)?(?:\\s+skills?)?\\s+(?:is |are )?not\\s+(?:needed|required|necessary)`, 'i').test(sentence));
    });
  }
  if (contains(text, label)) return true;
  const related = groups.filter(group => group.match.test(label));
  if (related.length) return related.some(group => group.terms.some(term => contains(text, term)));
  const terms = normalized(label).split(" ").filter(term => term.length > 2 && !["and", "the", "professional", "experience", "management", "strategy", "creation"].includes(term));
  return terms.length > 0 && terms.every(term => contains(text, term));
}

export function missingOptionalLanguages(elements: string[], text: string) {
  return elements.filter(element => languageAliases(element) && !capabilityMatches(element, text));
}

export function remoteRoleQueries(elements: string[]) {
  const variants = elements.map(element => {
    const aliases = languageAliases(element);
    if (aliases) return aliases.slice(0, 2);
    const related = groups.filter(group => group.match.test(element));
    return [...new Set(related.length ? related.flatMap(group => group.queries) : [element.trim()])].slice(0, 4);
  });
  // Preserve every selected concept in every query. Put languages first, and
  // round-robin aliases so query limits cannot drop the secondary skill.
  const ordered = elements.map((element, i) => ({ language: Boolean(languageAliases(element)), variants: variants[i] ?? [] }))
    .filter(item => item.variants.length).sort((a, b) => Number(b.language) - Number(a.language));
  if (!ordered.length) return [];
  const result: string[] = [];
  for (let offset = 0; offset < 4; offset++) {
    for (let anchor = 0; anchor < 2; anchor++) {
      const query = ordered.map((item, i) => item.variants[(i === 0 ? anchor : offset) % item.variants.length]).join(' ');
      if (!result.includes(query)) result.push(query);
    }
  }
  return result.slice(0, 8);
}

export function opportunityEvidence(item: Record<string, unknown>) {
  const raw = item.raw_payload && typeof item.raw_payload === "object" ? item.raw_payload as Record<string, unknown> : {};
  // Never use inferred requiredSkills as evidence: that would validate itself.
  return String(item.listingEvidence ?? raw.listingEvidence ?? item.content ?? raw.content ?? item.summary ?? raw.summary ?? "");
}

export function hasUnsupportedEditingRequirement(elements: string[], text: string) {
  if (!elements.some(element => /final cut|premiere|davinci|capcut/i.test(element))) return false;
  const selected = elements.join(" ").toLowerCase();
  // A transferable editing capability is not proof of proficiency in a
  // specifically mandated NLE. Accept explicit alternatives/training only.
  return text.split(/[.!?\n]/).some(sentence => {
    if (/or similar|or equivalent|or other|willing to train|training sessions/i.test(sentence)) return false;
    const tools = ["premiere", "final cut", "davinci", "capcut"].filter(tool => sentence.toLowerCase().includes(tool));
    if (!tools.length || tools.some(tool => selected.includes(tool))) return false;
    return /required|requirements|proficiency|proficient|must|strong.*skills|using adobe|edit.*using|need from you/i.test(sentence);
  });
}
