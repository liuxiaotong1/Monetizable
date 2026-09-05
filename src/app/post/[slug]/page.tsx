import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogFooter, BlogHeader, blogCtaForContent } from "@/components/blog-shell";
import { BLOG_URL, EDITORIAL_AUTHOR_NAME, EDITORIAL_AUTHOR_URL, formatPostDate, getAllPosts, getPost, LEGACY_BLOG_ORIGIN, MAIN_SITE_URL, postUrl } from "@/lib/blog";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const canonical = postUrl(post);
  const image = `${MAIN_SITE_URL}${post.heroImage}`;
  const metadataTitle = post.seoTitle ?? post.title;

  return {
    title: post.seoTitle ? { absolute: metadataTitle } : post.title,
    description: post.description,
    keywords: post.seoKeywords,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: metadataTitle,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
      authors: [EDITORIAL_AUTHOR_URL],
      images: [{ url: image, width: 1200, height: 630, alt: post.heroAlt ?? post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: metadataTitle,
      description: post.description,
      images: [image],
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const canonical = postUrl(post);
  const wasMigratedFromLegacyBlog = post.source.startsWith(LEGACY_BLOG_ORIGIN);
  const headerCta = blogCtaForContent(post.title, post.description);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: `${MAIN_SITE_URL}${post.heroImage}`,
    datePublished: post.publishedAt,
    dateModified: post.modifiedAt,
    author: { "@type": "Organization", name: EDITORIAL_AUTHOR_NAME, url: EDITORIAL_AUTHOR_URL },
    publisher: { "@type": "Organization", name: "Monetizable", url: MAIN_SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    wordCount: post.wordCount,
    keywords: post.seoKeywords,
    citation: post.sources.map((source) => source.url),
    isAccessibleForFree: true,
    inLanguage: "en",
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Monetizable", item: MAIN_SITE_URL },
      { "@type": "ListItem", position: 2, name: "Insights", item: BLOG_URL },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };
  const blogNavUrl = process.env.NEXT_PUBLIC_BLOG_NAV_URL ?? (process.env.NODE_ENV === "development" ? "/blog" : BLOG_URL);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      <BlogHeader cta={headerCta} />
      <article className="shell py-12 md:py-20">
        <div className="mx-auto max-w-4xl">
          <Link href={blogNavUrl} className="eyebrow text-[var(--gold-deep)] hover:underline">← Monetizable insights</Link>
          <h1 className="editorial-title mt-5 text-4xl leading-[1.02] sm:text-5xl md:text-7xl">{post.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-black/65">{post.description}</p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-black/50">
            <Link href={EDITORIAL_AUTHOR_URL} className="underline underline-offset-4">By {EDITORIAL_AUTHOR_NAME}</Link>
            <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time>
            {post.modifiedAt !== post.publishedAt ? <span>Updated {formatPostDate(post.modifiedAt)}</span> : null}
            <span>{Math.max(1, Math.round(post.wordCount / 220))} min read</span>
          </div>
          <Image
            src={post.heroImage}
            alt={post.heroAlt ?? post.title}
            width={1200}
            height={630}
            sizes="(max-width: 900px) 100vw, 900px"
            priority
            className="mt-9 aspect-[1.9/1] w-full rounded-3xl border border-black/10 object-cover shadow-xl"
          />
        </div>

        <div className="blog-prose mx-auto mt-12 max-w-3xl" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

        <section className="mx-auto mt-12 max-w-3xl border-t border-black/15 pt-8" aria-labelledby="article-sources">
          <h2 id="article-sources" className="editorial-title text-2xl">Sources and editorial note</h2>
          <p className="mt-3 leading-7 text-black/62">{wasMigratedFromLegacyBlog
            ? "This article was migrated from AutoSEO and reviewed by the Monetizable Research Team. Automation assisted the original draft; cited quantitative claims were checked against the sources below. Market conditions change, and this material is informational rather than an income guarantee."
            : "This article was researched and published by the Monetizable Research Team. Automation assisted research and drafting; cited quantitative claims were checked against the sources below. Market conditions change, and this material is informational rather than a career or income guarantee."}</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6">
            {post.sources.map((source) => <li key={source.url}><a href={source.url} rel="noopener noreferrer" className="font-bold underline decoration-[var(--gold)] underline-offset-4">{source.title}</a> — {source.publisher}</li>)}
          </ul>
          <p className="mt-4 text-sm"><Link href={`${MAIN_SITE_URL}/methodology`} className="font-bold underline underline-offset-4">Read how Monetizable validates skills and market demand →</Link></p>
        </section>

        <aside className="gold-surface mx-auto mt-14 max-w-3xl rounded-3xl border border-[var(--gold-deep)]/25 p-7 md:p-10">
          <div className="eyebrow">From capability to distribution</div>
          <h2 className="editorial-title mt-3 text-3xl md:text-4xl">Package what you do best. Put it in front of the market faster.</h2>
          <p className="mt-4 max-w-2xl leading-7 text-black/70">Monetizable turns your strongest evidence into clear positioning, finds relevant opportunities and helps you begin targeted outreach—the bridge from capability to distribution and trust.</p>
          <Link href={MAIN_SITE_URL} className="button mt-6">Build your market position →</Link>
        </aside>
      </article>
      <BlogFooter />
    </main>
  );
}
