"use client";
import { useEffect, useState, type ReactNode } from "react";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import AnalyticsTracker from "@/components/account/analytics";
import PwaPushGuide from "@/components/pwa/pwa-push-guide";
import type { AppLocale } from "@/lib/i18n/locale";

/** English on the server so public pages can be prerendered. A saved language applies after paint. */
export function DocumentLocale({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<AppLocale>("en");
  useEffect(() => {
    const saved = document.cookie.match(/(?:^|; )monetizable-locale=(en|fr|zh)/)?.[1] as AppLocale | undefined;
    if (saved && saved !== "en") setLocale(saved);
  }, []);
  return (
    <LocaleProvider locale={locale}>
      {children}
      <AnalyticsTracker />
      <PwaPushGuide />
    </LocaleProvider>
  );
}
