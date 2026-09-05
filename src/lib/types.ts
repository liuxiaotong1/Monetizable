export type ProfileSource = "linkedin_public" | "cv" | "manual";
export type ProfileRetrievalSource = "linkedin_public_page" | "public_search" | "uploaded_file" | "manual_input";
export type DemandLevel = "Low" | "Medium" | "High";
export type LocationDependency = "low" | "medium" | "high";
export type MonetizationSpeed = "Fast" | "Moderate" | "Slower";
export type WorkMode = "local" | "regional_remote" | "global_remote";
export type OpportunityKind = "employment" | "freelance_contract" | "consulting" | "fractional" | "productized_service" | "latent_buyer_demand";

export interface ProfileEvidence {
  source: ProfileSource;
  text: string;
  url?: string;
  retrievalSource?: ProfileRetrievalSource;
}

export interface ProfileRole {
  title: string;
  company?: string;
  description?: string;
  source?: ProfileSource;
  startDate?: string;
  endDate?: string;
  location?: string;
}

export interface NormalizedProfile {
  sources: ProfileSource[];
  name?: string;
  headline?: string;
  location?: string;
  summary: string;
  roles: ProfileRole[];
  education: string[];
  skills: string[];
  languages: string[];
  certifications: string[];
  projects: string[];
  rawEvidence: ProfileEvidence[];
  completeness: "sufficient" | "insufficient";
  confidence: "low" | "medium" | "high";
  conflicts: string[];
}

export interface UserContext {
  country?: string;
  city?: string;
  workMode: WorkMode;
  exclusions?: string;
  targetRoles?: string[];
  targetLocations?: string[];
  relocationPreference?: string;
  workAuthorization?: string;
  contractTypes?: string[];
  availableFrom?: string;
}

export interface SkillGraph {
  industries: string[];
  roles: string[];
  yearsExperience: number | null;
  hardSkills: string[];
  commercialSkills: string[];
  tools: string[];
  languages: string[];
  education: string[];
  geographicContext: string[];
  crossCulturalExperience: string[];
  domainExpertise: string[];
  creativeAbilities: string[];
  salesAbilities: string[];
  operationalAbilities: string[];
  certifications: string[];
  strengths: string[];
  interests: string[];
}

export interface ServiceOffer {
  name: string;
  description: string;
  projectStructure: string;
  searchQueries: string[];
  location_dependency: LocationDependency;
  speed_to_monetize: MonetizationSpeed;
}

export interface CareerProspect {
  name: string;
  roleModelTitle: string;
  wikipediaTitle: string;
  imageUrl?: string;
  profileUrl?: string;
  whatTheyBuilt: string;
  whyRelevant: string;
  whatTheyDidDifferently: string;
  stealThisMove: string;
}

export interface SkillCombination {
  elements: string[];
  evidence: string[];
  differentiation: string;
  alreadyPerformedTogether: boolean;
  noveltyReason: string;
  careerProspect: CareerProspect;
  demandLevel: DemandLevel;
  services: ServiceOffer[];
}

export interface Positioning {
  sentence: string;
  leadWithEdge: string;
  serviceTitle: string;
  targetClient: string;
  outreachAngle: string;
  estimatedEarningRange?: string;
  estimatedEarningBasis?: string;
  estimatedEarningSourceUrl?: string;
  estimatedEarningMarket: "EU/US";
}

export interface WeakProfile {
  message: string;
  strongestAsset: string;
  missingCapability: string;
  closestPath: string;
}

export interface Opportunity {
  id: string;
  title: string;
  source: string;
  url: string;
  postedDate?: string;
  compensation?: string;
  location?: string;
  remoteStatus?: string;
  authorization?: string;
  summary: string;
  requiredSkills: string[];
  fitLabel: "Strong fit" | "Good fit" | "Moderate fit";
  fitReason: string;
  combinationIndex: number;
  score: number;
  location_dependency: LocationDependency;
  speed_to_monetize: MonetizationSpeed;
  kind?: OpportunityKind;
  buyer?: string;
  publicSignals?: string[];
  suggestedOffer?: string;
  evidenceUrls?: string[];
}

export interface PricingEvidence {
  range?: string;
  sampleSize: number;
  disclaimer: string;
}

export type CapacityNodeType = "skill" | "domain" | "industry" | "language" | "tool" | "experience" | "strength" | "interest" | "constraint";

export interface CapacityNode {
  id: string;
  type: CapacityNodeType;
  label: string;
  evidence: string[];
  confidence: "low" | "medium" | "high";
}

export interface CapacityEdge {
  source: string;
  target: string;
  type: "demonstrated_together" | "complementary" | "constraint";
  combinationIndex?: number;
}

export interface CapacityGraph {
  version: number;
  nodes: CapacityNode[];
  edges: CapacityEdge[];
  combinations: SkillCombination[];
  updatedAt: string;
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  expiresAt: string;
  paid: boolean;
  context: UserContext;
  profile: NormalizedProfile;
  skillGraph: SkillGraph;
  combinations: SkillCombination[];
  opportunities: Opportunity[];
  pricing: PricingEvidence[];
  positioning: Positioning;
  weakProfile?: WeakProfile;
  searchStatus: "complete" | "partial" | "failed";
  capacityGraph?: CapacityGraph;
}

export interface PreviewCombination {
  elements: string[];
  evidence: string[];
  demandLevel: DemandLevel;
  noveltyReason: string;
}

export interface Preview {
  analysisId: string;
  profileName?: string;
  strongestCombination: string[];
  combinationEvidence: string[];
  servicePreview: Pick<ServiceOffer, "name" | "description" | "location_dependency" | "speed_to_monetize">;
  demandLevel: DemandLevel;
  pricing?: PricingEvidence;
  liveOpportunityCount: number;
  opportunityTeasers: Array<Pick<Opportunity, "source" | "fitLabel"> & {
    kind?: OpportunityKind;
    locationDependency: LocationDependency;
    speedToMonetize: MonetizationSpeed;
  }>;
  explanation: string;
  weakProfile?: WeakProfile;
  searchStatus: AnalysisResult["searchStatus"];
  expiresAt: string;
  capacityGraph: CapacityGraph;
  topCombinations: PreviewCombination[];
  freeAnalysis: {
    combinations: Array<Omit<SkillCombination, "services"> & {
      services: Array<Omit<ServiceOffer, "searchQueries">>;
    }>;
    pricing: PricingEvidence[];
    positioning: Positioning;
  };
}
