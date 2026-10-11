"use client";

import { useState } from "react";

export function SkillStackUnlock({ analysisId, price, french = false }: { analysisId: string; price: string; french?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysisId }) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout could not be started.");
      window.location.assign(data.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Checkout could not be started.");
      setBusy(false);
    }
  }
  return <div>
    <button className="button gold-surface mt-7" disabled={busy} onClick={checkout}>
      {busy ? (french ? "Ouverture du paiement sécurisé…" : "Opening secure checkout…") : (french ? `Débloquer — ${price} · paiement unique` : `Unlock — ${price} · one-time payment`)}
    </button>
    {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
  </div>;
}
