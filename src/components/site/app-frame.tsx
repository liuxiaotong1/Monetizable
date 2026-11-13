import "server-only";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { currentUser, isAdmin } from "@/lib/account/auth";
import { requestLocale } from "@/lib/i18n/server-locale";
import { rememberAccountLocale } from "@/lib/push/account-locale";
import { internalCookie } from "@/lib/marketing/attribution";

/** Signed-in and account pages. Public marketing routes stay outside this so they can be cached. */
export async function AppFrame({ children }: { children: ReactNode }) {
  const user = await currentUser();
  const admin = isAdmin(user);
  const locale = await requestLocale(admin);
  if (user) {
    try { await rememberAccountLocale(user.id, locale); } catch { /* The page still opens if account storage is briefly unavailable. */ }
  }
  if (admin) {
    try {
      const jar = await cookies();
      if (jar.get(internalCookie)?.value !== "1") {
        jar.set(internalCookie, "1", { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
      }
    } catch { /* The analytics cookie can be set on the next account request. */ }
  }
  const lang = locale === "zh" ? "zh-CN" : locale;
  return (
    <LocaleProvider locale={locale}>
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=${JSON.stringify(lang)}` }} />
      {children}
    </LocaleProvider>
  );
}
