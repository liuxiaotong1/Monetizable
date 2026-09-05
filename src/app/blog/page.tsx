import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BlogFooter, BlogHeader } from "@/components/blog-shell";
import { BLOG_FEED_URL, BLOG_URL, formatPostDate, getAllPosts, MAIN_SITE_URL } from "@/lib/blog";
import { getAllGuides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Skill intelligence and market-demand insights",
  description: "Evidence-led guides to uncover valuable skill combinations, validate market demand, and find work people are already paying for.",
  alternates: {
    canonical: BLOG_URL,
    types: { "application/rss+xml": [{ url: BLOG_FEED_URL, title: "Monetizable Insights RSS" }] },
  },
  openGraph: {
    type: "website",
    url: BLOG_URL,
    title: "Monetizable Insights",
    description: "Turn your skill combinations into evidence-backed opportunities.",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  const guides = getAllGuides();
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Monetizable",
    url: MAIN_SITE_URL,
    logo: `${MAIN_SITE_URL}/monetizable-mark.svg`,
  };

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
      />
      <BlogHeader />
      <section className="shell py-14 md:py-20">
        <div className="max-w-3xl">
          <div className="eyebrow text-[var(--gold-deep)]">Monetizable insights</div>
          <h1 className="editorial-title mt-4 text-5xl leading-[.98] md:text-7xl">Turn hidden skills into visible market value.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-black/65">Practical, evidence-led guides for professionals who want to understand what their unique combination of skills is worth.</p>
        </div>

        <section className="mt-12" aria-labelledby="start-here-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow text-[var(--gold-deep)]">Start here</div>
              <h2 id="start-here-title" className="editorial-title mt-3 text-4xl">Choose the question you need to answer.</h2>
            </div>
            <Link href="/guides" className="font-black underline decoration-[var(--gold)] decoration-2 underline-offset-4">Browse all guides →</Link>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {guides.map((guide) => (
              <article key={guide.slug} className="rounded-[20px] border border-black/15 bg-[var(--gold-soft)] p-6">
                <h3 className="text-xl font-black leading-tight"><Link href={`/guides/${guide.slug}`}>{guide.shortTitle}</Link></h3>
                <p className="mt-3 leading-7 text-black/65">{guide.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="mt-10 rounded-[24px] border border-black/15 bg-black p-7 text-white md:flex md:items-center md:justify-between md:gap-8 md:p-9">
          <div>
            <div className="eyebrow text-[var(--gold-bright)]">Free practical tool</div>
            <h2 className="editorial-title mt-3 text-3xl">Build an evidence-backed skill stack.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-white/70">Use three real work examples to create a transferable-skills inventory and a market hypothesis—privately in your browser.</p>
          </div>
          <Link href={`${MAIN_SITE_URL}/tools/skill-evidence-worksheet`} className="button mt-6 shrink-0 border-white bg-white text-black md:mt-0">Open the worksheet →</Link>
        </aside>

        <div className="mt-14 grid gap-7 md:grid-cols-2">
          {posts.map((post) => (
            <article key={post.slug} className="card overflow-hidden">
              <Link href={`/post/${post.slug}`} aria-label={post.title}>
                <Image
                  src={post.heroImage}
                  alt={post.heroAlt ?? post.title}
                  width={1200}
                  height={630}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="aspect-[1.9/1] w-full object-cover"
                />
              </Link>
              <div className="p-6 md:p-7">
                <div className="eyebrow text-black/45">{formatPostDate(post.publishedAt)} · {Math.max(1, Math.round(post.wordCount / 220))} min read</div>
                <h2 className="editorial-title mt-3 text-3xl leading-tight"><Link href={`/post/${post.slug}`} className="hover:text-[var(--gold-deep)]">{post.title}</Link></h2>
                <p className="mt-4 leading-7 text-black/62">{post.description}</p>
                <Link href={`/post/${post.slug}`} className="mt-5 inline-flex font-black underline decoration-[var(--gold)] decoration-2 underline-offset-4">Read the guide →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <BlogFooter />
    </main>
  );
}
