
import { Localized } from "@/components/localized";
import { AgentActivation } from "@/components/agent-activation";
import { Header } from "@/components/brand";
import { getRequestLocale } from "@/lib/request-locale";

export default async function AgentActivatePage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const locale = await getRequestLocale();
  const { session_id } = await searchParams;
  return <Localized><main className="min-h-screen"><Header locale={locale}/><section className="shell grid min-h-[70vh] place-items-center py-16"><AgentActivation sessionId={session_id ?? ""}/></section></main></Localized>;
}
