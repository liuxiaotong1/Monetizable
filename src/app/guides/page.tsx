import type { Metadata } from "next";
import Link from "next/link";
import { BlogFooter, BlogHeader } from "@/components/blog-shell";
import { MAIN_SITE_URL } from "@/lib/blog";
import { getAllGuides, guideUrl } from "@/lib/guides";

const canonical = `${MAIN_SITE_URL}/guides`;

export const metadata: Metadata = {
  title: "Skills, Career Change and Monetization Guides",
  description: "Evidence-led guides to identify transferable skills, plan a career change, validate market demand, and turn a distinctive skill combination into an offer.",
  alternates: { canonical },
  openGraph: {
    type: "website",
    url: canonical,
    title: "Monetizable Skills and Career Guides",
    description: "Practical frameworks for skills-first careers and market-tested opportunities.",
  },
};

export default function GuidesPage() {
  const guides = getAllGuides();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Monetizable Skills and Career Guides",
    url: canonical,
    hasPart: guides.map((guide) => ({
      "@type": "Article",
      name: guide.title,
      url: guideUrl(guide),
    })),
  };

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <BlogHeader />
      <section className="shell py-14 md:py-20">
        <header className="max-w-3xl">
          <div className="eyebrow text-[var(--gold-deep)]">Start with your question</div>
          <h1 className="editorial-title mt-4 text-5xl leading-[1.02] md:text-7xl">Evidence-led skills and career guides.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-black/65">Clear methods for turning work evidence into transferable skills, career hypotheses, and offers that can be tested against real demand.</p>
        </header>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {guides.map((guide, index) => (
            <article key={guide.slug} className="card flex flex-col p-7">
              <div className="eyebrow text-[var(--gold-deep)]">Guide {String(index + 1).padStart(2, "0")}</div>
              <h2 className="editorial-title mt-4 text-3xl leading-tight">
                <Link href={`/guides/${guide.slug}`} className="hover:text-[var(--gold-deep)]">{guide.shortTitle}</Link>
              </h2>
              <p className="mt-4 flex-1 leading-7 text-black/62">{guide.answer}</p>
              <Link href={`/guides/${guide.slug}`} className="mt-6 font-black underline decoration-[var(--gold)] decoration-2 underline-offset-4">Read the guide →</Link>
            </article>
          ))}
        </div>

        <aside className="mt-12 rounded-[24px] bg-black p-7 text-white md:flex md:items-center md:justify-between md:gap-8 md:p-10">
          <div>
            <div className="eyebrow text-[var(--gold-bright)]">Turn reflection into evidence</div>
            <h2 className="editorial-title mt-3 text-3xl">Analyze your own skill stack.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-white/70">Use your CV or LinkedIn profile to surface combinations, then validate the most promising directions against market signals.</p>
          </div>
          <Link href="/" className="button mt-6 shrink-0 border-white bg-white text-black md:mt-0">Analyze my skills</Link>
        </aside>
      </section>
      <BlogFooter />
    </main>
  );
}
