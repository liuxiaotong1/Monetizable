import { isTrustedWikipediaUrl } from "@/lib/role-model";

// Resolve missing/stale portraits in saved reports without regenerating analysis.
export async function GET(request: Request) {
  const title = new URL(request.url).searchParams.get("title")?.trim();
  if (!title || title.length > 160 || /[|\x00-\x1f]/.test(title)) {
    return new Response(null, { status: 400 });
  }
  try {
    const params = new URLSearchParams({ action: "query", prop: "pageimages", piprop: "thumbnail", pithumbsize: "256", redirects: "1", format: "json", titles: title });
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: { accept: "application/json", "user-agent": "Monetizable/1.0 (https://thecoreme.com)" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error("Portrait lookup unavailable");
    const data = await response.json() as { query?: { pages?: Record<string, { thumbnail?: { source?: string } }> } };
    const source = Object.values(data.query?.pages ?? {})[0]?.thumbnail?.source;
    if (source && isTrustedWikipediaUrl(source, "image")) {
      return new Response(null, { status: 302, headers: { Location: source, "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
    }
  } catch {
    // Do not cache temporary upstream failures; reloading can retry the lookup.
  }
  return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
}
