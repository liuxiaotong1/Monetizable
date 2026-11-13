import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLanding from "@/components/marketing/public-landing";
import PublicOverview from "@/components/marketing/public-overview";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { sessionFor } from "@/lib/quest/domain";
import { applicationSchema, organizationSchema, positioning, SITE_URL } from "@/lib/marketing/positioning";
import type { AppLocale } from "@/lib/i18n/locale";

const locales = ["en", "fr", "zh"] as const;
type LocaleParam = { locale: string };

export const revalidate = 3600;
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

function localeOf(value: string): AppLocale | undefined {
  return locales.includes(value as AppLocale) ? value as AppLocale : undefined;
}

export async function generateMetadata({ params }: { params: Promise<LocaleParam> }): Promise<Metadata> {
  const locale = localeOf((await params).locale);
  if (!locale) notFound();
  const copy = positioning[locale];
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: SITE_URL },
    robots: { index: false, follow: true },
  };
}

export default async function Welcome({ params }: { params: Promise<LocaleParam> }) {
  const locale = localeOf((await params).locale);
  if (!locale) notFound();
  const now = new Date();
  const lang = locale === "zh" ? "zh-CN" : locale;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [organizationSchema(), applicationSchema()],
  };
  return (
    <LocaleProvider locale={locale}>
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=${JSON.stringify(lang)}` }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <PublicLanding initialState={{ now: now.toISOString(), session: sessionFor(now), bars: [] }} />
      <PublicOverview locale={locale} />
    </LocaleProvider>
  );
}
