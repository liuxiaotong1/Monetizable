import { LanguageSwitcher } from "@/components/language-switcher";

import { Localized } from "@/components/localized";
import Link from "next/link";
import { BLOG_URL, MAIN_SITE_URL } from "@/lib/blog";
import { Brand } from "@/components/brand";
import { GOOGLE_PREFERRED_SOURCE_URL, preferredSourceCtaEnabled } from "@/lib/preferred-source";

function navigationUrls() {
  const blog = process.env.NEXT_PUBLIC_BLOG_NAV_URL
    ?? (process.env.NODE_ENV === "development" ? "/blog" : BLOG_URL);
  const main = blog.startsWith("/") ? "/" : MAIN_SITE_URL;
  return { blog, main, mainPage: (path: string) => main === "/" ? path : `${main}${path}` };
}

export type BlogCta = "package" | "outreach";
const OUTREACH_ARTICLE_PATTERN = /outreach|opportunit|buyer|client|freelanc|consult|contract|service|independent income|application|hiring|job market/;

export function blogCtaForContent(...values: Array<string | undefined>): BlogCta {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  return OUTREACH_ARTICLE_PATTERN.test(text)
    ? "outreach"
    : "package";
}

export function BlogHeader({ cta = "package" }: { cta?: BlogCta }) {
  const { blog: blogNavUrl, main: mainNavUrl, mainPage } = navigationUrls();
  const ctaLabel = cta === "outreach" ? "Outreach opportunities with Agent" : "Package your expertise";
  const ctaHref = cta === "outreach" ? mainPage("/agent") : `${mainNavUrl === "/" ? "" : mainNavUrl}/#analyze`;
  return (
    <Localized><header className="border-b border-black/10 bg-[var(--cream)]">
      <div className="shell flex min-h-20 items-center justify-between gap-5">
        <Brand href={mainNavUrl} />
        <nav aria-label="Blog navigation" className="flex items-center gap-4 text-sm font-bold">
          <Link href={blogNavUrl} className="hidden underline-offset-4 hover:underline sm:inline">Insights</Link>
          <Link href="/guides" className="hidden underline-offset-4 hover:underline md:inline">Guides</Link>
          <Link href="/faq" className="hidden underline-offset-4 hover:underline md:inline">FAQ</Link>
          <LanguageSwitcher />
          <Link href={ctaHref} className="button min-h-10 px-4">{ctaLabel}</Link>
        </nav>
      </div>
    </header></Localized>
  );
}

export function BlogFooter() {
  const { blog: blogNavUrl, main: mainNavUrl, mainPage } = navigationUrls();
  const showPreferredSourceCta = preferredSourceCtaEnabled();
  return (
    <Localized><footer className="mt-20 border-t border-black/10 py-10">
      <div className="shell flex flex-col justify-between gap-4 text-sm text-black/60 sm:flex-row">
        <p>© {new Date().getUTCFullYear()} Monetizable. Evidence-led career intelligence.</p>
        <div className="flex flex-wrap gap-5 font-bold text-black">
          <Link href={blogNavUrl}>Insights</Link>
          <Link href="/guides">Guides</Link>
          <Link href={mainPage("/faq")}>FAQ</Link>
          <Link href={mainPage("/product")}>Product facts</Link>
          <Link href={mainPage("/about")}>About</Link>
          <Link href={mainPage("/methodology")}>Methodology</Link>
          <Link href={mainPage("/editorial-policy")}>Editorial policy</Link>
          <Link href={mainPage("/privacy")}>Privacy</Link>
          {showPreferredSourceCta ? (
            <a href={GOOGLE_PREFERRED_SOURCE_URL} target="_blank" rel="noopener noreferrer">
              Choose us in Google ↗
            </a>
          ) : null}
          <Link href={mainNavUrl}>Try Monetizable</Link>
        </div>
      </div>
    </footer></Localized>
  );
}
