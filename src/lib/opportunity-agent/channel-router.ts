import type { Opportunity } from "@/lib/types";
import { extractPublicContact } from "@/lib/opportunity-agent/signatures";

export type OpportunityPath = "employment" | "independent" | "mixed";
export type ExecutionChannel = "email_outreach" | "platform_application" | "skip";

export interface ChannelDecision {
  opportunityId: string;
  path: OpportunityPath;
  channel: ExecutionChannel;
  reason: string;
  publicContact?: string;
  evidenceUrls: string[];
}

const LINKEDIN_HOST = /(?:^|\.)linkedin\.com$/i;

function host(value?: string) {
  if (!value) return "";
  try { return new URL(value).hostname; } catch { return ""; }
}

export function opportunityPath(kind?: Opportunity["kind"]): OpportunityPath {
  if (kind === "employment") return "employment";
  if (kind && ["freelance_contract", "consulting", "fractional", "productized_service", "latent_buyer_demand"].includes(kind)) return "independent";
  return "mixed";
}

export function decideExecutionChannel(opportunity: Opportunity): ChannelDecision {
  const path = opportunityPath(opportunity.kind);
  const publicContact = extractPublicContact(opportunity);
  const evidenceUrls = [...new Set([opportunity.url, ...(opportunity.evidenceUrls ?? [])].filter(Boolean))] as string[];
  const opportunityId = opportunity.id ?? opportunity.url ?? `${opportunity.source}:${opportunity.title}`;

  if (publicContact) {
    return { opportunityId, path, channel: "email_outreach", reason: "verified_public_professional_contact", publicContact, evidenceUrls };
  }
  if (opportunity.url) {
    try {
      const url = new URL(opportunity.url);
      if (["http:", "https:"].includes(url.protocol)) {
        return {
          opportunityId,
          path,
          channel: "platform_application",
          reason: LINKEDIN_HOST.test(host(opportunity.url)) ? "platform_requires_user_submission_no_automation" : "platform_requires_user_submission",
          evidenceUrls,
        };
      }
    } catch { /* invalid public destination */ }
  }
  return { opportunityId, path, channel: "skip", reason: "no_verified_public_professional_contact", evidenceUrls };
}

export function verifiedTargetKey(value: { opportunityMatchId?: string; sourceUrl?: string; recipient?: string; title?: string; company?: string }) {
  if (value.opportunityMatchId) return `match:${value.opportunityMatchId}`;
  if (value.sourceUrl) {
    try {
      const url = new URL(value.sourceUrl);
      url.hash = "";
      url.searchParams.sort();
      return `url:${url.toString().replace(/\/$/, "").toLowerCase()}`;
    } catch { /* fall through */ }
  }
  if (value.recipient) return `email:${value.recipient.trim().toLowerCase()}`;
  return `label:${`${value.company ?? ""}:${value.title ?? ""}`.trim().toLowerCase()}`;
}
