import type { OpportunityKind } from "@/lib/types";

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CapacitySignature {
  graphVersion: number;
  topCapabilities: string[];
  combinations: string[];
  languages: string[];
  constraints: string[];
  targetMarkets: string[];
  signatureText: string;
  embedding?: number[];
}

export interface OpportunitySignature {
  kind: OpportunityKind;
  capabilities: string[];
  geography: string[];
  requirements: string[];
  contactMethod: "public_email" | "application_link";
  contactValue?: string;
  signatureText: string;
  embedding?: number[];
}

export interface MarketTopic {
  key: string;
  label: string;
  query: string;
  opportunityKinds: OpportunityKind[];
  regions: string[];
  languages: string[];
  combinationIndex: number;
}

export type AgentJobKind = "email_outreach" | "reply_classification";
export type AgentJobStatus = "queued" | "running" | "awaiting_user_answer" | "submitted" | "sent" | "failed" | "skipped";

export interface ScanFunnelSnapshot {
  marketSignalsScanned: number;
  eligibleAfterHardFilters: number;
  capacityMatches: number;
  strongOpportunities: number;
  hotLeads: number;
  opportunityTypeBreakdown: Partial<Record<OpportunityKind, number>>;
  filteredOutReasons: {
    location: number;
    expired: number;
    duplicate: number;
    low_fit: number;
  };
}
