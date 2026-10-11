import { translateMetadata } from "@/lib/localized-text";
import { getRequestLocale } from "@/lib/request-locale";

import { Localized } from "@/components/localized";
import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { MAIN_SITE_URL } from "@/lib/blog";

const metadata: Metadata = {
  title: "About Monetizable",
  description: "Why Monetizable maps skill combinations against live public market demand, who it is for, and what its evidence can and cannot show.",
  alternates: { canonical: `${MAIN_SITE_URL}/about` },
};

export default function AboutPage() {
  return <Localized><InfoPage eyebrow="About Monetizable" title="Career intelligence built for the person, not the recruiter." description="Monetizable helps professionals see how their demonstrated skills can combine into differentiated, marketable paths—and checks those paths against current public opportunities.">
    <h2>What we are building</h2>
    <p>Traditional career tools usually begin with a job title. Monetizable begins with evidence from a CV, a public LinkedIn profile, or experience supplied directly by the user. It identifies combinations of demonstrated skills, then looks for public market signals that may support a career pivot, freelance offer, or learning priority.</p>
    <h2>Who it is for</h2>
    <p>The product is designed for professionals whose value is difficult to summarize with one label: multidisciplinary operators, career changers, international professionals, specialists with transferable experience, and people exploring independent work.</p>
    <h2>What we do not promise</h2>
    <p>Monetizable does not guarantee employment, clients, income, or complete coverage of the market. Public listings are samples, not the whole economy. Recommendations are decision support and should be combined with the user&apos;s judgment, direct buyer conversations, and local professional advice where relevant.</p>
    <h2>Evidence and accountability</h2>
    <p>Our public content is produced under a documented editorial process. Quantitative claims should link to inspectable sources, meaningful revisions receive a visible updated date, and automation use is disclosed where relevant.</p>
    <p><Link href="/methodology">Read the product methodology</Link> or <Link href="/editorial-policy">review the editorial policy</Link>.</p>
  </InfoPage></Localized>;
}

export async function generateMetadata(): Promise<Metadata> {
  return translateMetadata(metadata, await getRequestLocale());
}
