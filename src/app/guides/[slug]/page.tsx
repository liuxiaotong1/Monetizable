import { translateMetadata } from "@/lib/localized-text";
import { getRequestLocale } from "@/lib/request-locale";

import { Localized } from "@/components/localized";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogFooter, BlogHeader, blogCtaForContent } from "@/components/blog-shell";
import { BLOG_URL, EDITORIAL_AUTHOR_NAME, EDITORIAL_AUTHOR_URL, MAIN_SITE_URL, formatPostDate } from "@/lib/blog";
import { getAllGuides, getGuide, guideUrl } from "@/lib/guides";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllGuides().map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return {};
  const canonical = guideUrl(guide);
  return translateMetadata({
    title: guide.title,
    description: guide.description,
    alternates: { canonical },
    authors: [{ name: EDITORIAL_AUTHOR_NAME, url: EDITORIAL_AUTHOR_URL }],
    openGraph: {
      type: "article",
      url: canonical,
      title: guide.title,
      description: guide.description,
      publishedTime: guide.publishedAt,
      modifiedTime: guide.modifiedAt,
      authors: [EDITORIAL_AUTHOR_URL],
    },
  }, await getRequestLocale());
}

export default async function GuidePage({ params }: Props) {
  const contentLocale = await getRequestLocale();
  const locale = await getRequestLocale();
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  const canonical = guideUrl(guide);
  const headerCta = blogCtaForContent(
    guide.title,
    guide.description,
    guide.answer,
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonical}#article`,
        headline: guide.title,
        description: guide.description,
        url: canonical,
        datePublished: guide.publishedAt,
        dateModified: guide.modifiedAt,
        author: { "@type": "Organization", name: EDITORIAL_AUTHOR_NAME, url: EDITORIAL_AUTHOR_URL },
        publisher: { "@type": "Organization", name: "Monetizable", url: MAIN_SITE_URL },
        mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
        isAccessibleForFree: true,
        citation: guide.sources.map((source) => source.url),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Insights", item: BLOG_URL },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${MAIN_SITE_URL}/guides` },
          { "@type": "ListItem", position: 3, name: guide.shortTitle, item: canonical },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: guide.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };

  return (
    <Localized><main className="min-h-screen bg-[var(--cream)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(translateMetadata(jsonLd, contentLocale)).replace(/</g, "\\u003c") }} />
      <BlogHeader cta={headerCta} />
      <article className="shell py-12 md:py-20">
        <header className="mx-auto max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-sm font-bold text-black/50">
            <Link href="/blog" className="hover:text-black">Insights</Link> <span aria-hidden="true">/</span> <Link href="/guides" className="hover:text-black">Guides</Link>
          </nav>
          <div className="eyebrow mt-8 text-[var(--gold-deep)]">{guide.eyebrow}</div>
          <h1 className="editorial-title mt-4 text-4xl leading-[1.04] md:text-7xl">{guide.title}</h1>
          <p className="mt-6 max-w-3xl text-xl leading-9 text-black/65">{guide.description}</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-black/10 py-4 text-sm text-black/55">
            <span>By <Link href="/authors/monetizable-research-team" className="font-bold text-black underline underline-offset-4">{EDITORIAL_AUTHOR_NAME}</Link></span>
            <span>Updated {formatPostDate(guide.modifiedAt, locale)}</span>
            <span>Reviewed against primary sources</span>
          </div>
        </header>

        <div className="blog-prose mx-auto mt-12 max-w-3xl">
          <section className="key-takeaways" aria-labelledby="short-answer">
            <h2 id="short-answer">Short answer</h2>
            <p>{guide.answer}</p>
            <ul>{guide.takeaways.map((takeaway) => <li key={takeaway}>{takeaway}</li>)}</ul>
          </section>

          {guide.sections.map((section) => {
            const evidenceSources = section.evidenceSourceIndexes?.map((index) => guide.sources[index]).filter(Boolean) ?? [];
            return (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.steps ? (
                  <ol>
                    {section.steps.map((step) => <li key={step.title}><strong>{step.title}:</strong> {step.detail}</li>)}
                  </ol>
                ) : null}
                {evidenceSources.length ? (
                  <aside className="my-6 rounded-xl border border-black/10 bg-black/[.025] px-5 py-4 text-sm" aria-label={`Evidence sources for ${section.heading}`}>
                    <strong>Evidence used in this section</strong>
                    <ul className="!mb-0 !mt-2">
                      {evidenceSources.map((source) => (
                        <li key={source.url}><a href={source.url} rel="noopener noreferrer">{source.title}</a> — {source.publisher}</li>
                      ))}
                    </ul>
                  </aside>
                ) : null}
              </section>
            );
          })}

          <aside className="my-12 rounded-[22px] bg-black p-7 text-white md:p-9">
            <div className="eyebrow text-[var(--gold-bright)]">Apply this to your experience</div>
            <h2 className="!mt-3 !text-white">Find your evidence-backed skill combinations.</h2>
            <p className="!text-white/75">Monetizable analyzes your experience, forms differentiated combinations, and checks them against market signals. Treat the result as a set of hypotheses to validate.</p>
            <Link href={MAIN_SITE_URL} className="button mt-3 border-white bg-white !text-black !no-underline">Analyze my skills</Link>
          </aside>

          <section>
            <h2>Frequently asked questions</h2>
            {guide.faqs.map((faq) => (
              <div key={faq.question}>
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))}
          </section>

          <section>
            <h2>Sources and editorial note</h2>
            <p>This guide uses the sources below for occupational and labor-market context. The framework and recommendations are Monetizable’s editorial interpretation. They are educational, not a guarantee of employment or earnings.</p>
            <ul>
              {guide.sources.map((source) => <li key={source.url}><a href={source.url} rel="noopener noreferrer">{source.title}</a> — {source.publisher}</li>)}
            </ul>
            <p>Read our <Link href="/methodology">methodology</Link> and <Link href="/editorial-policy">editorial policy</Link>.</p>
          </section>

          <nav aria-label="Related guides" className="mt-12 border-t border-black/10 pt-8">
            <strong>Continue exploring:</strong>
            <ul>
              {getAllGuides().filter((item) => item.slug !== guide.slug).map((item) => <li key={item.slug}><Link href={`/guides/${item.slug}`}>{item.shortTitle}</Link></li>)}
              {guide.slug === "skills-assessment-for-career-change" ? (
                <>
                  <li><Link href="/post/best-transferable-skills-assessment-tools-2026">Compare five transferable-skills assessment tools</Link></li>
                  <li><Link href="/post/best-ai-skill-stack-analysis-tools-2026-enterprise-vs-individual">Compare individual and enterprise skill-analysis tools</Link></li>
                </>
              ) : null}
              <li><Link href="/post/skill-stack-analysis-tool-mapping-hidden-value-for-the-2026-economy">What a professional skill stack is</Link></li>
              <li><Link href={`${MAIN_SITE_URL}/tools/skill-evidence-worksheet`}>Free skill evidence worksheet</Link></li>
            </ul>
          </nav>
        </div>
      </article>
      <BlogFooter />
    </main></Localized>
  );
}
