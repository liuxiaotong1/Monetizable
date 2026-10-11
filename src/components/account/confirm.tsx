"use client";
import { useState } from "react";
export default function Confirm() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit() {
    setBusy(true);
    setError("");
    const params = new URLSearchParams(location.search);
    try {
      const res = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_hash: params.get("token_hash"),
          type: params.get("type"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error);
      history.replaceState(null, "", "/auth/confirm");
      location.assign(data.next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  return (
    <main className="auth-screen">
      <a className="brand" href="/">
        <img src="/icon.svg" width="44" height="44" alt="" />
        Monetizable
      </a>
      <section className="auth-card">
        <span className="eyebrow">ONE MORE STEP</span>
        <h1>Welcome back, explorer.</h1>
        <p>
          Confirm that you want to sign in on this device. This keeps email
          scanners from using your link.
        </p>
        <button className="primary full" onClick={submit} disabled={busy}>
          {busy ? "Signing in…" : "Confirm sign-in"}
        </button>
        {error && (
          <p role="alert" className="account-error">
            {error} <a href="/auth">Get a new link</a>
          </p>
        )}
      </section>
    </main>
  );
}
