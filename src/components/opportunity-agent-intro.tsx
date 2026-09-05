import Link from "next/link";
import type { Locale } from "@/lib/i18n";

const copy: Record<Locale, {
  eyebrow: string;
  title: string;
  body: string;
  features: string[];
  cta: string;
}> = {
  en: {
    eyebrow: "SuperCharlie · working 24h",
    title: "A sellable offer is only useful when the right buyers keep seeing it",
    body: "SuperCharlie packages what you do best, monitors fresh buyer signals, finds relevant decision-makers, and helps with outreach—or sends it directly when you authorize it",
    features: ["Fresh market signals checked every day", "Freelance, contract, consulting, fractional and buyer demand", "Personalize your capacities", "Direct outreach for selected opportunities—with your approval"],
    cta: "Package and outreach now",
  },
  fr: {
    eyebrow: "SuperCharlie · 24 h/24",
    title: "Une offre vendable ne sert que si les bons acheteurs la voient régulièrement",
    body: "SuperCharlie structure ce que vous faites de mieux, surveille les signaux d’achat, trouve les décideurs pertinents et vous aide à les contacter—ou agit directement avec votre autorisation",
    features: ["Nouveaux signaux vérifiés chaque jour", "Freelance, contrat, conseil, fractional et demande latente", "Personnalisez vos capacités", "Outreach direct pour certaines opportunités—avec votre accord"],
    cta: "Packager et lancer l’outreach",
  },
  de: {
    eyebrow: "SuperCharlie · 24h",
    title: "Ein verkaufbares Angebot wirkt nur, wenn die richtigen Käufer es immer wieder sehen",
    body: "SuperCharlie verpackt Ihre stärksten Fähigkeiten, überwacht Kaufsignale, findet passende Entscheider und hilft bei der Kontaktaufnahme—oder übernimmt sie mit Ihrer Freigabe",
    features: ["Jeden Tag neue Marktsignale", "Freelance, Vertrag, Beratung, Fractional und Käufernachfrage", "Kapazitäten personalisieren", "Direkte Kontaktaufnahme für ausgewählte Chancen—mit Ihrer Freigabe"],
    cta: "Angebot und Outreach starten",
  },
  es: {
    eyebrow: "SuperCharlie · 24 h",
    title: "Una oferta vendible solo funciona cuando los compradores adecuados siguen viéndola",
    body: "SuperCharlie presenta lo que mejor haces, monitoriza señales de compra, encuentra decisores y te ayuda con el contacto—o lo ejecuta con tu autorización",
    features: ["Nuevas señales de mercado cada día", "Freelance, contratos, consultoría, fractional y demanda latente", "Personaliza tus capacidades", "Outreach directo para oportunidades seleccionadas—con tu aprobación"],
    cta: "Empaquetar e iniciar outreach",
  },
  it: {
    eyebrow: "SuperCharlie · 24 ore",
    title: "Un’offerta vendibile funziona solo se continua a raggiungere gli acquirenti giusti",
    body: "SuperCharlie presenta ciò che sai fare meglio, monitora i segnali d’acquisto, trova i decisori e ti aiuta nei contatti—o li esegue con la tua autorizzazione",
    features: ["Nuovi segnali di mercato ogni giorno", "Freelance, contratti, consulenza, fractional e domanda latente", "Personalizza le tue capacità", "Outreach diretto per opportunità selezionate—con la tua approvazione"],
    cta: "Crea l’offerta e avvia l’outreach",
  },
  zh: {
    eyebrow: "SuperCharlie · 24 小时",
    title: "Offer 包装好只是第一步，还要持续出现在正确买方面前",
    body: "SuperCharlie 帮你包装最擅长的能力、扫描市场、找到相关决策者，并协助 outreach；获得授权后也可直接执行",
    features: ["每天检查新的市场信号", "覆盖 freelance、contract、consulting、fractional 和潜在买方需求", "个性化组合你的能力", "经你批准后，为部分机会执行 direct outreach"],
    cta: "立即包装能力并开始 outreach",
  },
};

export function OpportunityAgentIntro({ locale }: { locale: Locale }) {
  const text = copy[locale];
  return <section className="border-y border-black bg-black py-14 text-white md:py-20" aria-labelledby="opportunity-agent-title">
    <div className="shell grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
      <div>
        <div className="eyebrow text-[var(--gold-bright)]">{text.eyebrow}</div>
        <h2 id="opportunity-agent-title" className="display mt-4 max-w-3xl text-3xl leading-[1.05] md:text-5xl">{text.title}</h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 md:text-lg">{text.body}</p>
      </div>
      <div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {text.features.map((feature) => <div key={feature} className="flex gap-3 border-t border-white/18 pt-3 text-sm font-bold leading-6"><span className="text-[var(--gold-bright)]">✓</span><span>{feature}</span></div>)}
        </div>
        <div className="mt-7"><Link href="#analyze" className="button gold-surface border-[var(--gold-bright)] text-black">{text.cta} <span>→</span></Link></div>
      </div>
    </div>
  </section>;
}
