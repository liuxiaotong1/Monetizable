import { translateMetadata } from "@/lib/localized-text";
import { getRequestLocale } from "@/lib/request-locale";

import { Localized } from "@/components/localized";
import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { MAIN_SITE_URL } from "@/lib/blog";

const metadata: Metadata = {
  title: "Skill and Market-Demand Methodology",
  description: "How Monetizable extracts evidence, builds skill combinations, searches public demand, ranks opportunities, and communicates limitations.",
  alternates: { canonical: `${MAIN_SITE_URL}/methodology` },
};

export default async function MethodologyPage() {
  const contentLocale = await getRequestLocale();
  const methodologyJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Monetizable Skill and Market-Demand Methodology",
    url: `${MAIN_SITE_URL}/methodology`,
    about: ["skill analysis", "skills-first careers", "market demand validation"],
    reviewedBy: { "@type": "Organization", name: "Monetizable", url: MAIN_SITE_URL },
  };
  return <Localized><><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(translateMetadata(methodologyJsonLd, contentLocale)).replace(/</g, "\\u003c") }} /><InfoPage eyebrow="Methodology" title="How Monetizable turns experience into testable market hypotheses." description="The system separates profile evidence, AI-assisted interpretation, and public-market validation so users can see what is observed, what is inferred, and what remains uncertain.">
    <h2>1. Evidence intake</h2>
    <p>The analysis starts with a user-provided CV, pasted experience, or publicly accessible professional information. With the required consent, the original CV is retained privately for future opportunity matching. The system normalizes roles, projects, education, languages, certifications, tools, and other demonstrated capabilities while removing duplicate evidence.</p>
    <h2>2. Skill graph and combinations</h2>
    <p>An AI model converts the normalized evidence into a structured skill graph. Suggested combinations must be supported by the supplied evidence. The first recommendations prioritize credible combinations the person has not already packaged or sold together, rather than merely renaming an existing role.</p>
    <h2>3. Public demand search</h2>
    <p>Each candidate combination produces several market queries. Depending on production configuration, Monetizable searches a mix of public web results and job-market APIs. Results may include remote, freelance, contract, consulting, and project opportunities. No provider offers complete market coverage.</p>
    <p>For SuperCharlie subscribers, overlapping search themes are combined into one shared daily market scan. Ordinary code validates URLs, removes duplicates, checks freshness and geography, and narrows the candidate set before a lightweight model is used. Deeper model analysis is limited to the strongest candidates.</p>
    <p>SuperCharlie considers employment, freelance or contract work, consulting, fractional roles, productized services, and latent buyer demand. Independent or latent-demand paths require traceable public evidence; the system does not invent buyers or claim that a market signal guarantees work.</p>
    <h2>4. Validation and ranking</h2>
    <p>Server-side checks reject unsafe or duplicate URLs, obvious expired listings, incompatible geography, and authorization mismatches. Remaining results are ranked using overlap with the demonstrated skills, location compatibility, freshness signals, compensation evidence, and likely speed to monetize.</p>
    <h2>5. Demand and pricing interpretation</h2>
    <p>Low, Medium, and High demand labels are relative signals derived from the validated sample, not a census of all demand. Pricing is displayed only when public listings expose usable compensation evidence. Any broader earning range is scenario modelling, not take-home income or a promise.</p>
    <h2>6. Human judgment and limitations</h2>
    <p>AI can misinterpret ambiguous experience, public pages can be incomplete, and market listings change quickly. Users should verify important recommendations, licensing requirements, rates, and buyer fit independently. The product is not a substitute for legal, financial, tax, immigration, or regulated-career advice.</p>
    <h2>Privacy and retention</h2>
    <p>Original CV files and structured Capacity Graphs are stored privately only after affirmative consent and can be deleted from the product. Extracted CV text is not stored as a separate record. Generated analysis pages expire after 24 hours by default. Subscription cancellation and candidate-data deletion are separate actions. See the privacy page for the current operational summary.</p>
  </InfoPage></></Localized>;
}

export async function generateMetadata(): Promise<Metadata> {
  return translateMetadata(metadata, await getRequestLocale());
}
