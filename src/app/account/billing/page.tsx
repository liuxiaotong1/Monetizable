import { redirect } from "next/navigation";
import { Header } from "@/components/brand";
import { AccountBilling } from "@/components/account-billing";
import { currentUser } from "@/lib/auth";
import { billingSubscriptions, type BillingSubscription } from "@/lib/account-billing";
import { getRequestLocale } from "@/lib/request-locale";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const [user, locale] = await Promise.all([currentUser(), getRequestLocale()]);
  if (!user) redirect("/auth?next=/account/billing");
  let subscriptions: BillingSubscription[] = [];
  let loadFailed = false;
  try { subscriptions = await billingSubscriptions(user); } catch { loadFailed = true; }
  const fr = locale === "fr";
  return <main className="min-h-screen pb-20"><Header locale={locale} accountEmail={user.email}/><section className="shell max-w-4xl py-10">
    <div className="eyebrow">{fr ? "Votre compte" : "Your account"}</div>
    <h1 className="editorial-title mt-4 text-4xl md:text-6xl">{fr ? "Abonnement et facturation" : "Subscription & billing"}</h1>
    <p className="mt-5 break-words text-black/60">{user.email}</p>
    <p className="mt-4">{fr ? "Vous pouvez résilier sans supprimer votre compte ni vos analyses enregistrées." : "You can cancel without deleting your account or saved analyses."}</p>
    <AccountBilling initialSubscriptions={subscriptions} loadFailed={loadFailed} locale={locale}/>
    <a href="/agent" className="mt-8 inline-block underline">{fr ? "Retour à SuperCharlie" : "Back to SuperCharlie"}</a>
  </section></main>;
}
