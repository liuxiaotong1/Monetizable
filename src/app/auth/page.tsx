
import { Localized } from "@/components/localized";
import { AuthForm } from "@/components/auth-form";
import { Header } from "@/components/brand";
import { currentUser } from "@/lib/auth";
import { safeAuthRedirect } from "@/lib/auth-flow";
import { getRequestLocale } from "@/lib/request-locale";

export const dynamic = "force-dynamic";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string; error?: string }> }) {
  const [query, locale, user] = await Promise.all([searchParams, getRequestLocale(), currentUser()]);
  const redirectPath = safeAuthRedirect(query.next);
  const initialMode = query.mode === "signup" ? "signup" : "login";
  return (
    <Localized><main className="min-h-screen">
      <Header locale={locale} accountEmail={user?.email}/>
      <section className="shell py-12 md:py-16">
        <div className="eyebrow text-[var(--gold-deep)]">Your Monetizable account</div>
        <h1 className="editorial-title mt-4 max-w-3xl text-4xl md:text-6xl">Package your expertise. Put SuperCharlie to work.</h1>
        <p className="mt-5 max-w-2xl leading-7 text-black/60">Create an account with email and password or continue with Google. Your analysis, opportunities and outreach remain private.</p>
        {query.error ? <p className="mt-6 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Sign-in could not be completed. Please try again.</p> : null}
        <AuthForm redirectPath={redirectPath} initialMode={initialMode} signedInEmail={user?.email}/>
        <a href="/account/billing" className="mt-6 inline-block font-bold underline underline-offset-4">{locale === "fr" ? "Gérer / résilier l’abonnement" : "Manage / cancel subscription"}</a>
      </section>
    </main></Localized>
  );
}
