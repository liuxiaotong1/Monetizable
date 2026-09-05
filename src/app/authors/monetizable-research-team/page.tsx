import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { BLOG_URL, EDITORIAL_AUTHOR_NAME, EDITORIAL_AUTHOR_URL, MAIN_SITE_URL } from "@/lib/blog";

export const metadata: Metadata = {
  title: EDITORIAL_AUTHOR_NAME,
  description: "The team responsible for Monetizable's research on skill combinations, skills-first careers, market demand, and professional monetization paths.",
  alternates: { canonical: EDITORIAL_AUTHOR_URL },
};

export default function EditorialAuthorPage() {
  const blogNavUrl = process.env.NEXT_PUBLIC_BLOG_NAV_URL ?? (process.env.NODE_ENV === "development" ? "/blog" : BLOG_URL);
  const authorJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${EDITORIAL_AUTHOR_URL}#team`,
    name: EDITORIAL_AUTHOR_NAME,
    url: EDITORIAL_AUTHOR_URL,
    parentOrganization: { "@type": "Organization", name: "Monetizable", url: MAIN_SITE_URL },
    knowsAbout: ["skill stacks", "skills-first careers", "career transitions", "market demand validation"],
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(authorJsonLd).replace(/</g, "\\u003c") }} /><InfoPage eyebrow="Author" title={EDITORIAL_AUTHOR_NAME} description="The editorial function behind Monetizable Insights, responsible for source review, product-method explanations, and evidence-led career research.">
    <h2>What the team covers</h2>
    <p>The research team focuses on combinations of professional skills, transferable experience, skills-first hiring, career pivots, independent work, and methods for validating demand against public market evidence.</p>
    <h2>How articles are produced</h2>
    <p>Automation may support research and drafting. The published page remains accountable to the Monetizable editorial policy: nearby quantitative claims need inspectable sources, market-sensitive statements need dates or qualifications, and product claims must match the documented methodology.</p>
    <h2>Read more</h2>
    <p><Link href={blogNavUrl}>Browse Monetizable Insights</Link>, <Link href={`${MAIN_SITE_URL}/methodology`}>review the methodology</Link>, or <Link href={`${MAIN_SITE_URL}/editorial-policy`}>read the editorial policy</Link>.</p>
  </InfoPage></>;
}
