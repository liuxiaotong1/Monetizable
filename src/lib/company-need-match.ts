export type MatchableCompanyNeed = { expertise: string[]; expertiseOther?: string };
export type MatchableCandidateProfile = { id: string; top_skills?: unknown; skill_combinations?: unknown; languages?: unknown; destination_markets?: unknown };

const expertiseAliases: Record<string, string[]> = {
  "b2b sales": ["b2b sales", "business development", "sales strategy", "sales"],
  "financial analysis": ["financial analysis", "finance", "financial modelling", "financial modeling"],
  "ai automation": ["ai automation", "artificial intelligence", "workflow automation", "automation"],
  "short-form content": ["short-form content", "content creation", "social media", "video content"],
  "french market knowledge": ["french market", "france market"],
  "chinese language": ["chinese", "mandarin"],
  "ux design": ["ux design", "user experience", "product design"],
};

function normalize(value: string) { return value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}\s+#-]/gu, " ").replace(/\s+/g, " ").trim(); }
function flattenText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flattenText).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(flattenText).join(" ");
  return "";
}

export function countCapabilityMatches(need: MatchableCompanyNeed, profiles: MatchableCandidateProfile[]) {
  const requested = [...need.expertise, ...(need.expertiseOther?.split(/[,;\n]/) ?? [])].map(normalize).filter(Boolean);
  const groups = requested.map((item) => (expertiseAliases[item] ?? [item]).map(normalize));
  if (!groups.length) return 0;
  return profiles.filter((profile) => {
    const combinations = Array.isArray(profile.skill_combinations) ? profile.skill_combinations.map((value) => value && typeof value === "object" ? value.elements : []) : [];
    const evidence = ` ${normalize(flattenText([profile.top_skills, combinations, profile.languages]))} `;
    return groups.every((aliases) => aliases.some((term) => evidence.includes(` ${term} `)));
  }).length;
}
