/** Microsoft Clarity. The project id is public; the env var overrides the known project when set. */
export const CLARITY_PROJECT_ID = "y1en34n746";
const STORAGE_KEY = "monetizable:cookie-consent";
const privatePropertyPattern = /id|token|email/i;

export type CookieChoice = "granted" | "denied";
type ClarityArgs = unknown[];
export type ClarityClient = ((...args: ClarityArgs) => void) & { q?: ClarityArgs[] };

declare global {
  interface Window {
    clarity?: ClarityClient;
  }
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function clarityProjectId(configured = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID): string {
  const value = configured?.trim() ?? "";
  return /^[a-z0-9]+$/i.test(value) ? value : CLARITY_PROJECT_ID;
}

/** True when a Clarity project id is available. The public fallback keeps tracking on if Vercel has no env var. */
export const clarityEnabled = /^[a-z0-9]+$/i.test(clarityProjectId());

function storageOrNull(storage?: StorageLike | null): StorageLike | null {
  if (storage) return storage;
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

export function readCookieChoice(storage?: StorageLike | null): CookieChoice | null {
  try {
    const value = storageOrNull(storage)?.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function writeCookieChoice(choice: CookieChoice, storage?: StorageLike | null) {
  try {
    storageOrNull(storage)?.setItem(STORAGE_KEY, choice);
  } catch {
    // A blocked storage API still allows the choice for this page view.
  }
}

/** Queues calls until the Clarity tag replaces this stub. Does not load the tag. */
export function getClarityClient(): ClarityClient {
  if (typeof window === "undefined") return (() => {}) as ClarityClient;
  if (window.clarity) return window.clarity;
  const clarity: ClarityClient = (...args) => {
    clarity.q = clarity.q ?? [];
    clarity.q.push(args);
  };
  window.clarity = clarity;
  return clarity;
}

/** Custom tags skip account identifiers. Nothing is queued unless analytics consent was stored. */
export function setClarityTag(name: string, value: string) {
  if (!clarityEnabled || privatePropertyPattern.test(name) || readCookieChoice() !== "granted") return;
  getClarityClient()("set", name, value);
}

let clarityTagRequested = false;

/**
 * Load https://www.clarity.ms/tag only after analytics consent.
 * Consent API v2 is queued before the tag runs so EEA visits are recorded.
 * Ad storage stays denied: this consent is for site measurement, not advertising.
 * Clarity keeps its default masking of input values; do not unmask sensitive fields.
 */
export function startClarity() {
  if (!clarityEnabled || typeof document === "undefined") return;
  const clarity = getClarityClient();
  clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
  if (clarityTagRequested || document.getElementById("microsoft-clarity")) return;
  clarityTagRequested = true;
  const script = document.createElement("script");
  script.id = "microsoft-clarity";
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${clarityProjectId()}`;
  script.onload = () => {
    if (readCookieChoice() !== "granted") return;
    window.clarity?.("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
  };
  document.head.appendChild(script);
}

/** Stop cookies on a tag that already loaded. A refusal before load never inserts the tag. */
export function stopClarity() {
  if (typeof window === "undefined" || !window.clarity) return;
  window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" });
  window.clarity("consent", false);
}

export function applyCookieChoice(choice: CookieChoice, storage?: StorageLike | null) {
  writeCookieChoice(choice, storage);
  if (choice === "granted") startClarity();
  else stopClarity();
}
