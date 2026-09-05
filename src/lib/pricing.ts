function numericValue(value: string) {
  const normalized = value.replace(/,/g, "");
  const amounts = [
    ...normalized.matchAll(/(?:[$€£]\s*)?(\d+(?:\.\d+)?)\s*([km])?/gi),
  ].map((match) => {
    const amount = Number(match[1]);
    const multiplier =
      match[2]?.toLowerCase() === "m"
        ? 1_000_000
        : match[2]?.toLowerCase() === "k"
          ? 1_000
          : 1;
    return amount * multiplier;
  });
  return amounts.length ? Math.max(...amounts) : -1;
}

export function highestPriceRange(range?: string) {
  if (!range) return undefined;
  const candidates = range
    .split(/\s*·\s*|\s+or\s+/i)
    .map((value) => value.trim())
    .filter(Boolean);
  return candidates.sort((a, b) => numericValue(b) - numericValue(a))[0];
}

export function numericPriceDisplay(value?: string) {
  if (!value) return undefined;
  const currencyRange = value.match(
    /[$£€]\s?\d[\d,.]*(?:\s*[km])?(?:\s*(?:to|[-–—])\s*[$£€]?\s?\d[\d,.]*(?:\s*[km])?)?/i,
  )?.[0];
  const numericRange = value.match(
    /\b(?:\d{1,3}(?:,\d{3})+|\d{4,}|\d+(?:\.\d+)?\s*[km])(?:\s*(?:to|[-–—])\s*(?:\d{1,3}(?:,\d{3})+|\d{4,}|\d+(?:\.\d+)?\s*[km]))?/i,
  )?.[0];
  const range = currencyRange ?? numericRange;
  if (!range) return undefined;
  const normalized = range
    .replace(/\s*(?:to|[-–—])\s*/i, "–")
    .replace(/\s+/g, " ");
  return currencyRange ? normalized : `$${normalized.replace("–", "–$")}`;
}
