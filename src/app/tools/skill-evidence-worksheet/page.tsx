import { translateMetadata } from "@/lib/localized-text";
import { getRequestLocale } from "@/lib/request-locale";

import { Localized } from "@/components/localized";
import type { Metadata } from "next";
import Link from "next/link";
import { BlogFooter, BlogHeader } from "@/components/blog-shell";
import { SkillEvidenceWorksheet } from "@/components/skill-evidence-worksheet";

const canonical = "https://getmonetizable.com/tools/skill-evidence-worksheet";

const metadata: Metadata = {
  title: "Free Skill Evidence Worksheet for Career Change and Monetization",
  description: "Use this private, free worksheet to turn work examples into evidence-backed transferable skills, a skill stack, and a market hypothesis you can test.",
  alternates: { canonical },
  openGraph: {
    type: "website",
    url: canonical,
    title: "Free Skill Evidence Worksheet",
    description: "Turn experience into a defensible skill stack and market hypothesis.",
  },
};

export default async function SkillEvidenceWorksheetPage() {
  const contentLocale = await getRequestLocale();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Monetizable Skill Evidence Worksheet",
        url: canonical,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any web browser",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: "A private in-browser worksheet for translating work evidence into transferable skills, a skill stack, and a market hypothesis.",
        provider: { "@type": "Organization", name: "Monetizable", url: "https://getmonetizable.com" },
      },
      {
        "@type": "HowTo",
        name: "How to build an evidence-backed skill stack",
        description: "Extract capabilities from real work, group them into a skill stack, and form a market hypothesis to validate.",
        totalTime: "PT20M",
        step: [
          { "@type": "HowToStep", position: 1, name: "Capture work evidence", text: "Describe the situation, your action, and the observable result for at least three examples." },
          { "@type": "HowToStep", position: 2, name: "Group capabilities", text: "Group supported capabilities into domain knowledge, execution skills, people skills, and tools or methods." },
          { "@type": "HowToStep", position: 3, name: "Form a market hypothesis", text: "Connect the combination to a defined buyer, recurring problem, and useful outcome." },
          { "@type": "HowToStep", position: 4, name: "Validate demand", text: "Check current market evidence and seek a small behavioral or paid commitment before making a major decision." },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "Is the worksheet data uploaded or saved?", acceptedAnswer: { "@type": "Answer", text: "No. The fields run in your browser and are not submitted to Monetizable. Copy the summary or print it before leaving." } },
          { "@type": "Question", name: "What counts as evidence for a skill?", acceptedAnswer: { "@type": "Answer", text: "A project, decision, artifact, result, repeated responsibility, feedback, or difficult situation can count when it shows what you personally did." } },
          { "@type": "Question", name: "Does completing the worksheet prove market demand?", acceptedAnswer: { "@type": "Answer", text: "No. It creates a clearer hypothesis. Demand requires separate evidence from current buyers, roles, projects, budgets, and ideally a real commitment." } },
        ],
      },
    ],
  };

  return (
    <Localized><main className="min-h-screen bg-[var(--cream)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(translateMetadata(jsonLd, contentLocale)).replace(/</g, "\\u003c") }} />
      <BlogHeader />
      <section className="shell py-12 md:py-20">
        <header className="mx-auto max-w-4xl text-center">
          <div className="eyebrow text-[var(--gold-deep)]">Free · private · no account</div>
          <h1 className="editorial-title mt-4 text-4xl leading-[1.03] md:text-7xl">Skill Evidence Worksheet</h1>
          <p className="mx-auto mt-6 max-w-3xl text-xl leading-9 text-black/65">Turn real work examples into transferable skills, a distinctive skill combination, and a market hypothesis you can investigate—without uploading anything.</p>
        </header>

        <SkillEvidenceWorksheet />

        <article className="blog-prose mx-auto mt-16 max-w-3xl">
          <h2>Why start with evidence instead of a skill list?</h2>
          <p>A generic list can suggest vocabulary, but it cannot show whether you have used a capability independently, under pressure, at meaningful scale, or with a useful result. Evidence makes a skill credible and helps another person understand how it could transfer to a new context.</p>
          <p>The worksheet separates domain knowledge, execution skills, people skills, and tools because useful differentiation often comes from their combination. A tool by itself may be common; a tool combined with industry context, judgment, communication, and proof can support a narrower opportunity.</p>

          <h2>How to use the result</h2>
          <p>Treat the positioning sentence as a hypothesis, not a finished personal brand. Compare it with current job descriptions, freelance briefs, buyer interviews, and occupational sources. Ask whether the buyer is reachable, whether the problem is urgent, whether your proof is relevant, and whether someone will make a real commitment.</p>
          <p>For a more detailed process, read <Link href="/guides/identify-transferable-skills-from-your-cv">how to identify transferable skills from your CV</Link> and <Link href="/guides/validate-market-demand-for-your-skills">how to validate market demand</Link>.</p>

          <h2>Frequently asked questions</h2>
          <h3>Is the worksheet data uploaded or saved?</h3>
          <p>No. The fields run in your browser and this page does not submit them to Monetizable. Copy the summary or print it before leaving because the page does not provide cloud storage.</p>
          <h3>What counts as evidence for a skill?</h3>
          <p>A project, decision, artifact, result, repeated responsibility, feedback, or difficult situation can count when it shows what you personally did. Use truthful qualitative evidence when no reliable number exists.</p>
          <h3>Does completing the worksheet prove market demand?</h3>
          <p>No. It builds a clearer hypothesis. Demand requires separate evidence from current buyers, roles, projects, budgets, and ideally a small behavioral or paid commitment.</p>
        </article>
      </section>
      <BlogFooter />
    </main></Localized>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return translateMetadata(metadata, await getRequestLocale());
}
