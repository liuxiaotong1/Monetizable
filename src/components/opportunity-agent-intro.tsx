import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

const copy: Record<Locale, {
  eyebrow: string; title: string; body: string; quote: string;
  steps: [string, string][]; cta: string; note: string;
}> = {
  en: {
    eyebrow: "Meet SuperCharlie · Your opportunity explorer",
    title: "Small skills. Bigger horizons.",
    body: "You’ve got a unique mix of skills. Charlie helps you see where they can take you next.",
    quote: "Clarity turns your skills into a path.",
    steps: [["Ready", "Here to guide your next step."], ["Thinking", "Looking at the big picture for you."], ["Found a match", "There’s something worth a closer look."]],
    cta: "Discover my skill stack", note: "Your skills. A brighter tomorrow.",
  },
  fr: {
    eyebrow: "Voici SuperCharlie · Votre explorateur d’opportunités",
    title: "Vos talents. De nouveaux horizons.",
    body: "Vos compétences forment une combinaison unique. Charlie vous aide à découvrir où elles peuvent vous mener.",
    quote: "La clarté transforme vos compétences en un chemin.",
    steps: [["Prêt", "À vos côtés pour la prochaine étape."], ["En réflexion", "Je prends du recul pour vous aider."], ["Une piste trouvée", "Une opportunité mérite votre attention."]],
    cta: "Découvrir mes compétences", note: "Vos compétences. Un avenir plus prometteur.",
  },
  de: {
    eyebrow: "Das ist SuperCharlie · Ihr Chancenentdecker", title: "Ihre Talente. Neue Horizonte.",
    body: "Ihre Fähigkeiten bilden eine einzigartige Kombination. Charlie hilft Ihnen, neue Wege damit zu entdecken.",
    quote: "Klarheit macht aus Fähigkeiten einen Weg.",
    steps: [["Bereit", "An Ihrer Seite beim nächsten Schritt."], ["Am Nachdenken", "Das große Ganze für Sie im Blick."], ["Eine Chance gefunden", "Das verdient einen genaueren Blick."]],
    cta: "Meine Fähigkeiten entdecken", note: "Ihre Fähigkeiten. Eine neue Perspektive.",
  },
  es: {
    eyebrow: "Conoce a SuperCharlie · Tu explorador de oportunidades", title: "Tus talentos. Nuevos horizontes.",
    body: "Tienes una combinación única de habilidades. Charlie te ayuda a descubrir adónde pueden llevarte.",
    quote: "La claridad convierte tus habilidades en un camino.",
    steps: [["Listo", "Aquí para guiar tu próximo paso."], ["Pensando", "Mirando el panorama completo para ti."], ["Una oportunidad", "Hay algo que merece una mirada más cercana."]],
    cta: "Descubrir mis habilidades", note: "Tus habilidades. Un futuro más prometedor.",
  },
  it: {
    eyebrow: "Ecco SuperCharlie · Il tuo esploratore di opportunità", title: "I tuoi talenti. Nuovi orizzonti.",
    body: "Hai una combinazione unica di competenze. Charlie ti aiuta a scoprire dove possono portarti.",
    quote: "La chiarezza trasforma le competenze in un percorso.",
    steps: [["Pronto", "Qui per guidare il tuo prossimo passo."], ["Sto pensando", "Guardo il quadro completo per te."], ["Una possibilità", "C’è qualcosa che merita uno sguardo più attento."]],
    cta: "Scoprire le mie competenze", note: "Le tue competenze. Un futuro più luminoso.",
  },
  zh: {
    eyebrow: "认识 SuperCharlie · 你的机会探索者", title: "小小技能，更大天地。",
    body: "你的技能组合独一无二。Charlie 帮你发现，它们还能带你走向哪里。",
    quote: "让能力清晰，让前路可见。",
    steps: [["准备好了", "陪你迈出下一步。"], ["思考中", "为你梳理更完整的可能。"], ["发现机会", "这里有值得仔细看看的新机会。"]],
    cta: "发现我的技能组合", note: "你的技能，更多可能。",
  },
};

export function OpportunityAgentIntro({ locale }: { locale: Locale }) {
  const text = copy[locale];
  return <section className="border-y border-black/10 bg-[#f8f5ee] py-14 md:py-20" aria-labelledby="opportunity-agent-title" data-charlie="scout-introduction">
    <div className="shell">
      <div className="grid items-center gap-8 lg:grid-cols-[.85fr_1.15fr] lg:gap-16">
        <div className="relative mx-auto w-full max-w-[420px]">
          <div aria-hidden="true" className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,#efdfb6_0%,transparent_70%)]" />
          <Image src="/supercharlie-scout.png" alt="SuperCharlie Scout holding a compass and map" width={1254} height={1254} sizes="(max-width: 767px) 85vw, 420px" className="relative h-auto w-full" />
          <p className="mt-2 text-center text-xs font-bold uppercase tracking-[.2em] text-[var(--gold-deep)]">{text.note}</p>
        </div>
        <div>
          <div className="eyebrow text-[var(--gold-deep)]">{text.eyebrow}</div>
          <h2 id="opportunity-agent-title" className="editorial-title mt-5 max-w-2xl text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.06]">{text.title}</h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-black/65">{text.body}</p>
          <blockquote className="my-7 border-l-2 border-[var(--gold)] pl-5 font-serif text-xl leading-8 text-black/75">{text.quote}</blockquote>
          <Link href="#analyze" className="button gold-surface border-[var(--gold)] text-black">{text.cta} <span aria-hidden="true">→</span></Link>
        </div>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3" data-charlie="scout-states">
        {text.steps.map(([title, body], index) => <article key={title} className="flex items-center gap-3 rounded-3xl border border-black/10 bg-white/70 p-4 lg:gap-4 lg:p-5">
          <Image src={`/supercharlie-scout-${["ready", "thinking", "found"][index]}.png`} alt="" width={1024} height={1024} sizes="(max-width: 767px) 120px, (max-width: 1023px) 88px, 128px" className="h-auto w-[120px] shrink-0 object-contain md:w-[88px] lg:w-[128px]" />
          <div className="min-w-0"><h3 className="font-serif text-xl font-bold leading-tight">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-black/60">{body}</p></div>
        </article>)}
      </div>
    </div>
  </section>;
}
