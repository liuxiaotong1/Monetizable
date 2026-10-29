"use client";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { consentCopy } from "@/lib/newsletter/copy";
import type { NewsletterLocale, NewsletterStatus } from "@/lib/newsletter/policy";

const labels = {
  en: {
    title: "Practice newsletter",
    signIn: "Sign in to choose the newsletter",
    pending: "Check your inbox and confirm the email. The newsletter starts after that confirmation.",
    subscribed: "You are subscribed. Each message includes an unsubscribe link.",
    blocked: "This address cannot receive the newsletter.",
    unsubscribed: "You are unsubscribed.",
    language: "Newsletter language",
    save: "Save newsletter choice",
    resend: "Resend confirmation",
    cancel: "Cancel the confirmation request",
    saving: "Saving…",
    saved: "Newsletter choice saved.",
    unavailable: "Newsletter settings are temporarily unavailable.",
  },
  fr: {
    title: "Lettre d’information",
    signIn: "Connectez-vous pour choisir la lettre d’information",
    pending: "Ouvrez votre boîte mail et confirmez le message. La lettre commence après cette confirmation.",
    subscribed: "Votre inscription est active. Chaque message contient un lien de désabonnement.",
    blocked: "Cette adresse ne peut pas recevoir la lettre d’information.",
    unsubscribed: "Vous êtes désabonné.",
    language: "Langue de la lettre",
    save: "Enregistrer ce choix",
    resend: "Renvoyer la confirmation",
    cancel: "Annuler la demande de confirmation",
    saving: "Enregistrement…",
    saved: "Choix enregistré.",
    unavailable: "Les réglages de la lettre sont temporairement indisponibles.",
  },
  zh: {
    title: "练习通讯",
    signIn: "登录后选择是否接收通讯",
    pending: "请打开邮箱并确认那封邮件。确认之后才会开始发送通讯。",
    subscribed: "你已订阅。每封邮件都包含退订链接。",
    blocked: "这个地址无法接收通讯。",
    unsubscribed: "你已退订。",
    language: "通讯语言",
    save: "保存通讯选择",
    resend: "重发确认邮件",
    cancel: "取消确认请求",
    saving: "正在保存…",
    saved: "通讯选择已保存。",
    unavailable: "通讯设置暂时不可用。",
  },
} as const;

type Subscription = { signedIn?: boolean; status?: NewsletterStatus | null; locale?: NewsletterLocale | null; error?: string };

export default function NewsletterSettings() {
  const siteLocale = useLocale();
  const text = labels[siteLocale];
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [status, setStatus] = useState<NewsletterStatus | null>(null);
  const [optIn, setOptIn] = useState(false);
  const [locale, setLocale] = useState<NewsletterLocale>(siteLocale);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/newsletter/subscription", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() as Subscription }))
      .then(({ response, data }) => {
        if (!active) return;
        setSignedIn(Boolean(data.signedIn));
        if (!response.ok) { setNote(data.error || text.unavailable); setLoaded(true); return; }
        setStatus(data.status ?? null);
        setOptIn(data.status === "subscribed");
        if (data.locale) setLocale(data.locale);
        setLoaded(true);
      })
      .catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  async function save() {
    setBusy(true);
    setNote("");
    try {
      const response = await fetch("/api/newsletter/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn, locale }),
      });
      const data = await response.json() as { status?: NewsletterStatus; error?: string };
      if (!response.ok) {
        setNote(data.error || text.unavailable);
        return;
      }
      setStatus(data.status ?? (optIn ? "pending" : "unsubscribed"));
      setOptIn(data.status === "subscribed");
      setNote(text.saved);
    } catch {
      setNote(text.unavailable);
    } finally {
      setBusy(false);
    }
  }

  const detail = !signedIn ? "" : status === "pending" ? text.pending : status === "subscribed" ? text.subscribed : status === "bounced" || status === "complained" ? text.blocked : status === "unsubscribed" ? text.unsubscribed : "";

  return (
    <div className="settings-section" translate="no">
      <h3>{text.title}</h3>
      {!loaded ? <p className="muted small-text">{text.saving}</p> : !signedIn ? <p className="muted small-text"><a href="/auth">{text.signIn}</a></p> : <>
        <label className="toggle-row" htmlFor="newsletter-opt-in">
          <div><strong>{consentCopy[locale]}</strong></div>
          <input id="newsletter-opt-in" type="checkbox" checked={optIn} onChange={(event) => setOptIn(event.target.checked)} />
        </label>
        <label className="field-label" htmlFor="newsletter-locale">{text.language}</label>
        <select id="newsletter-locale" value={locale} onChange={(event) => setLocale(event.target.value as NewsletterLocale)}>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="zh">中文</option>
        </select>
        {detail && <p className="muted small-text" role="status">{detail}</p>}
        <button type="button" className="secondary full" disabled={busy || status === "bounced" || status === "complained"} onClick={() => void save()}>
          {busy ? text.saving : status === "pending" && optIn ? text.resend : status === "pending" ? text.cancel : text.save}
        </button>
        {note && <p className="muted small-text" role="status">{note}</p>}
      </>}
    </div>
  );
}
