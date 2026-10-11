
import { Localized } from "@/components/localized";
import { SuccessClient } from "@/components/success-client";
import { getRequestLocale } from "@/lib/request-locale";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const locale = await getRequestLocale();
  return <Localized><SuccessClient sessionId={session_id ?? ""} locale={locale}/></Localized>;
}
