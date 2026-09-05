import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const OAUTH_STATE_COOKIE = "monetizable_oauth_state";

export function safeAuthRedirect(value: string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return "/agent";
  try {
    const url = new URL(value, "https://monetizable.invalid");
    return url.origin === "https://monetizable.invalid" ? `${url.pathname}${url.search}${url.hash}` : "/agent";
  } catch { return "/agent"; }
}

function loginStateSecret() {
  return process.env.GMAIL_TOKEN_ENCRYPTION_KEY ?? process.env.CRON_SECRET ?? "";
}

export function createLoginOAuthState(next: string) {
  if (!loginStateSecret()) throw new Error("OAuth state signing is not configured");
  const payload = Buffer.from(JSON.stringify({ flow: "login", next: safeAuthRedirect(next), nonce: randomBytes(24).toString("base64url"), exp: Date.now() + 10 * 60_000 })).toString("base64url");
  const signature = createHmac("sha256", loginStateSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyLoginOAuthState(state: string) {
  try {
  const [payload, signature] = state.split(".");
  if (!payload || !signature || !loginStateSecret()) return null;
  const expected = createHmac("sha256", loginStateSecret()).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { flow?: string; next?: string; exp?: number };
  return value.flow === "login" && Number(value.exp) > Date.now() ? { next: safeAuthRedirect(value.next) } : null;
  } catch { return null; }
}

export function authCallbackUrl(redirectPath: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const callback = new URL("/auth/callback", appUrl);
  callback.searchParams.set("next", safeAuthRedirect(redirectPath));
  return callback.toString();
}
