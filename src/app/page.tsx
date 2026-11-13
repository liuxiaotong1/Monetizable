import { createElement } from "react";
import type { Metadata } from "next";
import { BillingProvider } from "@/components/account/billing-access";
import WorkspaceEntry from "@/components/quest/workspace-entry";
import AccountShell from "@/components/account/account-shell";
import PublicLanding from "@/components/marketing/public-landing";
import PublicOverview from "@/components/marketing/public-overview";
import { AppFrame } from "@/components/site/app-frame";
import { currentUser, isAdmin } from "@/lib/account/auth";
import { requestLocale } from "@/lib/i18n/server-locale";
import { sessionFor } from "@/lib/quest/domain";
import { applicationSchema, organizationSchema, positioning } from "@/lib/marketing/positioning";

export const dynamic = "force-dynamic";
type HomeQuery = { view?: string };

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale(isAdmin(await currentUser()));
  const copy = positioning[locale];
  return { title: copy.title, description: copy.description };
}

export default async function Page({ searchParams }: { searchParams: Promise<HomeQuery> }) {
  const user = await currentUser(), admin = isAdmin(user), params = await searchParams, publicHome = !user && (!params.view || params.view === "today");
  const locale = await requestLocale(admin);
  const schema = <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": [organizationSchema(), applicationSchema()] }).replace(/</g, "\\u003c") }} />;
  if (publicHome) {
    const now = new Date();
    return <AppFrame>{schema}<PublicLanding initialState={{ now: now.toISOString(), session: sessionFor(now), bars: [] }} />{createElement(PublicOverview, { locale })}</AppFrame>;
  }
  return <AppFrame>{schema}<BillingProvider><AccountShell user={user ? { id: user.id, email: user.email, admin } : null}><WorkspaceEntry signedIn={!!user} /></AccountShell><PublicOverview locale={locale} /></BillingProvider></AppFrame>;
}
