import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 5 * 60;

export function webhookSecretBytes(secret: string): Buffer | null {
  const raw = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  if (!raw || /[^A-Za-z0-9+/=]/.test(raw)) return null;
  const bytes = Buffer.from(raw, "base64");
  if (!bytes.length || bytes.toString("base64").replace(/=+$/g, "") !== raw.replace(/=+$/g, "")) return null;
  return bytes.length >= 16 ? bytes : null;
}

export function verifyWebhookSignature(
  payload: string,
  headers: { id?: string | null; timestamp?: string | null; signature?: string | null },
  secret: string,
  now = Date.now(),
): boolean {
  const id = headers.id?.trim() || "";
  const timestamp = headers.timestamp?.trim() || "";
  const signature = headers.signature?.trim() || "";
  if (!id || !timestamp || !signature || id.length > 200 || timestamp.length > 20) return false;
  if (!/^\d+$/.test(timestamp)) return false;
  const seconds = Number(timestamp);
  if (Math.abs(now / 1000 - seconds) > TOLERANCE_SECONDS) return false;
  const key = webhookSecretBytes(secret);
  if (!key) return false;
  const expected = Buffer.from(createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest("base64"));
  return signature.split(" ").some((part) => {
    const separator = part.indexOf(",");
    if (separator < 0) return false;
    const version = part.slice(0, separator);
    const value = part.slice(separator + 1);
    if (version !== "v1" || !value) return false;
    const got = Buffer.from(value);
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
