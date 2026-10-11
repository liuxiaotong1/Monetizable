"use client";

import { useState } from "react";
import type { BillingSubscription } from "@/lib/account-billing";

export function AccountBilling({ initialSubscriptions, loadFailed, locale }: { initialSubscriptions: BillingSubscription[]; loadFailed: boolean; locale: "en" | "fr" }) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const fr = locale === "fr";
  async function cancel(id: string) {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/subscription/cancel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscriptionId: id, confirm: true }) });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.subscriptions)) throw new Error();
      setSubscriptions(data.subscriptions); setConfirming(null);
    } catch { setError(fr ? "Résiliation non confirmée. Rechargez la page pour vérifier votre abonnement ou contactez-nous." : "Cancellation not confirmed. Reload to check your subscription or contact us."); }
    finally { setPending(false); }
  }
  return <div className="mt-8 space-y-5">
    {loadFailed ? <p role="alert">{fr ? "Impossible de vérifier la facturation. Réessayez ou contactez-nous pour résilier." : "Billing could not be verified. Retry or contact us to cancel."}</p> : subscriptions.length === 0 ? <p>{fr ? "Aucun abonnement récurrent lié à ce compte. Un achat unique ne se renouvelle pas." : "No recurring subscription is linked to this account. One-time purchases do not renew."}</p> : subscriptions.map((subscription, index) => <section key={subscription.id} className="rounded-3xl border border-black/10 bg-white p-6 md:p-8">
      <h2 className="text-xl font-bold">SuperCharlie {subscriptions.length > 1 ? `· ${index + 1}` : ""}</h2>
      <p className="mt-3" role="status">{subscription.status === "canceled" || subscription.status === "incomplete_expired" ? (fr ? "Abonnement terminé — aucun renouvellement." : "Subscription ended — no renewal.") : subscription.cancelAtPeriodEnd ? (fr ? "Renouvellement désactivé." : "Renewal is turned off.") : (fr ? "Renouvellement activé." : "Renewal is on.")}</p>
      {subscription.endsAt && !["canceled", "incomplete_expired"].includes(subscription.status) && <p className="mt-2 text-black/60">{subscription.cancelAtPeriodEnd ? (fr ? "Fin prévue : " : "Scheduled end: ") : (fr ? "Fin de la période : " : "Current period ends: ")}{new Date(subscription.endsAt).toLocaleDateString(fr ? "fr-FR" : "en-GB", { timeZone: "UTC" })}</p>}
      {subscription.canCancel && (confirming === subscription.id ? <div className="mt-5 rounded-2xl bg-[var(--gold-soft)] p-5">
        <p>{fr ? "Confirmer la résiliation ? Votre accès payé reste disponible jusqu’à la fin de la période. Aucun remboursement automatique. Les factures déjà dues ne sont pas annulées." : "Confirm cancellation? Paid access remains until the period ends. No automatic refund. Previously due invoices are not canceled."}</p>
        <div className="mt-4 flex flex-wrap gap-3"><button className="button" disabled={pending} onClick={() => cancel(subscription.id)}>{pending ? "…" : fr ? "Confirmer la résiliation" : "Confirm cancellation"}</button><button className="button secondary" disabled={pending} onClick={() => setConfirming(null)}>{fr ? "Conserver l’abonnement" : "Keep subscription"}</button></div>
      </div> : <button className="button secondary mt-5" disabled={pending} onClick={() => setConfirming(subscription.id)}>{fr ? "Résilier l’abonnement" : "Cancel subscription"}</button>)}
    </section>)}
    {error && <p role="alert" className="text-red-800">{error}</p>}
    <div className="flex flex-wrap gap-5 text-sm"><a href="/account/billing" className="underline">{fr ? "Actualiser l’état" : "Refresh billing status"}</a><a href="mailto:liuxiaotong268@gmail.com?subject=Monetizable%20subscription%20cancellation" className="underline">{fr ? "Contacter l’assistance" : "Contact support"}</a></div>
  </div>;
}
