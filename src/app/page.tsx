import { translateMetadata } from "@/lib/localized-text";

import { Localized } from "@/components/localized";
import type { Metadata } from "next";
import { Funnel } from "@/components/funnel";
import { formatPostDate, getAllPosts } from "@/lib/blog";
import { getAllGuides } from "@/lib/guides";
import { getRequestLocale } from "@/lib/request-locale";

const metadata: Metadata = {
  title: "Turn Expertise Into Real Opportunities",
  description: "Package what you do best, validate who is buying, and let SuperCharlie scan the market and help you reach relevant decision makers.",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const contentLocale = await getRequestLocale();
  const query = await searchParams;
  const locale = await getRequestLocale();
  const guides = getAllGuides().slice(0, 3).map((guide) => ({
    slug: guide.slug,
    title: guide.shortTitle,
    description: guide.description,
  }));
  const posts = getAllPosts(locale).slice(0, 2).map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    heroImage: post.heroImage,
    publishedLabel: formatPostDate(post.publishedAt, locale),
    readTime: Math.max(1, Math.round(post.wordCount / 220)),
  }));
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://getmonetizable.com/#organization",
        name: "Monetizable",
        url: "https://getmonetizable.com",
        logo: "https://getmonetizable.com/monetizable-mark.svg",
      },
      {
        "@type": "WebSite",
        "@id": "https://getmonetizable.com/#website",
        name: "Monetizable",
        url: "https://getmonetizable.com",
        description: "Offer packaging, live buyer-demand validation, and continuous personalized outreach.",
        publisher: { "@id": "https://getmonetizable.com/#organization" },
      },
      {
        "@type": "WebApplication",
        "@id": "https://getmonetizable.com/#application",
        name: "SuperCharlie by Monetizable",
        url: "https://getmonetizable.com",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any web browser",
        browserRequirements: "Requires JavaScript and a modern web browser",
        description: "Uses evidence from a CV, public LinkedIn profile, or professional experience to package 1–3 sellable offers, validate target buyers, and continuously reach relevant decision makers by email.",
        featureList: [
          "CV and experience evidence extraction",
          "Sellable offer packaging",
          "Buyer and market-demand validation",
          "Continuous personalized email outreach",
        ],
        audience: { "@type": "Audience", audienceType: "Experienced professionals building independent income" },
        provider: { "@id": "https://getmonetizable.com/#organization" },
        isAccessibleForFree: true,
        potentialAction: {
          "@type": "UseAction",
          target: "https://getmonetizable.com/#analyze",
          object: { "@type": "DigitalDocument", name: "CV, public LinkedIn profile, or pasted professional experience" },
        },
      },
    ],
  };

  return <Localized><><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(translateMetadata(structuredData, contentLocale)).replace(/</g, "\\u003c") }} /><Funnel guides={guides} posts={posts} locale={locale} welcome={query.welcome === "supercharlie"} /></></Localized>;
}

export async function generateMetadata(): Promise<Metadata> {
  return translateMetadata(metadata, await getRequestLocale());
}
