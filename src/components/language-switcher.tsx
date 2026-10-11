"use client";

import { useLocale } from "@/components/localization-provider";
import { localeNames, locales, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale: _locale }: { locale?: Locale }) {
  const locale = useLocale();
  return <label className="inline-flex items-center">
    <span className="sr-only">{locale === "fr" ? "Langue" : "Language"}</span>
    <select
      aria-label={locale === "fr" ? "Langue" : "Language"}
      className="rounded-full border border-[var(--gold)] bg-white px-3 py-1.5 text-xs font-black text-black shadow-sm outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
      value={locale}
      onChange={(event) => {
        document.cookie = `monetizable_locale=${event.target.value}; Path=/; Max-Age=31536000; SameSite=Lax`;
        // Reload all server and client state, including saved report data.
        window.location.reload();
      }}
    >
      {locales.map((value) => <option key={value} value={value}>{localeNames[value]}</option>)}
    </select>
  </label>;
}

