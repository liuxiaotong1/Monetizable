"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/brand";
import { CapabilityGraph } from "@/components/capability-graph";
import { OpportunityAgentIntro } from "@/components/opportunity-agent-intro";
import { SuperCharlieCompanion } from "@/components/supercharlie-companion";
import { discoveryAttribution, trackClient } from "@/lib/client-analytics";
import { candidateConsentCopy, getMessages, type Locale } from "@/lib/i18n";
import { submitAnalysis } from "@/lib/client-analysis";

type HomepageGuide = {
  slug: string;
  title: string;
  description: string;
};

type HomepagePost = HomepageGuide & {
  heroImage: string;
  publishedLabel: string;
  readTime: number;
};

const homepageText = (value: string) => value.replace(/[.。]+$/, "");

export function Funnel({ guides, posts, locale, welcome = false }: { guides: HomepageGuide[]; posts: HomepagePost[]; locale: Locale; welcome?: boolean }) {
  const router = useRouter();
  const copy = getMessages(locale);
  const fileRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"upload" | "location" | "loading">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [text, setText] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [candidateConsent, setCandidateConsent] = useState(false);
  const [consentAttention, setConsentAttention] = useState(false);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [cityRequired, setCityRequired] = useState(false);
  const [locationService, setLocationService] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [preservedEvidence, setPreservedEvidence] = useState<unknown[]>([]);
  const [loadingIndex, setLoadingIndex] = useState(0);
  useEffect(() => { trackClient("landing_view", discoveryAttribution(window.location.href, document.referrer)); }, []);
  useEffect(() => {
    if (!welcome) return;
    document.getElementById("analyze")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [welcome]);
  useEffect(() => {
    if (stage !== "loading") return;
    const interval = setInterval(() => setLoadingIndex((value) => Math.min(value + 1, 4)), 2400);
    return () => clearInterval(interval);
  }, [stage]);
  const ready = useMemo(() => Boolean(file || linkedinUrl.trim() || text.trim()), [file, linkedinUrl, text]);

  function startAnalysis() {
    if (!ready) { setError(copy.addInputError); return; }
    if (!candidateConsent) {
      setConsentAttention(true);
      consentRef.current?.focus();
      return;
    }
    if (linkedinUrl.trim() && !/^https:\/\/(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/in\/[^/?#]+\/?(?:[?#].*)?$/i.test(linkedinUrl.trim())) { setError(copy.linkedinError); return; }
    setError(""); setErrorCode(""); trackClient("upload_completed", { methods: [linkedinUrl && "linkedin", file && "file", text && "manual"].filter(Boolean) });
    void analyze(false);
  }

  async function analyze(withLocation = stage === "location") {
    if (withLocation && !country.trim()) { setError(copy.countryRequired); return; }
    if (withLocation && cityRequired && !city.trim()) { setError(copy.cityRequired); return; }
    setError(""); setErrorCode(""); setStage("loading");
    if (withLocation) trackClient("context_completed", { reason: "location_sensitive_recommendation" });
    const form = new FormData();
    if (file) form.set("file", file);
    form.set("text", text);
    form.set("linkedinUrl", linkedinUrl);
    form.set("preservedEvidence", JSON.stringify(preservedEvidence));
    form.set("locale", locale);
    form.set("candidateConsent", String(candidateConsent));
    form.set("context", JSON.stringify({ country: country || undefined, city: city || undefined, workMode: withLocation ? (cityRequired ? "local" : "regional_remote") : "global_remote" }));
    try {
      const response = await submitAnalysis(form);
      const data = response.data;
      if (!response.ok) {
        setError(data.error ?? copy.analysisError);
        setErrorCode(data.code ?? "");
        if (data.code === "LOCATION_REQUIRED") {
          setCityRequired(Boolean(data.details?.cityRequired));
          setLocationService(String(data.details?.serviceName ?? "this recommendation"));
          setStage("location");
          return;
        }
        if (data.code === "PROFILE_INSUFFICIENT" && Array.isArray(data.details?.profile?.rawEvidence)) setPreservedEvidence(data.details.profile.rawEvidence);
        setStage(withLocation && data.code !== "ANALYSIS_NOT_CONFIGURED" ? "location" : "upload");
        if (data.code === "PROFILE_INSUFFICIENT") setPasteOpen(true);
        return;
      }
      const analysisId = data.preview?.analysisId;
      if (!analysisId) throw new Error(copy.analysisError);
      sessionStorage.setItem(`monetizable:preview:${analysisId}`, JSON.stringify(data.preview));
      if (data.recoveryToken) sessionStorage.setItem(`monetizable:recovery:${analysisId}`, data.recoveryToken);
      router.push(`/preview/${analysisId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.analysisError);
      setStage(withLocation ? "location" : "upload");
    }
  }

  if (stage === "loading") return <LoadingState index={loadingIndex} locale={locale} />;
  return <main className="min-h-screen overflow-hidden">
    <Header locale={locale} />
    {stage === "upload" ? <>
      <section className="shell relative grid gap-7 pb-12 pt-2 md:pt-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,.8fr)] lg:items-start lg:gap-24 lg:pb-16">
        <div className="relative pt-2 lg:pt-6">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_170px] lg:items-start lg:gap-5">
            <div>
              <div className="eyebrow mb-5 text-[var(--gold-deep)]">{copy.heroEyebrow}</div>
              <h1 className="display max-w-[680px] text-[clamp(2.35rem,3.3vw,2.65rem)] leading-[1.03]"><span className="block">{homepageText(copy.heroLine1)}</span><span className="block">{homepageText(copy.heroLine2)}</span></h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-black/65 md:text-lg">{homepageText(copy.heroBody)}</p>
            </div>
            <SuperCharlieCompanion placement="homepage" message="Ready to help package your expertise." />
          </div>
          <div className="mt-8 max-w-xl border-l-2 border-[var(--gold)] py-1 pl-5"><p className="text-xl font-black leading-tight">{homepageText(copy.whyTitle)}</p><p className="mt-3 text-base font-medium leading-7 text-black/68">{homepageText(copy.whyBody)}</p></div>
          <div className="mt-9 max-w-xl border-t border-black/15 pt-7">
            <h2 className="text-xl font-black">{copy.how}</h2>
            <div className="mt-5 grid gap-5">
              {[['01',copy.how1Title,copy.how1Body],['02',copy.how2Title,copy.how2Body],['03',copy.how3Title,copy.how3Body]].map(([number,title,description]) => <div key={number} className="grid grid-cols-[2rem_1fr] gap-3"><span className="pt-0.5 text-xs font-black tracking-[.12em] text-[var(--gold-deep)]">{number}</span><div><h3 className="text-base font-black leading-5">{homepageText(title)}</h3><p className="mt-1.5 text-sm leading-6 text-black/60">{homepageText(description)}</p></div></div>)}
            </div>
          </div>
        </div>
        <div id="analyze" className="card relative z-10 p-5 md:p-7">
          {welcome ? <div className="mb-5 rounded-2xl border border-[var(--gold)] bg-[var(--gold-soft)] p-4"><div className="eyebrow text-[var(--gold-deep)]">Account ready · Step 1 of 2</div><p className="mt-2 text-sm font-bold leading-6">Upload your CV to package what you do best. After the analysis, activate SuperCharlie to scan the market and begin authorized outreach.</p></div> : null}
          <div className="gold-surface absolute -right-3 -top-5 hidden rotate-3 rounded-full px-4 py-2 text-[.68rem] font-black uppercase tracking-wider md:block">{copy.noAccount}</div>
          <h2 className="text-xl font-black">{copy.addProfile}</h2>
          <p className="mt-2 text-sm leading-6 text-black/60">{homepageText(copy.publicHelp)}</p>
          <label htmlFor="linkedin-profile-url" className="mt-5 block text-sm font-bold">{copy.linkedinLabel}<input id="linkedin-profile-url" name="linkedinProfileUrl" className="field mt-2 font-normal" type="url" autoComplete="url" value={linkedinUrl} onChange={(event) => { if (!linkedinUrl) trackClient("upload_started", { type: "linkedin" }); setLinkedinUrl(event.target.value); setPreservedEvidence([]); setError(""); setErrorCode(""); }} placeholder="https://www.linkedin.com/in/your-name/" /></label>
          <div className="my-5 flex items-center gap-3 text-xs font-black uppercase tracking-wider text-black/50"><span className="h-px flex-1 bg-[var(--line)]" />{copy.uploadDivider}<span className="h-px flex-1 bg-[var(--line)]" /></div>
          <label htmlFor="cv-upload" className="sr-only">{copy.uploadLabel}</label>
          <input id="cv-upload" name="cv" ref={fileRef} className="sr-only" type="file" aria-describedby="cv-upload-help" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); setError(""); setErrorCode(""); if (selected) trackClient("upload_started", { type: selected.type }); }} />
          <button onClick={() => fileRef.current?.click()} aria-controls="cv-upload" aria-describedby="cv-upload-help" className="noise flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-black/45 bg-[#faf9f6] p-6 text-center" type="button">
            <span className="gold-surface mb-4 grid h-12 w-12 place-items-center rounded-full text-xl">↑</span>
            <strong>{file ? file.name : copy.chooseCv}</strong><span id="cv-upload-help" className="mt-2 text-sm text-black/55">{copy.fileHelp}</span>
          </button>
          <button type="button" onClick={() => setPasteOpen(!pasteOpen)} className="mx-auto mt-4 block text-sm font-bold underline decoration-[var(--gold)] decoration-2 underline-offset-4">{pasteOpen ? copy.hideExperience : copy.pasteInstead}</button>
          {pasteOpen && <label htmlFor="experience-text" className="mt-4 block text-sm font-bold">{copy.experienceLabel}<textarea id="experience-text" name="experienceText" value={text} onChange={(event) => { setText(event.target.value); if (!text) trackClient("upload_started", { type: "text" }); }} className="field mt-2 min-h-36 resize-y font-normal" placeholder={copy.experiencePlaceholder} /></label>}
          {error && <div role="alert" className="mt-4 rounded-xl border border-[var(--gold)] bg-[var(--gold-soft)] p-3 text-sm text-black"><p>{error}</p>{(errorCode === "FILE_PARSE_FAILED" || errorCode === "PROFILE_INSUFFICIENT") && <div className="mt-3 flex flex-wrap gap-3"><button type="button" className="font-black underline" onClick={() => fileRef.current?.click()}>{errorCode === "FILE_PARSE_FAILED" ? "Upload another CV" : "Upload CV"}</button><button type="button" className="font-black underline" onClick={() => setPasteOpen(true)}>Paste experience</button></div>}</div>}
          <label className={`mt-5 flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-all ${consentAttention && !candidateConsent ? "animate-pulse border-[var(--gold)] bg-[var(--gold-soft)] ring-4 ring-[var(--gold)]/20" : "border-black/15 bg-black/[.025]"}`}>
            <input ref={consentRef} className={`mt-1 h-4 w-4 accent-[var(--gold-deep)] transition-transform ${consentAttention && !candidateConsent ? "scale-125" : ""}`} type="checkbox" required aria-required="true" checked={candidateConsent} onChange={(event) => { setCandidateConsent(event.target.checked); if (event.target.checked) setConsentAttention(false); }} />
            <span><strong className="block text-sm">{candidateConsentCopy[locale].label}</strong><span className="mt-1 block text-xs leading-5 text-black/55">{candidateConsentCopy[locale].help}</span></span>
          </label>
          <button type="button" onClick={startAnalysis} disabled={!ready} className="button mt-5 w-full">{copy.analyzeButton} <span>→</span></button>
          <p className="mt-4 text-center text-xs leading-5 text-black/50">{homepageText(copy.privacy)}</p>
        </div>
      </section>
      <CapabilityGraph />
      <OpportunityAgentIntro locale={locale} />
      <section className="shell pb-6 pt-12 md:pb-8 md:pt-16" aria-labelledby="for-companies-title">
        <div className="card discovery-card grid gap-8 overflow-hidden p-7 md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div className="max-w-3xl"><div className="eyebrow text-[var(--gold-bright)]">For Companies · Free for now</div><h2 id="for-companies-title" className="editorial-title mt-4 text-3xl leading-tight md:text-5xl">Tell us what you need done.</h2><p className="mt-5 max-w-2xl text-base leading-7 text-white/68 md:text-lg">We’ll find people whose proven capabilities match it. Share the outcome, expertise and working setup you need—no job post required.</p></div>
          <Link href="/for-companies" className="button border-[var(--gold)] bg-[var(--gold)] text-black">Describe your need <span>→</span></Link>
        </div>
      </section>
      <section className="shell pb-14 pt-6 md:pb-16 md:pt-8" aria-labelledby="skill-stack-questions">
        <div className="max-w-3xl">
          <div className="eyebrow text-[var(--gold-deep)]">Skill stack questions</div>
          <h2 id="skill-stack-questions" className="display mt-4 text-3xl leading-tight md:text-5xl">Understand what your combination of skills can become.</h2>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {[
            ["What does Monetizable package?", "It turns evidence from your experience, results, industry knowledge, languages, and geographic context into 1–3 concrete offers a specific buyer can understand and purchase."],
            ["How does the analysis work?", "Monetizable extracts evidence from your CV, LinkedIn profile, or pasted experience, maps the strongest combinations, and checks them against current public market demand."],
            ["Who is Monetizable built for?", "Professionals with roughly two or more years of real experience who want independent income, but still need a sharper offer and a clearer target buyer."],
          ].map(([question, answer]) => <article key={question} className="card p-6"><h3 className="text-lg font-black">{question}</h3><p className="mt-3 text-sm leading-7 text-black/62">{answer}</p></article>)}
        </div>
      </section>
      <section className="border-t border-black/10 bg-white/55 py-14 md:py-20" aria-labelledby="latest-insights-title">
        <div className="shell">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <div className="eyebrow text-[var(--gold-deep)]">Monetizable insights</div>
              <h2 id="latest-insights-title" className="display mt-4 text-3xl leading-tight md:text-5xl">Research your next move before you make it.</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-black/62">Evidence-led guides on packaging expertise, validating buyer demand, and building independent income.</p>
            </div>
            <Link href="/blog" className="font-black underline decoration-[var(--gold)] decoration-2 underline-offset-4">Explore all insights →</Link>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {guides.map((guide) => <article key={guide.slug} className="card flex h-full flex-col p-6">
              <div className="eyebrow text-black/45">Practical guide</div>
              <h3 className="mt-3 text-xl font-black leading-tight"><Link href={`/guides/${guide.slug}`} className="hover:text-[var(--gold-deep)]">{guide.title}</Link></h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-black/62">{guide.description}</p>
              <Link href={`/guides/${guide.slug}`} className="mt-5 font-black underline decoration-[var(--gold)] decoration-2 underline-offset-4">Read the guide →</Link>
            </article>)}
          </div>

          <div className="mt-7 grid gap-7 md:grid-cols-2">
            {posts.map((post) => <article key={post.slug} className="card overflow-hidden">
              <Link href={`/post/${post.slug}`} aria-label={post.title}>
                <Image src={post.heroImage} alt="" width={1200} height={630} sizes="(max-width: 768px) 100vw, 50vw" className="aspect-[1.9/1] w-full object-cover" />
              </Link>
              <div className="p-6 md:p-7">
                <div className="eyebrow text-black/45">{post.publishedLabel} · {post.readTime} min read</div>
                <h3 className="mt-3 text-2xl font-black leading-tight"><Link href={`/post/${post.slug}`} className="hover:text-[var(--gold-deep)]">{post.title}</Link></h3>
                <p className="mt-3 leading-7 text-black/62">{post.description}</p>
                <Link href={`/post/${post.slug}`} className="mt-5 inline-flex font-black underline decoration-[var(--gold)] decoration-2 underline-offset-4">Read the article →</Link>
              </div>
            </article>)}
          </div>
        </div>
      </section>
      <section className="border-y border-black bg-black py-9 text-white"><div className="shell grid gap-6 md:grid-cols-3">
        {[['01','Package the offer','Turn proven expertise into 1–3 concrete outcomes a buyer can purchase.'],['02','Validate and target','Find where demand is real and which buyers are worth approaching.'],['03','Keep reaching buyers','Track new signals and prepare personalized outreach for your approval.']].map(([n,t,d]) => <div key={n} className="flex gap-4"><span className="text-sm text-[var(--gold-bright)]">{n}</span><div><strong className="text-base">{t}</strong><p className="mt-1 text-sm leading-6 text-white/60">{d}</p></div></div>)}
      </div></section>
      <footer className="shell flex flex-col justify-between gap-4 py-8 text-sm text-black/55 sm:flex-row"><p>© Monetizable. Offer intelligence and buyer outreach.</p><nav aria-label="Company" className="flex flex-wrap gap-5 font-bold text-black"><Link href="/blog">Insights</Link><Link href="/guides">Guides</Link><Link href="/faq">FAQ</Link><Link href="/product">Product facts</Link><Link href="/about">About</Link><Link href="/methodology">Methodology</Link><Link href="/editorial-policy">Editorial policy</Link><Link href="/privacy">Privacy</Link></nav></footer>
    </> : <section className="shell grid gap-10 pb-16 pt-8 md:grid-cols-[.7fr_1fr] md:pt-20">
      <div><button className="mb-8 text-sm font-bold" onClick={() => setStage("upload")}>← {copy.back}</button><div className="eyebrow mb-4 text-[var(--gold-deep)]">{copy.locationEyebrow}</div><h1 className="display text-4xl leading-[.95] md:text-6xl">{copy.locationTitle}</h1><p className="mt-6 max-w-md leading-7 text-black/65"><strong>{locationService}</strong>. {copy.locationBody}</p></div>
      <div className="card p-6 md:p-10">
        <div className="grid gap-5 md:grid-cols-2"><label className="font-bold">{copy.country} <span className="text-[var(--gold-deep)]">*</span><input className="field mt-2 font-normal" value={country} onChange={(e) => setCountry(e.target.value)} placeholder={copy.country} autoComplete="country-name" /></label><label className="font-bold">{copy.city} {cityRequired ? <span className="text-[var(--gold-deep)]">*</span> : <span className="font-normal text-black/50">({copy.optional})</span>}<input className="field mt-2 font-normal" required={cityRequired} aria-required={cityRequired} value={city} onChange={(e) => setCity(e.target.value)} placeholder={copy.city} autoComplete="address-level2" /></label></div>
        {error && <p role="alert" className="mt-5 rounded-xl border border-[var(--gold)] bg-[var(--gold-soft)] p-3 text-sm text-black">{error}</p>}
        <button onClick={() => void analyze(true)} className="button mt-7 w-full">{copy.validatePath} <span>→</span></button>
      </div>
    </section>}
  </main>;
}

function LoadingState({ index, locale }: { index: number; locale: Locale }) {
  const copy = getMessages(locale);
  const loadingSteps = [copy.loading1, copy.loading2, copy.loading3, copy.loading4, copy.loading5];
  return <main className="min-h-screen bg-black text-white"><Header compact locale={locale} /><section className="shell grid min-h-[75vh] place-items-center py-12"><div className="w-full max-w-3xl">
    <div className="eyebrow mb-8 text-[var(--gold-bright)]">{copy.loadingEyebrow}</div><h1 className="display text-4xl leading-[.98] md:text-6xl">{copy.loadingTitle}</h1>
    <div className="mt-12 space-y-1">{loadingSteps.map((step,i) => <div key={step} className={`flex items-center gap-4 border-t border-white/15 py-4 transition-opacity ${i > index ? 'opacity-25' : 'opacity-100'}`}><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${i < index ? 'gold-surface text-black' : i === index ? 'border border-[var(--gold-bright)] text-[var(--gold-bright)] animate-pulse' : 'border border-white/40'}`}>{i < index ? '✓' : i + 1}</span><span className="font-bold">{step}</span></div>)}</div>
    <p className="mt-8 text-sm text-white/55">Opportunity counts appear only after public search results are returned and checked.</p>
  </div></section></main>;
}
