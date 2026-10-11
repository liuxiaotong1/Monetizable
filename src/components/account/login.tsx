"use client";
import { useState } from "react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
export default function Login() {
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  return (
    <main className="auth-screen">
      <a className="brand" href="/">
        <img src="/brand/monetizable-bull-blue-violet.svg" width="44" height="44" alt="" />
        Monetizable
      </a>
      <section className="auth-card">
        <span className="eyebrow">YOUR NEXT LEVEL STARTS HERE</span>
        <h1>
          Invest in your
          <br />
          <em>understanding.</em>
        </h1>
        <p>
          A daily market adventure. Your predictions, your discoveries, your
          progress — together in one account.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setMessage("");
            try {
              const res = await fetch("/api/auth/email", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                }),
                data = await res.json();
              if (!res.ok) throw Error(data.error);
              setMessage(data.message);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="email">
            <Mail size={16} /> Your email
          </label>
          <input
            type="email"
            id="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <button className="primary full" disabled={busy}>
            {busy ? "Sending your link…" : "Send me a sign-in link"}
            <ArrowRight size={17} />
          </button>
        </form>
        {message && (
          <p role="status" className="account-success">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="account-error">
            {error}
          </p>
        )}
        <div className="auth-note">
          <ShieldCheck size={17} />
          No password. No trading account connection.
        </div>
        <a className="muted" href="/">
          Explore without an account →
        </a>
        <p className="small-text muted">
          New here? The same link creates your account after you verify your
          email. Account records sync across your devices. Trial learning carries into your account on this browser when you
          sign in from the save prompt. Prediction drafts return for you to confirm.
        </p>
      </section>
    </main>
  );
}
