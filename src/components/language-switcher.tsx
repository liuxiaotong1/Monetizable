"use client";

import { useRouter } from "next/navigation";
import { localeNames, locales, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  return <label className="inline-flex items-center">
    <span className="sr-only">Language</span>
    <select
      aria-label="Language"
      className="rounded-full border border-[var(--gold)] bg-white px-3 py-1.5 text-xs font-black text-black shadow-sm outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
      value={locale}
      onChange={(event) => {
        document.cookie = `monetizable_locale=${event.target.value}; Path=/; Max-Age=31536000; SameSite=Lax`;
        router.refresh();
      }}
    >
      {locales.map((value) => <option key={value} value={value}>{localeNames[value]}</option>)}
    </select>
  </label>;
}

