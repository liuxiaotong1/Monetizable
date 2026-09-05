const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function isSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.username || url.password || (url.port && !["80", "443"].includes(url.port))) return false;
    if (BLOCKED_HOSTS.has(host) || host.endsWith(".localhost") || host.endsWith(".local") || !host.includes(".")) return false;
    // URL normalizes numeric/hex IPv4 representations before this check.
    // IP-literal IPv6 is intentionally not accepted for public opportunity URLs.
    if (host.includes(":")) return false;
    if (/^(0\.|127\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|(?:22[4-9]|23\d|24\d|25[0-5])\.)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export function canonicalUrl(value: string) {
  const url = new URL(value);
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"].forEach((key) => url.searchParams.delete(key));
  url.hash = "";
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, "");
  return url.toString().replace(/\/$/, "");
}
