
import { Localized } from "@/components/localized";
import { PreviewClient } from "@/components/preview-client";
import { config } from "@/lib/config";
import { currentUser } from "@/lib/auth";
import { getRequestLocale } from "@/lib/request-locale";
import { redirect } from "next/navigation";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale, user] = await Promise.all([params, getRequestLocale(), currentUser()]);
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/preview/${id}`)}`);
  return <Localized><PreviewClient id={id} weeklyPriceCents={config.agentWeeklyPriceCents} monthlyPriceCents={config.agentMonthlyPriceCents} locale={locale} /></Localized>;
}
