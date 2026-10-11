"use client";
import { Localized } from "@/components/localized";


import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

export function AuthForm({
  redirectPath = "/agent",
  initialMode = "login",
  signedInEmail,
}: {
  redirectPath?: string;
  initialMode?: Mode;
  signedInEmail?: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      sessionStorage.removeItem("monetizable:agent-access-grant");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not sign out. Please try again."); }
    finally { setLoading(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
    const agentAccessGrant = sessionStorage.getItem("monetizable:agent-access-grant");
    const response = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode, email, password, redirectPath, agentAccessGrant }),
    });
    const data = await response.json();
    if (response.ok && data.redirect) {
      sessionStorage.removeItem("monetizable:agent-access-grant");
      window.location.assign(data.redirect);
      return;
    }
    setMessage(response.ok ? data.message : data.error);
    if (response.ok) sessionStorage.removeItem("monetizable:agent-access-grant");
    } catch { setMessage("The connection was interrupted. Please try again."); }
    finally { setLoading(false); }
  }

  function continueWithGoogle() {
    const url = new URL("/api/auth/google", window.location.origin);
    url.searchParams.set("next", redirectPath);
    const agentAccessGrant = sessionStorage.getItem("monetizable:agent-access-grant");
    if (agentAccessGrant) url.searchParams.set("grant", agentAccessGrant);
    window.location.assign(url.toString());
  }

  if (signedInEmail) {
    return (
      <Localized><section className="card mt-8 max-w-xl p-6 md:p-8">
        <div className="eyebrow text-[var(--gold-deep)]">Current session</div>
        <h2 className="mt-3 text-2xl font-black">You’re signed in</h2>
        <p className="mt-2 text-black/60">{signedInEmail}</p>
        <a href={redirectPath} className="button mt-6 w-full">Continue to my account</a>
        <button type="button" onClick={signOut} disabled={loading} className="button secondary mt-3 w-full">
          {loading ? "Signing out…" : "Use another account"}
        </button>
        {message && <p role="alert" className="mt-4 text-sm">{message}</p>}
      </section></Localized>
    );
  }

  return (
    <Localized><section className="card mt-8 max-w-xl p-6 md:p-8">
      <div className="grid grid-cols-2 rounded-full bg-black/[.05] p-1" role="tablist" aria-label="Authentication mode">
        {(["login", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => { setMode(value); setMessage(""); }}
            className={`rounded-full px-4 py-3 text-sm font-black ${mode === value ? "bg-black text-white" : "text-black/55"}`}
          >
            {value === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>

      <button type="button" onClick={continueWithGoogle} className="button secondary mt-6 flex w-full items-center justify-center gap-3">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.7 4.7 0 0 1-2 3v2.8h3.3c1.9-1.8 2.9-4.4 2.9-7.9Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.8c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.9A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 13.7a6 6 0 0 1 0-3.8V7H3.1a10 10 0 0 0 0 9.6l3.4-2.9Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.1 7l3.4 2.9A5.9 5.9 0 0 1 12 5.9Z"/></svg>
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[.16em] text-black/35"><span className="h-px flex-1 bg-black/10"/>or use email<span className="h-px flex-1 bg-black/10"/></div>

      <form onSubmit={submit}>
        <label htmlFor="auth-email" className="eyebrow text-[var(--gold-deep)]">Email address</label>
        <input id="auth-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="field mt-3 w-full" placeholder="you@example.com" autoComplete="email" />
        <label htmlFor="auth-password" className="eyebrow mt-5 block text-[var(--gold-deep)]">Password</label>
        <input id="auth-password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="field mt-3 w-full" placeholder="At least 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} />
        <button className="button mt-6 w-full" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
      </form>
      {mode === "signup" ? <p className="mt-4 text-xs leading-5 text-black/45">By creating an account, you agree to Monetizable’s Terms and Privacy Policy.</p> : null}
      {message ? <p role="status" className="mt-4 text-sm leading-6 text-black/60">{message}</p> : null}
    </section></Localized>
  );
}
