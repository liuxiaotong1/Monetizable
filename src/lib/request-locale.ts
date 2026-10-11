import { cookies, headers } from "next/headers";
import { isLocale, localeForRequest, type SupportedLocale } from "@/lib/i18n";

export async function getRequestLocale(): Promise<SupportedLocale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const selected = cookieStore.get("monetizable_locale")?.value;
  if (isLocale(selected)) return selected;
  return localeForRequest(
    headerStore.get("x-vercel-ip-country") ?? headerStore.get("cf-ipcountry"),
    headerStore.get("accept-language"),
  );
}
