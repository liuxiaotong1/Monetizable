import { translateMetadata } from "@/lib/localized-text";

import { Localized } from "@/components/localized";
import type { Metadata } from "next";
import { Header } from "@/components/brand";
import { CompanyNeedForm } from "@/components/company-need-form";
import { getRequestLocale } from "@/lib/request-locale";

const metadata: Metadata = { title: "Find Proven Capabilities for Your Company", description: "Tell Monetizable what you need done. We’ll find people whose proven capabilities match it." };

export default async function ForCompaniesPage() {
  const locale = await getRequestLocale();
  return <Localized><main className="min-h-screen"><Header locale={locale}/><section className="shell grid gap-10 pb-16 pt-8 md:grid-cols-[.78fr_1.22fr] md:items-start md:pb-24 md:pt-14"><div className="md:sticky md:top-10"><div className="eyebrow text-[var(--gold-deep)]">For Companies · Free for now</div><h1 className="editorial-title mt-5 text-5xl leading-[.96] md:text-7xl">Tell us what you need done.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-black/64">We’ll find people whose proven capabilities match it. Describe the work and the outcome—not a perfect job description.</p><div className="mt-8 border-l-2 border-[var(--gold)] py-1 pl-5"><p className="font-black">A lightweight capability search.</p><p className="mt-2 text-sm leading-6 text-black/58">No recruiter dashboard, payment flow or ATS integration. We save your need and email you when a relevant match is available.</p></div></div><CompanyNeedForm/></section></main></Localized>;
}

export async function generateMetadata(): Promise<Metadata> {
  return translateMetadata(metadata, await getRequestLocale());
}
