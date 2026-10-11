"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";

const TranslationsContext = createContext<Record<string, string>>({});
export function DisplayTranslations({ translations, children }: { translations: Record<string, string>; children: ReactNode }) {
  return <TranslationsContext.Provider value={translations}>{children}</TranslationsContext.Provider>;
}
export function useDisplayTranslations() { return useContext(TranslationsContext); }

const LocaleContext = createContext<Locale>("en");
export function LocalizationProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
export function useLocale() { return useContext(LocaleContext); }
