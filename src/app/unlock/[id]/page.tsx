import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { analysisBelongsToUser, getAnalysis } from "@/lib/storage";
import { canBuildSkillStack } from "@/lib/skill-stack-access";
import { formatPrice } from "@/lib/config";
import { getRequestLocale } from "@/lib/request-locale";
import { Header } from "@/components/brand";
import { SkillStackUnlock } from "@/components/skill-stack-unlock";

export const dynamic = "force-dynamic";

export default async function UnlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/unlock/${id}`)}`);
  if (!await analysisBelongsToUser(id, user.id) || !await getAnalysis(id)) notFound();
  if (await canBuildSkillStack(user.id, id)) redirect("/agent?setup=intent");
  const locale = await getRequestLocale();
  const french = locale === "fr";
  return <main className="min-h-screen pb-20"><Header locale={locale}/><section className="shell pt-12"><div className="card mx-auto max-w-3xl p-8 md:p-12">
    <div className="eyebrow">{french ? "DÉBLOCAGE · PAIEMENT UNIQUE" : "ONE-TIME UNLOCK"}</div>
    <h1 className="editorial-title mt-5 text-4xl">{french ? "Construisez votre combinaison de compétences et préparez votre prospection" : "Build my personal skill stack and outreach"}</h1>
    <p className="mt-5 leading-7 text-black/65">{french ? "Débloquez la sélection de compétences et la préparation de votre prospection pour cette analyse. Votre analyse reste accessible gratuitement." : "Unlock skill-stack selection and outreach preparation for this analysis. Your analysis remains available to read for free."}</p>
    <p className="mt-4 text-sm text-black/60">{french ? "Paiement unique, sans renouvellement automatique. La prospection est encore en développement ; aucun message n’est envoyé sans votre accord. Les limites d’utilisation de SuperCharlie restent applicables." : "One payment, no automatic renewal. Outreach is still being developed; no messages are sent without your approval. Existing SuperCharlie usage limits still apply."}</p>
    <SkillStackUnlock analysisId={id} price={formatPrice()} french={french}/>
    <a href={`/preview/${id}`} className="mt-6 inline-block underline">{french ? "Revenir à mon analyse" : "Back to my analysis"}</a>
  </div></section></main>;
}
