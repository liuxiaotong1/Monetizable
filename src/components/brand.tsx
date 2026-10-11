
import { Localized } from "@/components/localized";
import Image from "next/image";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getMessages, type Locale } from "@/lib/i18n";

const agentLoginLabel: Record<Locale, string> = {
  en: "Log in / Sign up",
  fr: "Connexion / Inscription",
  de: "Anmelden / Registrieren",
  es: "Entrar / Registrarse",
  it: "Accedi / Registrati",
  zh: "登录 / 注册",
};

export function Brand({ href = "/" }: { href?: string }) {
  return <Localized><Link href={href} className="inline-flex items-center gap-2" aria-label="Monetizable home"><Image src="/monetizable-mark.svg" alt="" width={30} height={30} className="h-[30px] w-[30px] shrink-0" priority/><span className="gold-text text-[1.15rem] font-black tracking-[-.04em]">Monetizable.</span></Link></Localized>;
}

export function Header({ compact = false, locale = "en", accountEmail }: { compact?: boolean; locale?: Locale; accountEmail?: string | null }) {
  const blogUrl = process.env.NEXT_PUBLIC_BLOG_NAV_URL ?? "/blog";
  const copy = getMessages(locale);
  return <Localized><header className={`shell flex items-center justify-between ${compact ? "py-6" : "py-6 md:py-8"}`}><Brand /><nav aria-label="Main navigation" className="flex items-center gap-2 md:gap-5"><Link href={blogUrl} className="hidden text-sm font-black underline-offset-4 hover:underline md:inline">{copy.insights}</Link><Link href="/guides" className="hidden text-sm font-black underline-offset-4 hover:underline sm:inline">{copy.guides}</Link><Link href="/for-companies" className="hidden text-sm font-black underline-offset-4 hover:underline lg:inline">For Companies</Link><Link href="/faq" className="hidden text-sm font-black underline-offset-4 hover:underline md:inline">{copy.faq}</Link><div className="eyebrow hidden items-center gap-2 xl:flex"><span className="h-2 w-2 rounded-full bg-[var(--gold)]" /> {copy.liveMarket}</div><Link href="/auth?next=/agent" className="max-w-44 truncate rounded-full border border-[var(--gold)] bg-[var(--gold-soft)] px-3 py-2 text-xs font-black text-black transition-transform hover:-translate-y-0.5" aria-label={accountEmail ? `Signed in as ${accountEmail}` : agentLoginLabel[locale]} title={accountEmail ?? undefined}><span className="hidden sm:inline">{accountEmail ?? agentLoginLabel[locale]}</span><span className="sm:hidden">{accountEmail ? "Account" : "Login"}</span></Link><LanguageSwitcher locale={locale}/></nav></header></Localized>;
}
