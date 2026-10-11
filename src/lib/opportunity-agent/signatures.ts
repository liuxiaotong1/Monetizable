import { canonicalUrl } from "@/lib/url";
import type { ActiveAgentProfile } from "@/lib/opportunity-agent/storage";
import type { CapacitySignature, OpportunitySignature } from "@/lib/opportunity-agent/types";
import type { Opportunity } from "@/lib/types";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const ASSET_TLDS = new Set(["avif", "css", "gif", "ico", "jpeg", "jpg", "js", "json", "map", "png", "svg", "ttf", "webp", "woff", "woff2"]);

export function isValidProfessionalEmail(value: string) {
  const email = value.trim().toLowerCase();
  const [local, domain] = email.split("@");
  const tld = domain?.split(".").pop() ?? "";
  if (!local || !domain || !/^[-a-z0-9._%+]+@(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(email)) return false;
  if (ASSET_TLDS.has(tld) || /(?:^|[._-])(?:noise|sprite|icon|image|asset)(?:[._-]|$)|\d+x\d+|u00[0-9a-f]{2}/i.test(local)) return false;
  return !/@(?:gmail|yahoo|hotmail|outlook|icloud)\./i.test(email);
}

export function extractPublicContact(opportunity: Opportunity) {
  // Marketplace footer/demo addresses belong to the platform, not the buyer.
  if (isProjectMarketplace(opportunity.url)) return undefined;
  const evidence = [opportunity.summary, ...(opportunity.publicSignals ?? [])].join(" ");
  return evidence.match(EMAIL_PATTERN)?.map((value) => value.toLowerCase()).find(isValidProfessionalEmail);
}

export function isProjectMarketplace(url:string) {
  try {return /(^|\.)(freelancer\.com|upwork\.com|peopleperhour\.com|guru\.com|contra\.com)$/.test(new URL(url).hostname);}catch{return false;}
}

export function prefersDirectOutreach(kind?: Opportunity["kind"]) {
  return Boolean(kind && [
    "freelance_contract",
    "consulting",
    "fractional",
    "productized_service",
    "latent_buyer_demand",
  ].includes(kind));
}

export function buildCapacitySignature(profile: ActiveAgentProfile): CapacitySignature {
  const nodes = profile.graph.nodes.filter((node) => node.type !== "constraint" && node.evidence.length).sort((a, b) => b.evidence.length - a.evidence.length);
  const selectedIntent = (profile.intentCapabilities ?? []).filter(Boolean);
  const topCapabilities = selectedIntent.length ? selectedIntent : nodes.slice(0, 16).map((node) => node.label);
  const combinations = selectedIntent.length
    ? [selectedIntent.join(" × ")]
    : profile.graph.combinations.slice(0, 5).map((combination) => combination.elements.join(" × "));
  const languages = profile.graph.nodes.filter((node) => node.type === "language").map((node) => node.label).slice(0, 8);
  const constraints = [
    profile.context.country,
    profile.context.city,
    profile.context.workMode,
    profile.context.exclusions,
    ...(profile.context.targetRoles ?? []),
    ...(profile.context.targetLocations ?? []),
    profile.context.relocationPreference,
    profile.context.workAuthorization,
    ...(profile.context.contractTypes ?? []),
    profile.context.availableFrom,
  ].filter(Boolean) as string[];
  const targetMarkets = profile.graph.nodes.filter((node) => node.type === "industry" || node.type === "domain").map((node) => node.label).slice(0, 8);
  return { graphVersion: profile.graph.version, topCapabilities, combinations, languages, constraints, targetMarkets, signatureText: [topCapabilities.join(", "), combinations.join("; "), languages.join(", "), constraints.join(", "), targetMarkets.join(", ")].filter(Boolean).join(" | ") };
}

export function buildOpportunitySignature(opportunity: Opportunity): OpportunitySignature {
  const publicEmail = extractPublicContact(opportunity);
  const contactMethod = publicEmail ? "public_email" : "application_link";
  const geography = [opportunity.location, opportunity.remoteStatus, opportunity.authorization].filter(Boolean) as string[];
  const requirements = opportunity.requiredSkills.slice(0, 16);
  const capabilities = [...new Set([...requirements, ...(opportunity.suggestedOffer ? [opportunity.suggestedOffer] : [])])];
  return {
    kind: opportunity.kind ?? "employment",
    capabilities,
    geography,
    requirements,
    contactMethod,
    contactValue: publicEmail ?? (opportunity.url ? canonicalUrl(opportunity.url) : undefined),
    signatureText: [opportunity.title, opportunity.kind, opportunity.summary.slice(0, 600), capabilities.join(", "), geography.join(", ")].filter(Boolean).join(" | "),
  };
}
