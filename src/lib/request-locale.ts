import { cookies, headers } from "next/headers";
import { isLocale, localeForRequest, type Locale } from "@/lib/i18n";

export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const contentLanguage = headerStore.get("x-monetizable-content-language") ?? undefined;
  if (isLocale(contentLanguage)) return contentLanguage;
  const selected = cookieStore.get("monetizable_locale")?.value;
  if (isLocale(selected)) return selected;
  return localeForRequest(
    headerStore.get("x-vercel-ip-country") ?? headerStore.get("cf-ipcountry"),
    headerStore.get("accept-language"),
  );
}
