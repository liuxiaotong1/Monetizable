const allowedHosts = new Set(["getmonetizable.com"]);

export function groupIndexNowUrls(values: unknown) {
  if (!Array.isArray(values) || values.length === 0 || values.length > 10_000) {
    throw new Error("Provide between 1 and 10,000 URLs.");
  }

  const groups = new Map<string, string[]>();
  for (const value of values) {
    if (typeof value !== "string") throw new Error("Every URL must be a string.");
    const url = new URL(value);
    if (url.protocol !== "https:" || !allowedHosts.has(url.hostname) || url.username || url.password) {
      throw new Error(`URL is not indexable by this site: ${value}`);
    }
    const normalized = url.toString();
    groups.set(url.hostname, [...(groups.get(url.hostname) ?? []), normalized]);
  }
  return groups;
}
