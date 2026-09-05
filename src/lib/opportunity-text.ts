const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  nbsp: " ",
  quot: '"',
  rdquo: "”",
  rsquo: "’",
};

function decodeEntity(entity: string, name: string) {
  if (name.toLowerCase().startsWith("#x")) {
    const value = Number.parseInt(name.slice(2), 16);
    return Number.isInteger(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : entity;
  }
  if (name.startsWith("#")) {
    const value = Number.parseInt(name.slice(1), 10);
    return Number.isInteger(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : entity;
  }
  return NAMED_ENTITIES[name.toLowerCase()] ?? entity;
}

export function normalizeOpportunityText(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, decodeEntity)
    .replace(/\s+/g, " ")
    .trim();
}

export function safeOpportunityDescription(value?: string | null) {
  if (!value) return null;
  // Search snippets containing layout entities plus repeated ellipses are
  // fragments, not readable descriptions. Never show them to the user.
  const fragmentMarkers = value.match(/\.{3,}|…/g)?.length ?? 0;
  if (/&nbsp;|\uFFFD|Ã|Â|â€|â€™|â€œ|â€/i.test(value) || fragmentMarkers >= 2) return null;
  const normalized = normalizeOpportunityText(value);
  if (!normalized || /&(?:#x?[\da-f]+|[a-z]+);/i.test(normalized)) return null;
  const words = normalized.split(/\s+/).filter(Boolean);
  const punctuationFragments = words.filter((word) => /^\W+$/.test(word)).length;
  if (words.length < 6 || punctuationFragments > Math.max(2, words.length * 0.08)) return null;
  return normalized;
}
