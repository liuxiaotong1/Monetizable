/** Display name for the QQQ ETF. Bar symbols, forecast scoring and vendor URLs stay on QQQ. */
export function marketProductName(locale: string): string {
  if (locale === "zh") return "纳斯达克100 ETF";
  if (locale === "fr") return "ETF Nasdaq-100";
  return "Nasdaq-100 ETF";
}

const SKIP_KEYS = new Set([
  "symbol", "id", "conceptId", "url", "sourceUrl", "href", "kind", "category",
  "generatedAt", "asOf", "fetchedAt", "date", "openAt", "closeAt", "bodyUrl",
]);

/** Replace a user-facing QQQ mention. Leaves ticker URLs and vendor symbols intact. */
export function relabelMarketText(text: string, locale: string): string {
  if (!text.includes("QQQ")) return text;
  const name = marketProductName(locale);
  return text.replace(/QQQ/g, (match, offset: number, full: string) => {
    const before = full.slice(Math.max(0, offset - 80), offset);
    if (/https?:\/\/[^\s)"]*$/.test(before) || /(?:quote|symbols)\//.test(before) || /NASDAQ[:-]$/.test(before)) return match;
    return name;
  });
}

export function relabelQuestCopy<T>(value: T, locale: string, key = ""): T {
  if (typeof value === "string") return (SKIP_KEYS.has(key) ? value : relabelMarketText(value, locale)) as T;
  if (Array.isArray(value)) return value.map((item) => relabelQuestCopy(item, locale)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([itemKey, item]) => [itemKey, relabelQuestCopy(item, locale, itemKey)])) as T;
  }
  return value;
}
