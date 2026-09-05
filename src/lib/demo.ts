import type { AnalysisResult, NormalizedProfile, UserContext } from "@/lib/types";

export function demoAnalysis(context: UserContext, profile: NormalizedProfile): Omit<AnalysisResult, "id" | "createdAt" | "expiresAt" | "paid"> {
  return {
    context,
    profile,
    skillGraph: {
      industries: ["Fintech", "B2B SaaS"], roles: ["Content Strategist", "Market Analyst"], yearsExperience: 6,
      hardSkills: ["Financial research", "Copywriting"], commercialSkills: ["Go-to-market messaging"],
      tools: ["Notion", "HubSpot"], languages: ["English", "Mandarin"], education: ["Finance"],
      geographicContext: context.country ? [context.country] : [], crossCulturalExperience: ["China–Europe market communication"],
      domainExpertise: ["Fintech"], creativeAbilities: ["Short-form content", "Video scripts"],
      salesAbilities: ["Outbound messaging"], operationalAbilities: ["Content operations"], certifications: [],
      strengths: ["Cross-market communication", "Research synthesis"], interests: [],
    },
    combinations: [
      { elements: ["Finance", "Mandarin", "Sales Messaging"], evidence: ["Finance-sector work", "Mandarin fluency", "Outbound messaging"], differentiation: "It combines separate finance, language, and commercial messaging assets into a buyer-ready offer not shown in prior roles.", alreadyPerformedTogether: false, noveltyReason: "Finance, Mandarin, and outbound messaging are evidenced separately; the profile does not show them delivered together as a service.", careerProspect: { name: "Mellody Hobson", roleModelTitle: "American businesswoman", wikipediaTitle: "Mellody Hobson", whatTheyBuilt: "Built a prominent career connecting finance, leadership, and public communication.", whyRelevant: "Your finance knowledge and commercial communication overlap with parts of this path, though her career is at a very different scale and is not Mandarin-focused.", whatTheyDidDifferently: "She paired financial expertise with a clear public leadership position rather than presenting herself as a generalist.", stealThisMove: "Package your finance knowledge and Mandarin as one commercial outcome. Lead with a small messaging sprint instead of selling language by the hour. You already have the separate building blocks to test this path." }, demandLevel: "High", services: [{ name: "Mandarin fintech sales messaging", description: "Adapt fintech value propositions and outbound sequences for Chinese-speaking buyers.", projectStructure: "Messaging audit plus a five-email sequence and LinkedIn scripts.", searchQueries: ["Mandarin fintech sales copywriter freelance", "Chinese fintech outbound messaging contract"], location_dependency: "low", speed_to_monetize: "Fast" }] },
      { elements: ["B2B SaaS", "Financial Research", "Localization"], evidence: ["SaaS experience", "Financial research", "Cross-market messaging"], differentiation: "It turns separately proven research and cross-market skills into localized buyer intelligence for SaaS teams.", alreadyPerformedTogether: false, noveltyReason: "SaaS, research, and localization appear as separate strengths, with no evidence of a combined market-intelligence offer.", careerProspect: { name: "Erin Meyer", roleModelTitle: "American author and academic", wikipediaTitle: "Erin Meyer", whatTheyBuilt: "Built a career translating cross-cultural research into practical guidance for international organizations.", whyRelevant: "Your research ability and cross-market messaging map to similar inputs, although her path is academic and advisory rather than fintech execution.", whatTheyDidDifferently: "She made cross-cultural operating problems a specific, recognizable specialty.", stealThisMove: "Combine interviews, research, and localization into a fixed-scope market-entry sprint. Show the client what to say and why buyers will care. Your mixed background is useful precisely because it crosses these functions." }, demandLevel: "Medium", services: [{ name: "Localized fintech buyer research", description: "Research Chinese-speaking buyer needs and localize findings for B2B SaaS teams.", projectStructure: "Two-week research sprint with interview synthesis and localized messaging recommendations.", searchQueries: ["Chinese fintech market research contractor", "Mandarin SaaS buyer research freelance"], location_dependency: "low", speed_to_monetize: "Fast" }] },
      { elements: ["Finance", "Research", "Video Scripts"], evidence: ["Financial research", "Short-form scripts"], differentiation: "This validates an existing execution strength but is intentionally ranked below unexplored combinations.", alreadyPerformedTogether: true, noveltyReason: "The profile already shows financial research and finance content production used together.", careerProspect: { name: "Aswath Damodaran", roleModelTitle: "Finance professor and valuation educator", wikipediaTitle: "Aswath Damodaran", whatTheyBuilt: "Built a public educational career around rigorous valuation research and accessible financial explanation.", whyRelevant: "You already demonstrate financial research and short-form explanation skills, though his path is academic and long-form.", whatTheyDidDifferently: "He made a specific finance discipline and a consistent teaching format central to his public positioning.", stealThisMove: "Turn the existing capability into a repeatable monthly format with a clear editorial standard. Sell consistency and accuracy as the premium. You are closer to this path than a generalist starting from zero." }, demandLevel: "Medium", services: [{ name: "Fintech short-form research and scripts", description: "Research and script accurate short-form explainers for fintech brands.", projectStructure: "Monthly batch of 8 research-backed scripts.", searchQueries: ["fintech video scriptwriter freelance", "finance content researcher contract"], location_dependency: "low", speed_to_monetize: "Fast" }] },
    ],
    opportunities: Array.from({ length: 12 }, (_, index) => ({
      id: `demo-${index + 1}`, title: ["Mandarin Fintech Content Writer", "Chinese Localization Consultant", "Finance Video Scriptwriter"][index % 3],
      source: ["Wellfound", "Public company careers", "Contra"][index % 3], url: "https://example.com/opportunity",
      postedDate: new Date(Date.now() - index * 86400000).toISOString(), compensation: index % 2 ? "$45–$70/hr" : "$600–$1,200 project",
      location: index % 3 ? "Remote" : context.country, remoteStatus: "Remote", summary: "Create market-aware content for a growing financial technology company.",
      requiredSkills: ["Fintech", "Mandarin", "Content"], fitLabel: index < 4 ? "Strong fit" : index < 9 ? "Good fit" : "Moderate fit",
      fitReason: "Your demonstrated financial research, Mandarin, and content experience map directly to the brief. The remote arrangement is compatible with your stated preference.",
      combinationIndex: index % 3, score: 92 - index * 2, location_dependency: "low", speed_to_monetize: "Fast",
    })),
    pricing: [
      { range: "$45–$85/hr or $500–$1,500/project", sampleSize: 5, disclaimer: "Comparable public listings, not an earnings prediction." },
      { range: "$400–$1,000/project", sampleSize: 3, disclaimer: "Comparable public listings, not an earnings prediction." },
      { range: "$250–$800/project", sampleSize: 4, disclaimer: "Comparable public listings, not an earnings prediction." },
    ],
    positioning: {
      sentence: "I help fintech teams turn complex financial ideas into credible Mandarin content that performs across markets.",
      leadWithEdge: "Finance expertise + Mandarin market communication + sales messaging",
      serviceTitle: "Mandarin Fintech Content & Localization Specialist",
      targetClient: "Fintech and financial-services teams entering Chinese-speaking markets",
      outreachAngle: "Hi — I help fintech teams turn complex financial ideas into credible Mandarin content. I noticed your team is growing across markets; would a small paid localization sprint for one priority asset be useful?",
      estimatedEarningRange: "$120,000–$250,000/year gross revenue",
      estimatedEarningBasis: "An optimistic EU/US scenario combining recurring fintech retainers with premium bilingual campaign work; revenue before expenses and taxes, not guaranteed take-home income.",
      estimatedEarningSourceUrl: "https://en.wikipedia.org/wiki/Influencer_marketing",
      estimatedEarningMarket: "EU/US",
    },
    searchStatus: "complete",
  };
}
