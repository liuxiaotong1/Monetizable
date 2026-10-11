import { translateMetadata } from "@/lib/localized-text";
import { getRequestLocale } from "@/lib/request-locale";

import { Localized } from "@/components/localized";
import type { Metadata } from "next";
import Link from "next/link";
import { BlogFooter, BlogHeader } from "@/components/blog-shell";
import { MAIN_SITE_URL } from "@/lib/blog";

const canonical = `${MAIN_SITE_URL}/faq`;

const faqs = [
  {
    question: "What is the difference between ChatGPT and Monetizable?",
    answer: "ChatGPT is a general-purpose AI assistant that can summarize a CV and brainstorm career ideas from your prompt. Monetizable is a focused skill-intelligence workflow: it extracts evidence from your experience, maps combinations of capabilities and domain knowledge, and checks promising directions against current public opportunity signals. ChatGPT is useful for open-ended exploration; Monetizable is designed to produce a structured, testable path from work evidence to an opportunity.",
  },
  {
    question: "What is an AI skill stack analyzer?",
    answer: "An AI skill stack analyzer looks beyond isolated skills and job titles to identify combinations that become valuable together. For example, research, healthcare knowledge, stakeholder facilitation, and data storytelling may form a more distinctive stack than any one skill alone. A useful analyzer should show the evidence behind each skill, the problems the combination can solve, and the gaps that still need verification.",
  },
  {
    question: "Can AI identify transferable skills from my CV?",
    answer: "Yes, AI can extract repeated actions, knowledge, tools, constraints, and outcomes from a CV and translate them into transferable skills. The output still needs human verification because a CV may omit context and AI can overstate weak evidence. Monetizable keeps the connection between each proposed skill and the experience that supports it so you can review the claim before using it.",
  },
  {
    question: "How do I know which of my skills I can monetize?",
    answer: "A skill becomes monetizable when it helps a specific buyer solve a costly or urgent problem and you can show credible evidence that you can deliver the result. Start with a combination of skills, identify the problem it can solve, check current jobs or project briefs for repeated demand, and run a small test before investing heavily. A popular skill without a buyer, context, or proof is not yet an offer.",
  },
  {
    question: "Can Monetizable help me choose a new career or freelance service?",
    answer: "Monetizable can generate and compare career-pivot and freelance hypotheses from your existing evidence. It does not choose a future for you or guarantee demand. It helps you see adjacent paths, understand the evidence and gaps behind each path, and decide which option deserves a low-risk market test, conversation, work sample, or application.",
  },
] as const;

const metadata: Metadata = {
  title: "Monetizable FAQ: AI Skill Analysis, ChatGPT and Career Change",
  description: "Answers to common questions about Monetizable, AI skill stack analysis, transferable skills, career changes, freelance opportunities, and how it differs from ChatGPT.",
  alternates: { canonical },
  openGraph: {
    type: "website",
    url: canonical,
    title: "Frequently Asked Questions About Monetizable",
    description: "Clear answers about AI skill analysis, transferable skills, career pivots, and monetizing professional experience.",
  },
};

export default async function FaqPage() {
  const contentLocale = await getRequestLocale();
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <Localized><main className="min-h-screen bg-[var(--cream)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(translateMetadata(faqJsonLd, contentLocale)).replace(/</g, "\\u003c") }} />
      <BlogHeader />
      <section className="shell py-14 md:py-20">
        <header className="max-w-4xl">
          <div className="eyebrow text-[var(--gold-deep)]">Frequently asked questions</div>
          <h1 className="editorial-title mt-4 text-5xl leading-[1.02] md:text-7xl">What Monetizable does—and what it does not.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-black/65">Direct answers about AI skill analysis, transferable skills, career decisions, and turning experience into a testable opportunity.</p>
        </header>

        <div className="mt-12 grid gap-5">
          {faqs.map((faq, index) => (
            <article key={faq.question} className="card p-7 md:p-9">
              <div className="eyebrow text-[var(--gold-deep)]">Question {String(index + 1).padStart(2, "0")}</div>
              <h2 className="editorial-title mt-3 text-3xl leading-tight">{faq.question}</h2>
              <p className="mt-4 max-w-4xl text-lg leading-8 text-black/68">{faq.answer}</p>
              {index === 0 ? <p className="mt-4"><Link href="/guides/ai-skill-stack-analyzer-vs-career-test-vs-resume-scanner" className="font-black underline decoration-[var(--gold)] decoration-2 underline-offset-4">Compare AI skill analyzers, career tests, and resume scanners →</Link></p> : null}
            </article>
          ))}
        </div>

        <aside className="mt-12 rounded-[24px] bg-black p-7 text-white md:flex md:items-center md:justify-between md:gap-8 md:p-10">
          <div>
            <div className="eyebrow text-[var(--gold-bright)]">Use your own evidence</div>
            <h2 className="editorial-title mt-3 text-3xl">See which combinations are worth testing.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-white/70">Start with your CV, LinkedIn profile, or pasted experience. Review the evidence before acting on any recommendation.</p>
          </div>
          <Link href="/" className="button mt-6 shrink-0 border-white bg-white text-black md:mt-0">Analyze my skills →</Link>
        </aside>
      </section>
      <BlogFooter />
    </main></Localized>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return translateMetadata(metadata, await getRequestLocale());
}
