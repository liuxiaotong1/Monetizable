import { translateMetadata } from "@/lib/localized-text";
import { getRequestLocale } from "@/lib/request-locale";

import { Localized } from "@/components/localized";
import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { MAIN_SITE_URL } from "@/lib/blog";
import { config, formatAgentPrice } from "@/lib/config";
import { PAYWALL_ENABLED } from "@/lib/access-policy";

const canonical = `${MAIN_SITE_URL}/product`;

const metadata: Metadata = {
  title: "Monetizable AI Skill Stack Analyzer — Product Facts",
  description: "Verified product facts about the Monetizable AI skill stack analyzer: intended users, inputs, outputs, market evidence, current access, pricing, privacy, and limitations.",
  alternates: { canonical },
  openGraph: {
    type: "website",
    url: canonical,
    title: "Monetizable AI Skill Stack Analyzer",
    description: "Evidence-led skill combinations, current public demand signals, and testable career or independent-work hypotheses.",
  },
};

export default async function ProductPage() {
  const contentLocale = await getRequestLocale();
  const monthlyPrice = formatAgentPrice(config.agentMonthlyPriceCents);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${MAIN_SITE_URL}/#application`,
    name: "Monetizable AI Skill Stack Analyzer",
    url: MAIN_SITE_URL,
    mainEntityOfPage: canonical,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any modern web browser",
    browserRequirements: "JavaScript enabled",
    description: "Analyzes evidence from professional experience to identify skill combinations and test opportunity hypotheses against current public market signals.",
    featureList: [
      "CV and professional-experience evidence extraction",
      "Evidence-backed skill combination mapping",
      "Current public market-signal research",
      "Career, freelance, contract, consulting, and business hypotheses",
      "Ranked live opportunity matches when public results are available",
    ],
    audience: {
      "@type": "Audience",
      audienceType: "Multidisciplinary professionals, career changers, international professionals, and people exploring independent work",
    },
    provider: { "@type": "Organization", "@id": `${MAIN_SITE_URL}/#organization`, name: "Monetizable", url: MAIN_SITE_URL },
    isAccessibleForFree: true,
    offers: [
      { "@type": "Offer", name: "Personalized preview", price: "0", priceCurrency: config.currency.toUpperCase() },
      { "@type": "Offer", name: "SuperCharlie monthly access", price: (config.agentMonthlyPriceCents / 100).toFixed(2), priceCurrency: config.currency.toUpperCase(), availability: "https://schema.org/OnlineOnly", description: "Two free analyses and two direction changes. Subscription required beyond either allowance; no trial." },
    ],
  };

  return <Localized><><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(translateMetadata(productJsonLd, contentLocale)).replace(/</g, "\\u003c") }} /><InfoPage eyebrow="Product facts" title="Monetizable AI Skill Stack Analyzer" description="Monetizable is an evidence-led career-intelligence application for professionals whose useful combination of skills is not captured by one job title. This page is the stable, inspectable description of what the product currently does—and does not do.">
    <p><strong>Last product-fact review:</strong> August 15, 2026.</p>

    <h2>Short answer</h2>
    <p>Monetizable analyzes evidence from a CV, public LinkedIn profile, or pasted professional experience. It identifies combinations of demonstrated capabilities, forms career or independent-work hypotheses, and checks those hypotheses against current public market signals. It is decision support, not an employment, client, or income guarantee.</p>

    <h2>Verified product facts</h2>
    <dl>
      <dt><strong>Category</strong></dt>
      <dd>AI-assisted skill stack analysis and market-demand research.</dd>
      <dt><strong>Best suited to</strong></dt>
      <dd>Multidisciplinary professionals, career changers, international professionals, specialists with transferable experience, and people exploring freelance or consulting offers.</dd>
      <dt><strong>Inputs</strong></dt>
      <dd>PDF or DOCX CV, a publicly accessible LinkedIn member URL, or experience pasted by the user.</dd>
      <dt><strong>Free access</strong></dt>
      <dd>You can start an analysis without an account. Sign in to access your private saved report and SuperCharlie.</dd>
      <dt><strong>Subscription access</strong></dt>
      <dd>Each account includes two successful analyses, two direction changes and two application openings. The initial direction selection does not count as a change. Beyond any allowance, subscribe from {monthlyPrice} per month. Saved results remain accessible. Emails require your approval before sending.</dd>
      <dt><strong>Interface</strong></dt>
      <dd>Localized web application, usable in a modern browser.</dd>
      <dt><strong>Retention</strong></dt>
      <dd>With required consent, the original CV and structured candidate profile are stored privately for future matching. The user can delete them from the product; subscription cancellation and data deletion are separate actions.</dd>
    </dl>

    <h2>What makes the analysis different</h2>
    <p>A career assessment usually begins with interests, values, preferences, or self-ratings. A resume scanner usually begins with a selected vacancy and checks how the document communicates fit. Monetizable begins with evidence of work already performed, looks for combinations across domain knowledge and capabilities, then generates several opportunity hypotheses to investigate.</p>
    <p>The market layer uses public web results and configured job-market sources. Results can include career, freelance, contract, consulting, project, and business signals. Provider coverage is incomplete, listings can change, and a visible listing does not prove that an individual will be selected or paid.</p>

    <h2>What the result is designed to support</h2>
    <ul>
      <li>Discovering capabilities hidden by a broad or outdated job title.</li>
      <li>Comparing adjacent career directions before committing to retraining.</li>
      <li>Packaging an existing combination into a narrower freelance or consulting test.</li>
      <li>Finding missing evidence, market questions, and opportunity language for further research.</li>
    </ul>

    <h2>Important limitations</h2>
    <p>AI can misread ambiguous experience, infer a capability too strongly, or miss work that is absent from the supplied profile. Public-market sources do not cover the whole economy. Demand labels are relative to the observed sample, and revenue modelling is a scenario rather than take-home income or a promise. Users should verify material claims, licensing, geography, compensation, and buyer fit before making consequential decisions.</p>

    <h2>How to verify the product</h2>
    <p>Read the <Link href="/methodology">analysis methodology</Link>, <Link href="/privacy">privacy summary</Link>, and <Link href="/editorial-policy">editorial policy</Link>. You can also use the <Link href="/tools/skill-evidence-worksheet">free Skill Evidence Worksheet</Link> without uploading a CV.</p>
    <p><Link className="button !no-underline" href={MAIN_SITE_URL}>Try the personalized analysis</Link></p>
  </InfoPage></></Localized>;
}

export async function generateMetadata(): Promise<Metadata> {
  return translateMetadata(metadata, await getRequestLocale());
}
