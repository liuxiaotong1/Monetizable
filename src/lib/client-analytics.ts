import type { AnalyticsEvent } from "@/lib/analytics";
import { sendGAEvent } from "@next/third-parties/google";

type ClarityArguments = [command: "event" | "set", name: string, value?: string];
type ClarityClient = ((...args: ClarityArguments) => void) & { q?: ClarityArguments[] };
type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type DiscoveryAttribution = {
  discoverySource: string;
  discoveryChannel: string;
};

declare global {
  interface Window {
    clarity?: ClarityClient;
  }
}

const clarityEnabled = /^[a-z0-9]+$/i.test(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() ?? "");
const privatePropertyPattern = /id|token|email/i;
const attributionStorageKey = "monetizable:discovery-attribution";

export function discoveryAttribution(currentUrl: string, referrer: string): DiscoveryAttribution {
  const source = new URL(currentUrl).searchParams.get("utm_source")?.trim().toLowerCase();
  if (source) return { discoverySource: source, discoveryChannel: source === "chatgpt.com" ? "ai_search" : "campaign" };
  if (!referrer) return { discoverySource: "direct", discoveryChannel: "direct" };

  const hostname = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  const knownSources: Array<[RegExp, string, string]> = [
    [/(^|\.)chatgpt\.com$/, "chatgpt", "ai_search"],
    [/(^|\.)perplexity\.ai$/, "perplexity", "ai_search"],
    [/(^|\.)claude\.ai$/, "claude", "ai_search"],
    [/(^|\.)copilot\.microsoft\.com$/, "microsoft-copilot", "ai_search"],
    [/(^|\.)gemini\.google\.com$/, "google-gemini", "ai_search"],
    [/(^|\.)meta\.ai$/, "meta-ai", "ai_search"],
    [/(^|\.)you\.com$/, "you-com", "ai_search"],
    [/(^|\.)phind\.com$/, "phind", "ai_search"],
    [/(^|\.)search\.brave\.com$/, "brave-search", "organic_search"],
    [/(^|\.)bing\.com$/, "bing", "organic_search"],
    [/(^|\.)google\.[a-z.]+$/, "google", "organic_search"],
  ];
  const match = knownSources.find(([pattern]) => pattern.test(hostname));
  return match
    ? { discoverySource: match[1], discoveryChannel: match[2] }
    : { discoverySource: hostname, discoveryChannel: "referral" };
}

export function rememberDiscoveryAttribution(attribution: DiscoveryAttribution, storage: StorageLike) {
  const existing = readDiscoveryAttribution(storage);
  if (attribution.discoveryChannel === "direct" && existing) return existing;
  storage.setItem(attributionStorageKey, JSON.stringify(attribution));
  return attribution;
}

export function readDiscoveryAttribution(storage: Pick<Storage, "getItem">): DiscoveryAttribution | null {
  try {
    const value = JSON.parse(storage.getItem(attributionStorageKey) ?? "null") as Partial<DiscoveryAttribution> | null;
    return value && typeof value.discoverySource === "string" && typeof value.discoveryChannel === "string"
      ? { discoverySource: value.discoverySource, discoveryChannel: value.discoveryChannel }
      : null;
  } catch {
    return null;
  }
}

export function attributedMainSiteUrl(href: string, attribution: DiscoveryAttribution) {
  const url = new URL(href);
  if (url.hostname !== "getmonetizable.com" || attribution.discoveryChannel === "direct") return href;
  if (!url.searchParams.has("utm_source")) url.searchParams.set("utm_source", attribution.discoverySource);
  if (!url.searchParams.has("utm_medium")) url.searchParams.set("utm_medium", attribution.discoveryChannel);
  return url.toString();
}

export function googleAnalyticsEventName(event: AnalyticsEvent) {
  if (event === "purchase_completed") return "purchase";
  if (event === "checkout_started") return "begin_checkout";
  return event;
}

function getClarityClient() {
  if (window.clarity) return window.clarity;

  const clarity: ClarityClient = (...args) => {
    clarity.q = clarity.q ?? [];
    clarity.q.push(args);
  };
  window.clarity = clarity;
  return clarity;
}

export function trackClient(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  let enrichedProperties = properties;
  try {
    if (typeof properties.discoverySource === "string" && typeof properties.discoveryChannel === "string") {
      rememberDiscoveryAttribution({
        discoverySource: properties.discoverySource,
        discoveryChannel: properties.discoveryChannel,
      }, window.sessionStorage);
    }
    const attribution = readDiscoveryAttribution(window.sessionStorage);
    if (attribution) enrichedProperties = { ...properties, ...attribution };
  } catch {
    // Attribution must never block product analytics or the product flow.
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event, properties: enrichedProperties }),
    keepalive: true,
  });

  if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    const gaProperties = Object.fromEntries(
      Object.entries(enrichedProperties).filter(([key, value]) =>
        !privatePropertyPattern.test(key) && ["string", "number", "boolean"].includes(typeof value)
      ),
    );
    sendGAEvent("event", googleAnalyticsEventName(event), gaProperties);
  }

  if (!clarityEnabled) return;

  const clarity = getClarityClient();
  clarity("event", event);
  for (const [key, value] of Object.entries(enrichedProperties)) {
    if (privatePropertyPattern.test(key) || !["string", "number", "boolean"].includes(typeof value)) continue;
    clarity("set", key, String(value));
  }
}
