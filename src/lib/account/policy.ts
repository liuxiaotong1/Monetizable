export const ADMIN_EMAIL = "liuxiaotong268@gmail.com";
export function isAdmin(
  user: { email?: string; email_confirmed_at?: string } | null | undefined,
) {
  return (
    !!user?.email_confirmed_at && user.email?.toLowerCase() === ADMIN_EMAIL
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const incoming = new URL(origin),
      target = new URL(request.url),
      host = request.headers.get("host") || target.host;
    return (
      ["https:", "http:"].includes(incoming.protocol) &&
      incoming.host === host &&
      incoming.origin === origin
    );
  } catch {
    return false;
  }
}
