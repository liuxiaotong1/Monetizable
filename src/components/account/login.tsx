"use client";
import {useLocale,LocalizeTree} from '@/components/i18n/locale-provider';
import {LanguageSwitcher} from '@/components/i18n/locale-provider';
import { useState } from "react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { loginDestination } from "@/lib/account/redirect";
import {companion,onboardingDestination,pendingOnboardingKey} from "@/lib/account/onboarding";
export default function Login() {
  const locale=useLocale();
  const [next, setNext] = useState('/'),[onboarding,setOnboarding]=useState(false),[hero,setHero]=useState<string>('');
  const c={zh:{tag:'伙伴已选好 · 先保存你的进度',title:'创建账户，开启第一场冒险。',text:'你需要一个账户来保存学习进度和预判。注册或登录后，将直接开始新手引导。',chosen:'已选伙伴'},en:{tag:'HERO CHOSEN · SAVE YOUR PROGRESS',title:'Create your account. Begin your quest.',text:'You need an account to save your learning progress and predictions. Sign up or sign in to begin the guided quest.',chosen:'Your companion'},fr:{tag:'PARTENAIRE CHOISI · GARDEZ VOTRE PROGRESSION',title:'Créez votre compte. Lancez votre quête.',text:'Vous avez besoin d’un compte pour sauvegarder votre progression et vos prévisions. Inscrivez-vous ou connectez-vous pour commencer le guide.',chosen:'Votre partenaire'}}[locale];
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    let destination=loginDestination(params.get('next'));
    try{const pending=companion(localStorage.getItem(pendingOnboardingKey));if(!params.has('next')&&pending)destination=onboardingDestination(pending)}catch{}
    const url=new URL(destination,location.origin);setNext(destination);setOnboarding(url.searchParams.get('onboarding')==='1');setHero(companion(url.searchParams.get('hero'))==='female'?(locale==='zh'?'星澜':'Astra'):(locale==='zh'?'查理':'SuperCharlie'));
    if (params.has('error')) setError(params.get('error') === 'google_unavailable'
      ? 'Google sign-in is temporarily unavailable. You can use an email link below.'
      : 'Google sign-in was canceled or expired. Please try again.');
  }, [locale]);
  return <LocalizeTree>{(
    <main className="auth-screen"><LanguageSwitcher/>
      <a className="brand" href="/">
        <img src="/brand/monetizable-curious-m.svg" width="44" height="44" alt="" />
        Monetizable
      </a>
      <section className="auth-card">
        <span className="eyebrow">{onboarding?c.tag:"YOUR NEXT LEVEL STARTS HERE"}</span>{onboarding&&<p className="auth-chosen-hero">✦ {c.chosen} · {hero}</p>}
        <h1>
          {onboarding?c.title:<>Invest in your<br/><em>understanding.</em></>}
        </h1>
        <p>
          {onboarding?c.text:'You need an account to save your learning progress. Sign in or create one to keep your discoveries and predictions across devices.'}
        </p>
        <a className="google-sign-in" href={'/api/auth/google?next=' + encodeURIComponent(next)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.6Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2 .9-3.4.9-2.6 0-4.9-1.8-5.7-4.2H2.9v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.3 13.7a6 6 0 0 1 0-3.4V7.7H2.9a10 10 0 0 0 0 8.6l3.4-2.6Z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9.1 5.7l3.4 2.6C7.1 7.9 9.4 6.1 12 6.1Z"/></svg>
          Continue with Google
        </a>
        <p className="auth-google-caption">Sign up or sign in to Monetizable with your Google / Gmail account.</p>
        <div className="auth-divider"><span>or use an email link</span></div>
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
                  body: JSON.stringify({ email, next }),
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
        <p className="small-text"><a href="/privacy">Privacy notice</a> · Google sign-in uses only your basic profile and email.</p>
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
  )}</LocalizeTree>;
}
