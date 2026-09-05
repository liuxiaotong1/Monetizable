export type DemoCombinationInsight = {
  career: string;
  market: string;
  earning: string;
  roleModel: string;
  roleModelSummary: string;
};

type CareerRule = DemoCombinationInsight & {
  required: string[][];
  signals: string[];
  minimumHits?: Array<{ terms: string[]; count: number }>;
  priority?: number;
};

const LANGUAGES = ["mandarin", "french", "spanish"];

function careerRule(
  career: string,
  required: string[][],
  signals: string[],
  market: string,
  earning: string,
  roleModel: string,
  roleModelSummary: string,
  options: Pick<CareerRule, "minimumHits" | "priority"> = {},
): CareerRule {
  return {
    career,
    required,
    signals: [...new Set(signals)],
    market,
    earning,
    roleModel,
    roleModelSummary,
    ...options,
  };
}

const rules: CareerRule[] = [
  careerRule(
    "Product Marketing Manager",
    [["product knowledge"], ["brand strategy", "marketing", "content strategy", "audience strategy", "market research"]],
    ["product knowledge", "brand strategy", "marketing", "content strategy", "audience strategy", "market research", "financial analysis", "data analysis", "sales", "storytelling", "copywriting", "communication", "saas", "fintech"],
    "Technology and consumer companies need product expertise translated into positioning, launches and commercially sound market choices.",
    "Illustrative upper-market benchmark: €600–€1,250/day or €80k–€135k in-house.",
    "Product marketing lead",
    "The benchmark profile connects product truth, customer relevance, positioning and commercial evidence across the product lifecycle.",
    { priority: 96 },
  ),
  careerRule(
    "Product Strategy Manager",
    [["product knowledge"], ["user research", "market research", "data analysis", "financial analysis", "audience strategy"]],
    ["product knowledge", "user research", "market research", "data analysis", "financial analysis", "audience strategy", "brand strategy", "marketing", "stakeholder management", "project management", "saas", "fintech"],
    "Product organizations need customer, market and commercial evidence combined into roadmap and investment choices.",
    "Illustrative upper-market benchmark: €650–€1,300/day or €85k–€140k in-house.",
    "Product strategy lead",
    "The benchmark profile turns product knowledge and evidence into a focused roadmap, business case and measurable strategic bet.",
    { priority: 88 },
  ),
  careerRule(
    "Growth Product Manager",
    [["product knowledge"], ["growth hacking", "paid ads", "marketing"], ["data analysis", "audience strategy", "user research", "user onboarding"]],
    ["product knowledge", "growth hacking", "paid ads", "marketing", "data analysis", "audience strategy", "user research", "user onboarding", "customer success", "saas", "automation"],
    "Digital products need one owner to connect customer behavior, product changes and sustainable acquisition or activation growth.",
    "Illustrative upper-market benchmark: €650–€1,300/day or €85k–€140k in-house.",
    "Growth product lead",
    "The benchmark profile owns an evidence-led growth loop across acquisition, activation and product experience.",
    { priority: 94 },
  ),
  careerRule(
    "Product Operations Manager",
    [["product knowledge"], ["operations", "project management", "process optimization", "automation"]],
    ["product knowledge", "operations", "project management", "process optimization", "automation", "stakeholder management", "data analysis", "user research", "user onboarding", "customer success", "saas"],
    "Scaling product teams need operating systems that connect discovery, planning, delivery and customer feedback.",
    "Illustrative upper-market benchmark: €550–€1,150/day or €75k–€125k in-house.",
    "Product operations lead",
    "The benchmark profile improves how product decisions move from evidence through delivery, measurement and learning.",
    { priority: 86 },
  ),
  careerRule(
    "Customer Education Manager",
    [["product knowledge"], ["content strategy", "storytelling", "copywriting"], ["user onboarding", "customer success", "communication"]],
    ["product knowledge", "content strategy", "storytelling", "copywriting", "user onboarding", "customer success", "communication", "audience strategy", "saas", "project management"],
    "Complex software and service businesses need education programs that turn product knowledge into adoption and customer independence.",
    "Illustrative upper-market benchmark: €450–€950/day or €60k–€110k in-house.",
    "Customer education lead",
    "The benchmark profile builds outcome-led learning journeys tied to onboarding, adoption and retention.",
    { priority: 90 },
  ),
  careerRule(
    "Pricing Strategy Manager",
    [["financial analysis"], ["sales", "marketing", "paid ads", "market research"]],
    ["financial analysis", "sales", "marketing", "paid ads", "market research", "data analysis", "excel", "communication", "stakeholder management"],
    "SaaS, fintech and consumer businesses need pricing decisions grounded in customer demand, unit economics and commercial evidence.",
    "Illustrative upper-market benchmark: €700–€1,400/day or €90k–€145k in-house.",
    "Pricing strategy lead",
    "The benchmark profile connects willingness to pay, market evidence and financial outcomes to one defensible pricing system.",
    { minimumHits: [{ terms: ["sales", "marketing", "paid ads", "market research"], count: 2 }], priority: 100 },
  ),
  careerRule(
    "International Growth Strategist",
    [LANGUAGES, ["marketing", "growth hacking", "brand strategy", "content strategy", "localization"]],
    [...LANGUAGES, "marketing", "growth hacking", "brand strategy", "content strategy", "localization", "market research", "sales", "saas", "fintech"],
    "SaaS, education, luxury and consumer brands expanding across language markets need one owner for positioning, localization and launch learning.",
    "Illustrative upper-market benchmark: €700–€1,400/day or €80k–€130k in-house.",
    "International growth lead",
    "The benchmark profile turns language fluency into market adoption, buyer insight and measurable launch outcomes.",
    { priority: 90 },
  ),
  careerRule(
    "Bilingual Program Director",
    [LANGUAGES],
    [...LANGUAGES, "communication", "stakeholder management", "project management", "user onboarding"],
    "International schools, executive education, relocation services and multinational customer teams value programs that bridge languages and cultures.",
    "Illustrative upper-market benchmark: €350–€800/day or €55k–€90k in-house.",
    "Bilingual program director",
    "The benchmark profile builds a repeatable learning, onboarding or cultural-bridge program rather than selling translation by the hour.",
    { minimumHits: [{ terms: LANGUAGES, count: 2 }], priority: 85 },
  ),
  careerRule(
    "Multilingual Content Strategist",
    [LANGUAGES, ["storytelling", "copywriting", "content strategy", "brand strategy", "audience strategy"]],
    [...LANGUAGES, "storytelling", "copywriting", "content strategy", "brand strategy", "audience strategy", "communication", "localization", "marketing"],
    "Global content, SaaS, media and consumer teams need narratives that retain meaning and commercial relevance across markets.",
    "Illustrative upper-market benchmark: €550–€1,100/day or €70k–€115k in-house.",
    "Global content strategy lead",
    "The benchmark profile owns the narrative system, local audience insight and in-market performance—not word-for-word translation.",
    { priority: 88 },
  ),
  careerRule(
    "International Business Development Manager",
    [LANGUAGES, ["sales", "negotiation", "persuasion"]],
    [...LANGUAGES, "sales", "negotiation", "persuasion", "communication", "saas", "fintech", "crm", "market research", "stakeholder management"],
    "Export-led businesses and international B2B teams need commercial operators who can build trust and open partnerships across language markets.",
    "Illustrative upper-market benchmark: €550–€1,200/day or €75k–€130k in-house.",
    "International business development lead",
    "The benchmark profile combines market fluency with disciplined pipeline, partnership development and commercial negotiation.",
    { priority: 87 },
  ),
  careerRule(
    "International Market Entry Strategist",
    [LANGUAGES, ["market research", "marketing", "localization"]],
    [...LANGUAGES, "market research", "marketing", "localization", "brand strategy", "stakeholder management", "financial analysis", "saas", "fintech"],
    "Technology, fintech and consumer companies entering a new geography need research, local judgment and a credible route to customers.",
    "Illustrative upper-market benchmark: €650–€1,300/day or €80k–€130k in-house.",
    "Market entry lead",
    "The benchmark profile translates local evidence into positioning, partnerships and a measurable launch plan.",
    { priority: 86 },
  ),
  careerRule(
    "Localization Strategist",
    [["localization"], [...LANGUAGES, "marketing", "content strategy", "brand strategy", "copywriting"]],
    ["localization", ...LANGUAGES, "marketing", "content strategy", "brand strategy", "copywriting", "audience strategy", "market research"],
    "Software, media and consumer brands need product and message adaptation that works culturally as well as linguistically.",
    "Illustrative upper-market benchmark: €450–€950/day or €60k–€105k in-house.",
    "Localization strategy lead",
    "The benchmark profile owns terminology, cultural adaptation and in-market quality rather than isolated translation tasks.",
    { priority: 80 },
  ),
  careerRule(
    "Go-to-Market Strategist",
    [["sales"], ["marketing", "growth hacking", "saas", "brand strategy", "market research"]],
    ["sales", "marketing", "growth hacking", "saas", "brand strategy", "market research", "negotiation", "communication", "crm", "audience strategy"],
    "Seed to Series B software companies need senior commercial execution before they can justify a full executive hire.",
    "Illustrative upper-market benchmark: €900–€1,800/day or €110k–€180k in-house.",
    "Go-to-market lead",
    "The high-value profile owns one revenue system across positioning, pipeline and customer learning.",
    { priority: 78 },
  ),
  careerRule(
    "Revenue Operations Manager",
    [["sales", "crm"], ["crm", "automation", "customer success", "data analysis", "operations"]],
    ["sales", "crm", "automation", "customer success", "data analysis", "operations", "process optimization", "excel", "sql", "project management"],
    "B2B companies need connected forecasting, lifecycle systems and clear handoffs across marketing, sales and customer success.",
    "Illustrative upper-market benchmark: €750–€1,400/day or €90k–€145k in-house.",
    "Revenue operations lead",
    "The benchmark profile converts fragmented commercial data and processes into a predictable revenue system.",
    { priority: 82 },
  ),
  careerRule(
    "Sales Operations Analyst",
    [["sales"], ["crm", "data analysis", "excel", "sql"]],
    ["sales", "crm", "data analysis", "excel", "sql", "automation", "operations", "process optimization", "communication"],
    "B2B sales organizations need pipeline reporting, territory insight and process discipline to improve forecast quality.",
    "Illustrative upper-market benchmark: €450–€950/day or €60k–€105k in-house.",
    "Sales operations lead",
    "The benchmark profile turns CRM and pipeline data into practical actions for sellers and managers.",
    { priority: 77 },
  ),
  careerRule(
    "Performance Marketing Strategist",
    [["paid ads"], ["content strategy", "marketing", "growth hacking", "data analysis"]],
    ["paid ads", "content strategy", "marketing", "growth hacking", "data analysis", "audience strategy", "copywriting", "brand strategy", "excel", "sql"],
    "Digital-first brands and growth teams need acquisition programs that connect creative testing, media spend and customer economics.",
    "Illustrative upper-market benchmark: €600–€1,250/day or €75k–€125k in-house.",
    "Performance marketing lead",
    "The benchmark profile owns learning velocity and profitable acquisition, not isolated campaign execution.",
    { priority: 82 },
  ),
  careerRule(
    "Marketing Analytics Manager",
    [["data analysis"], ["marketing", "paid ads", "growth hacking", "audience strategy"]],
    ["data analysis", "marketing", "paid ads", "growth hacking", "audience strategy", "market research", "excel", "sql", "brand strategy", "communication"],
    "Growth and brand teams need channel, audience and campaign evidence translated into better allocation decisions.",
    "Illustrative upper-market benchmark: €550–€1,150/day or €70k–€120k in-house.",
    "Marketing analytics lead",
    "The benchmark profile connects measurement design to budget choices, experimentation and commercial outcomes.",
    { priority: 79 },
  ),
  careerRule(
    "Brand Narrative Strategist",
    [["storytelling", "copywriting"], ["brand strategy", "content strategy", "audience strategy"]],
    ["storytelling", "copywriting", "brand strategy", "content strategy", "audience strategy", "communication", "marketing", "market research"],
    "Founders, consultancies and category-building brands need a coherent narrative that translates expertise into market authority.",
    "Illustrative upper-market benchmark: €550–€1,200/day or €70k–€120k in-house.",
    "Brand narrative lead",
    "The benchmark profile turns audience insight and strategic story craft into a repeatable messaging system.",
    { priority: 78 },
  ),
  careerRule(
    "Marketing Communications Manager",
    [["communication"], ["marketing", "brand strategy", "content strategy", "storytelling", "copywriting"]],
    ["communication", "marketing", "brand strategy", "content strategy", "storytelling", "copywriting", "audience strategy", "stakeholder management", "market research"],
    "Brands and expert-led businesses need one owner to align messaging, campaigns and stakeholder communication.",
    "Illustrative upper-market benchmark: €500–€1,050/day or €65k–€115k in-house.",
    "Marketing communications lead",
    "The benchmark profile turns strategy into a consistent message system across audiences and channels.",
    { priority: 70 },
  ),
  careerRule(
    "Consumer Insights Manager",
    [["audience strategy", "user research", "market research"], ["data analysis", "marketing", "financial analysis"]],
    ["audience strategy", "user research", "market research", "data analysis", "marketing", "financial analysis", "communication", "storytelling", "excel", "sql"],
    "Consumer brands, media, product and financial-services teams need evidence about who will buy, why and at what value.",
    "Illustrative upper-market benchmark: €550–€1,100/day or €70k–€120k in-house.",
    "Consumer insights lead",
    "The benchmark profile converts behavioral and commercial evidence into positioning, product and investment decisions.",
    { priority: 76 },
  ),
  careerRule(
    "Finance Business Partner",
    [["financial analysis"], ["communication", "stakeholder management", "persuasion", "negotiation"]],
    ["financial analysis", "communication", "stakeholder management", "persuasion", "negotiation", "operations", "data analysis", "excel", "project management"],
    "Operating teams and scale-ups need financial insight explained clearly enough to shape budgets, priorities and commercial decisions.",
    "Illustrative upper-market benchmark: €600–€1,200/day or €75k–€130k in-house.",
    "Senior finance business partner",
    "The benchmark profile turns analysis into options, challenges assumptions and helps non-finance leaders act with confidence.",
    { priority: 84 },
  ),
  careerRule(
    "FP&A Analyst",
    [["financial analysis"], ["data analysis", "excel", "sql", "operations"]],
    ["financial analysis", "data analysis", "excel", "sql", "operations", "project management", "process optimization", "stakeholder management", "communication"],
    "Scale-ups and operating teams need reliable forecasts, variance analysis and resource planning tied to business drivers.",
    "Illustrative upper-market benchmark: €550–€1,100/day or €70k–€120k in-house.",
    "FP&A lead",
    "The benchmark profile connects operating data to planning, forecasts and accountable resource decisions.",
    { priority: 82 },
  ),
  careerRule(
    "Financial Communications Strategist",
    [["financial analysis"], ["content strategy", "storytelling", "brand strategy", "copywriting"]],
    ["financial analysis", "content strategy", "storytelling", "brand strategy", "copywriting", "communication", "audience strategy", "fintech"],
    "Fintech, investment and advisory firms need complex market and financial ideas made credible, useful and audience-ready.",
    "Illustrative upper-market benchmark: €600–€1,200/day or €75k–€125k in-house.",
    "Financial communications lead",
    "The benchmark profile combines analytical accuracy with a narrative that earns trust and supports decisions.",
    { priority: 83 },
  ),
  careerRule(
    "Investment Research Analyst",
    [["financial analysis"], ["market research", "fintech"]],
    ["financial analysis", "market research", "fintech", "data analysis", "excel", "sql", "communication", "storytelling"],
    "Investment, fintech and advisory teams need financial evidence combined with market context to evaluate opportunities and risks.",
    "Illustrative upper-market benchmark: €550–€1,150/day or €70k–€125k in-house.",
    "Investment research lead",
    "The benchmark profile builds a defensible view from financial performance, market structure and forward-looking evidence.",
    { priority: 85 },
  ),
  careerRule(
    "Commercial Finance Manager",
    [["financial analysis"], ["sales", "marketing", "negotiation"]],
    ["financial analysis", "sales", "marketing", "negotiation", "communication", "stakeholder management", "data analysis", "excel", "market research"],
    "Commercial teams need finance partners who can evaluate deals, margins and growth choices without losing sight of customer reality.",
    "Illustrative upper-market benchmark: €650–€1,300/day or €85k–€140k in-house.",
    "Commercial finance lead",
    "The benchmark profile connects revenue decisions, deal economics and financial discipline.",
    { priority: 80 },
  ),
  careerRule(
    "AI Transformation Consultant",
    [["ai"], ["data analysis", "financial analysis", "market research", "operations"]],
    ["ai", "data analysis", "financial analysis", "market research", "operations", "automation", "process optimization", "project management", "stakeholder management", "saas"],
    "Professional services, finance, operations and research teams pay for faster decisions and defensible workflow automation.",
    "Illustrative upper-market benchmark: €800–€1,600/day or €95k–€160k in-house.",
    "AI transformation lead",
    "The benchmark profile connects analysis to an implemented workflow, adoption metric and business decision.",
    { priority: 82 },
  ),
  careerRule(
    "AI Automation Consultant",
    [["ai"], ["automation", "process optimization", "crm"]],
    ["ai", "automation", "process optimization", "crm", "operations", "project management", "stakeholder management", "data analysis", "saas"],
    "Growing teams need practical AI workflows that remove manual work without creating fragile, unowned systems.",
    "Illustrative upper-market benchmark: €700–€1,450/day or €85k–€145k in-house.",
    "AI automation lead",
    "The benchmark profile maps the workflow, implements the automation and proves adoption and time saved.",
    { priority: 85 },
  ),
  careerRule(
    "Customer Experience Strategist",
    [["user research", "user onboarding", "customer success", "product knowledge"]],
    ["user research", "user onboarding", "customer success", "product knowledge", "audience strategy", "data analysis", "communication", "stakeholder management", "saas"],
    "SaaS and service companies need customer insight turned into smoother onboarding, stronger adoption and lower churn.",
    "Illustrative upper-market benchmark: €600–€1,200/day or €75k–€125k in-house.",
    "Customer experience lead",
    "The benchmark profile owns the journey from customer evidence to product and service improvements.",
    { minimumHits: [{ terms: ["user research", "user onboarding", "customer success", "product knowledge"], count: 2 }], priority: 78 },
  ),
  careerRule(
    "Product Insights Analyst",
    [["user research"], ["data analysis", "audience strategy", "product knowledge", "user onboarding"]],
    ["user research", "data analysis", "audience strategy", "product knowledge", "user onboarding", "market research", "sql", "excel", "communication"],
    "Product teams need qualitative and behavioral evidence combined into clear product and adoption decisions.",
    "Illustrative upper-market benchmark: €500–€1,050/day or €65k–€115k in-house.",
    "Product insights lead",
    "The benchmark profile connects user evidence to priorities, experiments and measurable product outcomes.",
    { priority: 76 },
  ),
  careerRule(
    "Customer Success Manager",
    [["customer success"], ["product knowledge", "user onboarding", "communication", "saas"]],
    ["customer success", "product knowledge", "user onboarding", "communication", "saas", "crm", "data analysis", "stakeholder management", "project management"],
    "Subscription businesses need customer leaders who can turn product knowledge into adoption, retention and expansion.",
    "Illustrative upper-market benchmark: €450–€950/day or €60k–€110k in-house.",
    "Customer success lead",
    "The benchmark profile combines structured onboarding, product fluency and account evidence to improve customer outcomes.",
    { priority: 74 },
  ),
  careerRule(
    "Solutions Consultant",
    [["product knowledge"], ["sales", "communication", "saas"]],
    ["product knowledge", "sales", "communication", "saas", "persuasion", "stakeholder management", "customer success", "user onboarding", "fintech"],
    "Complex B2B products need customer-facing experts who can translate capabilities into credible use cases and buying confidence.",
    "Illustrative upper-market benchmark: €500–€1,100/day or €70k–€125k in-house.",
    "Solutions consulting lead",
    "The benchmark profile connects product depth, discovery and commercial communication without becoming a generic salesperson.",
    { priority: 75 },
  ),
  careerRule(
    "Transformation Program Manager",
    [["project management", "process optimization", "stakeholder management", "operations"]],
    ["project management", "process optimization", "stakeholder management", "operations", "automation", "communication", "data analysis", "ai"],
    "Growing and changing organizations need cross-functional delivery that makes new operating models stick.",
    "Illustrative upper-market benchmark: €650–€1,300/day or €80k–€135k in-house.",
    "Transformation program lead",
    "The benchmark profile aligns stakeholders, redesigns the operating rhythm and delivers measurable adoption.",
    { minimumHits: [{ terms: ["project management", "process optimization", "stakeholder management", "operations"], count: 2 }], priority: 78 },
  ),
  careerRule(
    "Operations Analyst",
    [["operations"], ["data analysis", "excel", "sql"]],
    ["operations", "data analysis", "excel", "sql", "process optimization", "automation", "project management", "communication"],
    "Operations teams need reliable analysis of capacity, cost and workflow performance before redesigning how work gets done.",
    "Illustrative upper-market benchmark: €450–€950/day or €60k–€105k in-house.",
    "Operations analytics lead",
    "The benchmark profile turns operating data into bottleneck diagnosis and practical improvement priorities.",
    { priority: 76 },
  ),
  careerRule(
    "Program Manager",
    [["project management"], ["communication", "stakeholder management", "operations"]],
    ["project management", "communication", "stakeholder management", "operations", "process optimization", "user onboarding", "customer success"],
    "Cross-functional teams need clear ownership of dependencies, stakeholders and delivery outcomes.",
    "Illustrative upper-market benchmark: €500–€1,100/day or €70k–€120k in-house.",
    "Senior program manager",
    "The benchmark profile coordinates decisions and outcomes across teams rather than merely tracking tasks.",
    { priority: 72 },
  ),
  careerRule(
    "Content Strategy Lead",
    [["brand strategy", "content strategy", "audience strategy", "storytelling", "copywriting"]],
    ["brand strategy", "content strategy", "audience strategy", "storytelling", "copywriting", "marketing", "communication", "market research"],
    "B2B, media and expert-led businesses need a coherent editorial system that builds demand and authority.",
    "Illustrative upper-market benchmark: €500–€1,100/day or €70k–€120k in-house.",
    "Content strategy lead",
    "The benchmark profile connects audience insight, editorial choices and measurable commercial outcomes.",
    { minimumHits: [{ terms: ["brand strategy", "content strategy", "audience strategy", "storytelling", "copywriting"], count: 2 }], priority: 74 },
  ),
  careerRule(
    "Market Intelligence Analyst",
    [["market research"], ["data analysis", "sql", "excel"]],
    ["market research", "data analysis", "sql", "excel", "audience strategy", "communication", "financial analysis", "marketing"],
    "Consulting, finance, technology and consumer teams need market evidence translated into decisions about demand, competition and investment.",
    "Illustrative upper-market benchmark: €500–€1,050/day or €65k–€110k in-house.",
    "Market intelligence lead",
    "The benchmark profile synthesizes multiple evidence sources into a clear commercial recommendation.",
    { priority: 80 },
  ),
  careerRule(
    "Market Research Consultant",
    [["market research"], ["communication", "stakeholder management", "persuasion"]],
    ["market research", "communication", "stakeholder management", "persuasion", "audience strategy", "storytelling", "marketing"],
    "Consultancies and strategy teams need research findings framed clearly enough to guide a client or leadership decision.",
    "Illustrative upper-market benchmark: €450–€1,000/day or €65k–€110k in-house.",
    "Market research consulting lead",
    "The benchmark profile combines rigorous evidence with stakeholder-ready recommendations.",
    { priority: 73 },
  ),
  careerRule(
    "Business Intelligence Analyst",
    [["data analysis"], ["sql", "excel", "communication"]],
    ["data analysis", "sql", "excel", "communication", "financial analysis", "market research", "operations", "stakeholder management", "saas"],
    "Operating and commercial teams need trustworthy reporting and analysis translated into decisions for managers and stakeholders.",
    "Illustrative upper-market benchmark: €500–€1,050/day or €65k–€115k in-house.",
    "Business intelligence lead",
    "The benchmark profile combines reliable data models, clear reporting and decision-focused interpretation.",
    { priority: 70 },
  ),
  careerRule(
    "Growth Strategy Consultant",
    [["marketing", "growth hacking", "paid ads", "brand strategy"]],
    ["marketing", "growth hacking", "paid ads", "brand strategy", "data analysis", "market research", "sales", "saas", "audience strategy", "content strategy"],
    "Growth-stage companies need a focused acquisition and positioning system tied to business economics.",
    "Illustrative upper-market benchmark: €600–€1,250/day or €75k–€130k in-house.",
    "Growth strategy lead",
    "The benchmark profile designs the growth thesis, validates channels and builds a repeatable learning loop.",
    { minimumHits: [{ terms: ["marketing", "growth hacking", "paid ads", "brand strategy"], count: 2 }], priority: 72 },
  ),
  careerRule(
    "Business Development Manager",
    [["sales", "negotiation", "persuasion", "communication"]],
    ["sales", "negotiation", "persuasion", "communication", "market research", "crm", "saas", "fintech", "stakeholder management"],
    "B2B companies and professional-services firms need new partnerships and commercial conversations converted into qualified revenue.",
    "Illustrative upper-market benchmark: €550–€1,150/day or €70k–€125k in-house.",
    "Business development lead",
    "The benchmark profile turns relationship skills into a disciplined market and partnership strategy.",
    { minimumHits: [{ terms: ["sales", "negotiation", "persuasion", "communication"], count: 2 }], priority: 70 },
  ),
  careerRule(
    "Operations Transformation Consultant",
    [["operations", "automation", "process optimization", "project management"]],
    ["operations", "automation", "process optimization", "project management", "stakeholder management", "ai", "data analysis", "communication"],
    "Scaling teams need workflows redesigned for speed, accountability and automation.",
    "Illustrative upper-market benchmark: €650–€1,300/day or €80k–€135k in-house.",
    "Operations transformation lead",
    "The benchmark profile connects process diagnosis to implementation and measurable operating improvement.",
    { minimumHits: [{ terms: ["operations", "automation", "process optimization", "project management"], count: 2 }], priority: 73 },
  ),
  careerRule(
    "Marketing Operations Manager",
    [["crm", "automation"], ["marketing", "data analysis", "operations", "process optimization"]],
    ["crm", "automation", "marketing", "data analysis", "operations", "process optimization", "excel", "sql", "project management"],
    "Marketing teams need clean lifecycle systems, automation and reporting that make campaigns and handoffs measurable.",
    "Illustrative upper-market benchmark: €550–€1,150/day or €70k–€125k in-house.",
    "Marketing operations lead",
    "The benchmark profile owns the operating system behind demand generation rather than one campaign channel.",
    { priority: 75 },
  ),
];

const fallbackCareerTitles = [
  "International Finance Operations Manager",
  "International Finance Consultant",
  "International Operations Manager",
  "International Reporting Analyst",
  "International Product Strategist",
  "International Market Development Manager",
  "Cross-Cultural Research Consultant",
  "Multilingual Content Strategist",
  "Localization Strategy Consultant",
  "Finance Transformation Consultant",
  "AI Product Manager",
  "Analytics Automation Consultant",
  "Marketing Automation Strategist",
  "Automation Program Manager",
  "AI Content Operations Manager",
  "Financial Data Analyst",
  "Finance Operations Manager",
  "Financial Communications Strategist",
  "Product Insights Manager",
  "Solutions Consultant",
  "Growth Insights Manager",
  "Insights Communication Consultant",
  "Business Intelligence Consultant",
  "Revenue Operations Manager",
  "Sales Operations Manager",
  "Content Operations Manager",
  "Product Content Strategist",
  "Digital Operations Manager",
  "Business Systems Analyst",
  "Fintech Product Strategist",
  "SaaS Growth Strategist",
  "Commercial Growth Consultant",
  "Content Strategy Consultant",
  "Research and Insights Consultant",
  "Operations Strategy Consultant",
  "Business Transformation Consultant",
] as const;

export const DEMO_CAREER_TITLES = [
  ...new Set([...rules.map((rule) => rule.career), ...fallbackCareerTitles]),
];

const financeSignals = ["financial analysis", "fintech"];
const researchSignals = ["data analysis", "market research", "user research", "audience strategy", "excel", "sql"];
const productSignals = ["product knowledge", "customer success", "user onboarding", "saas"];
const commercialSignals = ["sales", "marketing", "growth hacking", "brand strategy", "paid ads", "crm", "negotiation", "persuasion"];
const contentSignals = ["storytelling", "copywriting", "content strategy", "communication"];
const deliverySignals = ["operations", "project management", "process optimization", "stakeholder management"];
const automationSignals = ["ai", "automation"];
const languageSignals = [...LANGUAGES, "localization"];

function fallbackInsight(career: (typeof fallbackCareerTitles)[number], market: string): DemoCombinationInsight {
  return {
    career,
    market,
    earning: "Illustrative upper-market benchmark: €450–€1,050/day or €65k–€120k in-house, depending on proof and market.",
    roleModel: career,
    roleModelSummary: "The benchmark profile turns complementary capabilities into one clear commercial outcome, with evidence, ownership and measurable value.",
  };
}

function semanticFallback(selected: string[]): DemoCombinationInsight {
  const selectedSet = new Set(selected);
  const hasAny = (terms: string[]) => terms.some((term) => selectedSet.has(term));
  const hasLanguage = hasAny(languageSignals);
  const hasFinance = hasAny(financeSignals);
  const hasResearch = hasAny(researchSignals);
  const hasProduct = hasAny(productSignals);
  const hasCommercial = hasAny(commercialSignals);
  const hasContent = hasAny(contentSignals);
  const hasDelivery = hasAny(deliverySignals);
  const hasAutomation = hasAny(automationSignals);
  const market = (specific: string) => `${specific} Buyers value this combination when it is tied to a defined outcome and supported by credible evidence.`;

  if (hasLanguage && hasFinance && hasDelivery) return fallbackInsight("International Finance Operations Manager", market("Multinational finance teams need cross-border reporting, controls and operating coordination."));
  if (hasLanguage && hasFinance) return fallbackInsight("International Finance Consultant", market("Cross-border businesses need financial analysis interpreted for local stakeholders and markets."));
  if (hasLanguage && hasDelivery) return fallbackInsight("International Operations Manager", market("International teams need multilingual coordination across delivery, processes and stakeholders."));
  if (hasLanguage && hasResearch) return fallbackInsight("International Reporting Analyst", market("International teams need evidence gathered, interpreted and communicated across language markets."));
  if (hasLanguage && hasProduct) return fallbackInsight("International Product Strategist", market("Product companies entering new markets need local context connected to product and customer decisions."));
  if (hasLanguage && hasCommercial) return fallbackInsight("International Market Development Manager", market("Companies expanding across borders need language fluency converted into partnerships, positioning and demand."));
  if (hasLanguage && hasContent) return fallbackInsight("Multilingual Content Strategist", market("Global brands need culturally fluent narratives adapted for distinct audiences rather than literal translation."));
  if (hasLanguage) return fallbackInsight("Localization Strategy Consultant", market("Organizations operating across languages need cultural and linguistic judgment built into delivery."));

  if (hasAutomation && hasFinance) return fallbackInsight("Finance Transformation Consultant", market("Finance teams need automation and AI applied to reporting, planning and decision workflows."));
  if (hasAutomation && hasProduct) return fallbackInsight("AI Product Manager", market("Technology teams need AI capabilities shaped into useful, feasible and adoptable product experiences."));
  if (hasAutomation && hasResearch) return fallbackInsight("Analytics Automation Consultant", market("Data-rich teams need repeatable automation that turns evidence into timely operating decisions."));
  if (hasAutomation && hasCommercial) return fallbackInsight("Marketing Automation Strategist", market("Revenue teams need connected automation across acquisition, qualification and lifecycle engagement."));
  if (hasAutomation && hasDelivery) return fallbackInsight("Automation Program Manager", market("Scaling organizations need automation initiatives coordinated from workflow diagnosis through adoption."));
  if (hasAutomation && hasContent) return fallbackInsight("AI Content Operations Manager", market("Content teams need responsible AI workflows that improve production without weakening editorial quality."));
  if (hasAutomation) return fallbackInsight("Digital Operations Manager", market("Modern teams need practical automation translated into reliable day-to-day operating systems."));

  if (hasFinance && hasResearch) return fallbackInsight("Financial Data Analyst", market("Finance and strategy teams need rigorous analysis converted into forecasts, scenarios and investment decisions."));
  if (hasFinance && hasDelivery) return fallbackInsight("Finance Operations Manager", market("Growing organizations need financial discipline connected to processes, controls and execution."));
  if (hasFinance && hasContent) return fallbackInsight("Financial Communications Strategist", market("Financial and fintech organizations need complex evidence translated into clear stakeholder narratives."));
  if (hasFinance && hasProduct) return fallbackInsight("Fintech Product Strategist", market("Financial-product teams need commercial analysis connected to product value, risk and customer adoption."));
  if (hasFinance) return fallbackInsight("Finance Transformation Consultant", market("Leadership teams need financial evidence translated into commercially sound change and investment choices."));

  if (hasProduct && hasResearch) return fallbackInsight("Product Insights Manager", market("Product teams need customer and market evidence connected directly to product priorities and learning."));
  if (hasProduct && hasCommercial) return fallbackInsight("Solutions Consultant", market("B2B product companies need product depth translated into buyer value and credible solution design."));
  if (hasProduct && hasContent) return fallbackInsight("Product Content Strategist", market("Product-led businesses need useful product knowledge turned into adoption, education and demand."));
  if (hasProduct && hasDelivery) return fallbackInsight("Digital Operations Manager", market("Product organizations need customer knowledge connected to reliable delivery and operating systems."));
  if (hasProduct) return fallbackInsight(selectedSet.has("fintech") ? "Fintech Product Strategist" : "SaaS Growth Strategist", market("Digital businesses need product context connected to a focused commercial outcome."));

  if (hasResearch && hasCommercial) return fallbackInsight("Growth Insights Manager", market("Commercial teams need market and customer evidence translated into sharper growth decisions."));
  if (hasResearch && hasContent) return fallbackInsight("Insights Communication Consultant", market("Research-led organizations need complex findings converted into clear, decision-ready narratives."));
  if (hasResearch && hasDelivery) return fallbackInsight("Business Intelligence Consultant", market("Operating teams need evidence connected to processes, priorities and measurable performance."));
  if (hasResearch) return fallbackInsight("Research and Insights Consultant", market("Strategy teams need multiple evidence sources synthesized into clear recommendations."));

  if (hasCommercial && hasDelivery) return fallbackInsight("Revenue Operations Manager", market("Growth companies need commercial execution connected to repeatable systems and accountable handoffs."));
  if (hasCommercial && hasContent) return fallbackInsight("Commercial Growth Consultant", market("Brands and service businesses need persuasive communication connected to demand and revenue outcomes."));
  if (hasCommercial) return fallbackInsight(selectedSet.has("crm") ? "Sales Operations Manager" : "Commercial Growth Consultant", market("Growth-stage companies need commercial capabilities packaged around pipeline, conversion and revenue."));

  if (hasContent && hasDelivery) return fallbackInsight("Content Operations Manager", market("Content-led organizations need editorial capability connected to repeatable planning and delivery."));
  if (hasContent) return fallbackInsight("Content Strategy Consultant", market("Organizations need clear narratives connected to audience needs and measurable communication outcomes."));
  if (hasDelivery) return fallbackInsight("Operations Strategy Consultant", market("Scaling teams need cross-functional capabilities turned into reliable systems and measurable execution."));
  return fallbackInsight("Business Transformation Consultant", market("Organizations need complementary capabilities assembled into a focused transformation outcome."));
}

export function demoCombinationInsight(labels: string[]): DemoCombinationInsight | null {
  const selected = [...new Set(labels.map((label) => label.trim().toLocaleLowerCase()).filter(Boolean))];
  if (selected.length < 2 || selected.length > 3) return null;
  const selectedSet = new Set(selected);

  const candidates = rules.flatMap((rule) => {
    const coversSelection = selected.every((label) => rule.signals.includes(label));
    const meetsRequiredGroups = rule.required.every((group) => group.some((term) => selectedSet.has(term)));
    const meetsMinimumHits = (rule.minimumHits ?? []).every(({ terms, count }) => terms.filter((term) => selectedSet.has(term)).length >= count);
    if (!coversSelection || !meetsRequiredGroups || !meetsMinimumHits) return [];
    const specificity = 100 - rule.signals.length;
    const score = (rule.priority ?? 0) * 1_000 + rule.required.length * 100 + specificity;
    return [{ rule, score }];
  });

  candidates.sort((left, right) => right.score - left.score || left.rule.career.localeCompare(right.rule.career));
  const winner = candidates[0]?.rule;
  if (!winner) return semanticFallback(selected);
  const { required: _required, signals: _signals, minimumHits: _minimumHits, priority: _priority, ...insight } = winner;
  return insight;
}
