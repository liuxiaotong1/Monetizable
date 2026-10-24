"use client";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import type { AppLocale } from "@/lib/i18n/locale";
import {
  applyCookieChoice,
  readCookieChoice,
  startClarity,
  type CookieChoice,
} from "@/lib/clarity";
import "./cookie-consent.css";

const copy: Record<AppLocale, { text: string; accept: string; refuse: string; more: string; manage: string; close: string; label: string }> = {
  en: {
    label: "Cookies",
    text: "Microsoft Clarity measures how the site is used and masks sensitive content. It loads only after you agree.",
    accept: "Accept",
    refuse: "Refuse",
    more: "Privacy notice",
    manage: "Cookies",
    close: "Close",
  },
  fr: {
    label: "Cookies",
    text: "Microsoft Clarity mesure l’usage du site et masque les contenus sensibles. Il ne se charge qu’après votre accord.",
    accept: "Accepter",
    refuse: "Refuser",
    more: "Avis de confidentialité",
    manage: "Gérer les cookies",
    close: "Fermer",
  },
  zh: {
    label: "Cookie",
    text: "Microsoft Clarity 用于了解网站使用情况，并遮盖敏感内容。只有在您同意后才会加载。",
    accept: "接受",
    refuse: "拒绝",
    more: "隐私说明",
    manage: "管理 Cookie",
    close: "关闭",
  },
};

export function CookieSettingsLink() {
  const c = copy[useLocale()];
  return (
    <button type="button" className="cookie-settings-link" onClick={() => window.dispatchEvent(new Event("monetizable-cookie-settings"))}>
      {c.manage}
    </button>
  );
}

export function CookieBanner({
  locale,
  choice,
  onChoose,
  onClose,
}: {
  locale: AppLocale;
  choice: CookieChoice | null;
  onChoose: (choice: CookieChoice) => void;
  onClose: () => void;
}) {
  const c = copy[locale];
  return (
    <div className="cookie-banner" role="region" aria-label={c.label}>
      <p>{c.text}</p>
      <div className="cookie-banner-actions">
        <button type="button" className="cookie-choice" onClick={() => onChoose("granted")}>{c.accept}</button>
        <button type="button" className="cookie-choice" onClick={() => onChoose("denied")}>{c.refuse}</button>
      </div>
      <p className="cookie-banner-links">
        <a href="/privacy">{c.more}</a>
        {choice && <button type="button" className="cookie-dismiss" onClick={onClose}>{c.close}</button>}
      </p>
    </div>
  );
}

export default function CookieConsent() {
  const locale = useLocale();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<CookieChoice | null>(null);

  useEffect(() => {
    const stored = readCookieChoice();
    setChoice(stored);
    setOpen(stored === null);
    setReady(true);
    if (stored === "granted") startClarity();
    const reopen = () => setOpen(true);
    window.addEventListener("monetizable-cookie-settings", reopen);
    return () => window.removeEventListener("monetizable-cookie-settings", reopen);
  }, []);

  if (!ready || !open) return null;
  return (
    <CookieBanner
      locale={locale}
      choice={choice}
      onChoose={(next) => {
        applyCookieChoice(next);
        setChoice(next);
        setOpen(false);
      }}
      onClose={() => setOpen(false)}
    />
  );
}
