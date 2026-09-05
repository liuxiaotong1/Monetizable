const CANONICAL_ORIGIN = "https://getmonetizable.com";

export function legacyBlogRedirectUrl(
  requestUrl: string,
  hostHeader: string | null,
  legacyBlogHostname = "blog.getmonetizable.com",
) {
  const request = new URL(requestUrl);
  const hostname = (hostHeader?.split(":")[0] ?? request.hostname).toLowerCase();
  if (hostname !== legacyBlogHostname.toLowerCase()) return null;

  const destination = new URL(request.pathname, CANONICAL_ORIGIN);
  destination.search = request.search;
  if (destination.pathname === "/") destination.pathname = "/blog";
  return destination;
}
