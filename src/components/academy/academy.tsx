'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { LanguageSwitcher, useLocale } from '@/components/i18n/locale-provider';
import { courses, indexHistory, lessons } from './lessons';
import { chooseHero, useHasHero, useHero } from '@/components/quest/hero-preference';
import styles from './academy.module.css';

const storageKey = 'monetizable:academy:v1';
const emptyProgress = { done: [] as number[], daily: '' };
type Progress = typeof emptyProgress;

function readProgress(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (saved && Array.isArray(saved.done)) {
      return {
        done: [...new Set<number>(saved.done.filter((id: unknown) => typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < lessons.length))],
        daily: typeof saved.daily === 'string' ? saved.daily : '',
      };
    }
  } catch {}
  return emptyProgress;
}

function Chart({ compound = false }: { compound?: boolean }) {
  const locale = useLocale();
  const t = (en: string, fr: string, zh: string) => ({ en, fr, zh })[locale];
  const gradient = useId();
  const [point, setPoint] = useState(indexHistory.length - 1);
  const [rate, setRate] = useState(10);
  const [years, setYears] = useState(2);
  const data = compound
    ? Array.from({ length: 21 }, (_, year) => [year, 1000 * (1 + rate / 100) ** year])
    : indexHistory.map(([year, close]) => [year, 1000 * close / indexHistory[0][1]]);
  const active = compound ? years : point;
  const max = Math.max(...data.map(([, value]) => value));
  const x = (year: number) => 12 + (year - data[0][0]) / 20 * 456;
  const y = (value: number) => 154 - value / max * 135;
  const coords = data.map(([year, value]) => [x(year), y(value)]);
  const line = coords.map(([px, py]) => `${px},${py}`).join(' ');
  const [year, value] = data[active];
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  return <figure className={styles.chart}>
    <figcaption className={styles.chartHead}>
      <div><span className={styles.eyebrow}>{compound ? t('Compound interest lab', 'Laboratoire des intérêts', '复利实验室') : 'NASDAQ COMPOSITE'}</span>
      <strong aria-live="polite">{money.format(value)}</strong></div>
      <span className={styles.tag}>{compound ? t(`Year ${year}`, `Année ${year}`, `第 ${year} 年`) : year}</span>
    </figcaption>
    <svg viewBox="0 0 480 160" aria-hidden="true">
      <defs><linearGradient id={gradient} x2="0" y2="100%"><stop stopColor="#719878" stopOpacity=".28"/><stop offset="1" stopColor="#719878" stopOpacity="0"/></linearGradient></defs>
      {[34, 74, 114, 154].map(py => <line key={py} x1="12" x2="468" y1={py} y2={py} stroke="#e4e8df"/>)}
      <polygon points={`12,154 ${line} 468,154`} fill={`url(#${gradient})`}/>
      <polyline points={line} fill="none" stroke="#39755d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1={x(year)} x2={x(year)} y1={y(value)} y2="154" stroke="#39755d" strokeDasharray="4 4"/>
      <circle cx={x(year)} cy={y(value)} r="6" fill="#39755d" stroke="white" strokeWidth="2"/>
    </svg>
    <label className={styles.range}>{compound ? t('Years', 'Durée en années', '年数') : t('Explore by year', 'Explorer par année', '拖动查看年份')}
      <input type="range" min="0" max={data.length - 1} value={active} aria-valuetext={String(year)} onChange={event => (compound ? setYears : setPoint)(Number(event.target.value))}/>
    </label>
    {compound && <label className={styles.range}>{t('Annual rate', 'Taux annuel', '年利率')} · {rate}%
      <input type="range" min="0" max="15" value={rate} onChange={event => setRate(Number(event.target.value))}/>
    </label>}
    <small>{compound
      ? t('Hypothetical fixed rate · annual compounding', 'Taux fixe fictif · capitalisation annuelle', '假设固定利率 · 按年复利')
      : <>{t('Selected year-end closes, 2004–2024. Illustrative price change before dividends, fees and taxes.', 'Clôtures annuelles sélectionnées, 2004–2024. Évolution indicative hors dividendes, frais et impôts.', '2004–2024 年部分年末收盘点位。仅模拟价格变化，未计入股息、费用和税费。')} <a href="https://fred.stlouisfed.org/series/NASDAQCOM">{t('Data', 'Données', '数据')}</a></>}</small>
  </figure>;
}

export default function Academy({ signedIn, legacyHref }: { signedIn: boolean; legacyHref: string }) {
  const locale = useLocale();
  const hero = useHero();
  const hasHero = useHasHero();
  const lang = { en: 0, fr: 1, zh: 2 }[locale];
  const t = (en: string, fr: string, zh: string) => [en, fr, zh][lang];
  const [progress, setProgress] = useState(emptyProgress);
  const [date, setDate] = useState('');
  const [step, setStep] = useState<{ course: number; index: number; daily?: { id: number; date: string } } | null>(null);
  const [guess, setGuess] = useState<number | null>(null);
  const [complete, setComplete] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    function refresh() {
      setDate(new Date().toLocaleDateString('sv-SE'));
      setProgress(readProgress());
    }
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  useEffect(() => { if (step) heading.current?.focus(); }, [step, complete]);

  const dailyId = date ? 5 + Math.floor(Date.parse(date) / 86_400_000) % 4 : 5;
  const dailyDone = !!date && progress.daily === date;
  const xp = progress.done.length * 20;
  const course = step ? courses[step.course] : null;
  const id = step?.daily ? step.daily.id : course?.steps[step?.index ?? 0];
  const lesson = id === undefined ? null : lessons[id];

  const companions = [
    { id: 'female', name: t('Astra', 'Astra', '星澜'), image: '/heroes/astra-portrait.webp' },
    { id: 'supercharlie', name: t('Charlie', 'Charlie', '查理'), image: '/heroes/supercharlie-portrait.webp' },
  ] as const;
  const partner = companions.find(item => item.id === hero);

  function start(courseIndex: number, daily = false) {
    const next = courses[courseIndex].steps.findIndex(item => !progress.done.includes(item));
    setGuess(null);
    setComplete(false);
    setStep({ course: courseIndex, index: Math.max(0, next), daily: daily ? { id: dailyId, date } : undefined });
  }

  function advance() {
    if (!step || !course || id === undefined || guess !== lessons[id].answer) return;
    const latest = readProgress();
    const updated = {
      done: [...new Set([...latest.done, ...progress.done, id])],
      daily: [latest.daily, progress.daily, step.daily?.date ?? ''].sort().at(-1) ?? '',
    };
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
    setProgress(updated);
    if (step.daily || step.index + 1 === course.steps.length) {
      setComplete(true);
    } else {
      setGuess(null);
      setStep({ ...step, index: step.index + 1 });
    }
  }

  return <main className={styles.shell}>
    <header className={styles.header}>
      <a className={styles.brand} href="/" aria-label="Monetizable"><img src="/brand/monetizable-curious-m.svg" width="34" height="34" alt=""/>Monetizable</a>
      <nav aria-label={t('Main navigation', 'Navigation principale', '主导航')}>
        <a href={legacyHref}>{t('Market practice', 'Pratique de marché', '市场练习')}</a>
        {!signedIn && <a href="/auth">{t('Sign in', 'Connexion', '登录')}</a>}
        <LanguageSwitcher/>
      </nav>
    </header>
    {step && lesson && course ? <section className={styles.lesson} aria-labelledby="academy-lesson-title">
      <button className={styles.textButton} onClick={() => setStep(null)}>← {t('Learning paths', 'Parcours', '学习路线')}</button>
      <div className={styles.lessonMeta}>
        <span className={styles.eyebrow}>{step.daily ? t('Daily challenge', 'Défi du jour', '每日挑战') : course.title[lang]}</span>
        {!step.daily && <span>{complete ? course.steps.length : step.index + 1} / {course.steps.length}</span>}
      </div>
      <progress value={complete ? course.steps.length : step.index} max={course.steps.length} aria-label={t('Journey progress', 'Progression du parcours', '路线进度')}/>
      <h1 id="academy-lesson-title" ref={heading} tabIndex={-1}>{complete ? t('Quest complete!', 'Quête terminée !', '任务完成！') : lesson.title[lang]}</h1>
      {complete ? <div className={styles.reward}>
        <span aria-hidden="true">✦</span>
        <p>{t('Every new lesson earns 20 XP. Your progress is saved on this device.', 'Chaque nouvelle leçon rapporte 20 XP. Votre progression est enregistrée sur cet appareil.', '每完成一节新课获得 20 XP。学习进度保存在当前设备。')}</p>
        <button className={styles.primary} onClick={() => setStep(null)}>{t('Back to learning paths', 'Revenir aux parcours', '返回学习路线')} →</button>
      </div> : <>
        {hasHero && partner && <div className={styles.partnerNote}>
          <img src={partner.image} width="42" height="42" alt=""/>
          <span><strong>{partner.name}</strong>{t('Let’s figure this out together.', 'On découvre ça ensemble ?', '我们一起把这个问题弄懂。')}</span>
        </div>}
        <p>{lesson.story[lang]}</p>
        {(id === 0 || id === 2) && <Chart key={id} compound={id === 2}/>}
        <h2>{lesson.question[lang]}</h2>
        <div className={styles.options}>{lesson.options.map((option, index) =>
          <button key={index} className={styles.option} data-selected={guess === index} aria-pressed={guess === index} onClick={() => setGuess(index)}>
            <span>{String.fromCharCode(65 + index)}</span>{option[lang]}
          </button>
        )}</div>
        {guess !== null && <div className={styles.feedback} role="status" data-correct={guess === lesson.answer}>
          <strong>{guess === lesson.answer ? t('You got it!', 'Bien joué !', '答对了！') : t('Give it another try', 'Essayez encore', '再试一次')}</strong>
          <p>{lesson.takeaway[lang]}</p>
        </div>}
        {guess === lesson.answer && <button className={styles.primary} onClick={advance}>
          {step.daily || step.index + 1 === course.steps.length ? t('Finish quest', 'Terminer la quête', '完成任务') : t('Continue', 'Continuer', '继续')} →
        </button>}
      </>}
    </section> : <>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>✦ {t('A little finance every day', 'Un peu de finance chaque jour', '每天学一点金融')}</span>
          <h1>{t('Make sense of money.', 'Comprendre l’argent.', '从零开始，学懂金融。')}</h1>
          <p>{t('Learn how money works, one small quest at a time. Start with a real chart and discover the ideas behind it.', 'Comprenez l’argent, une petite quête à la fois. Partez d’un vrai graphique et découvrez les idées qui l’expliquent.', '用一个个小任务学懂投资、经济和日常理财。先看一张真实图表，再拆解背后的金融知识。')}</p>
          <button className={styles.primary} onClick={() => start(0)}>{progress.done.includes(0) ? t('Open the Nasdaq journey', 'Ouvrir le parcours Nasdaq', '打开纳斯达克路线') : t('Start my first quest', 'Commencer ma première quête', '开始我的第一关')} →</button>
          <fieldset className={styles.companions}>
            <legend>{t('Choose your learning companion', 'Choisissez votre partenaire', '选择你的学习伴侣')}</legend>
            <div>{companions.map(item => <button key={item.id} type="button" aria-pressed={hasHero && hero === item.id} onClick={() => chooseHero(item.id)}>
              <img src={item.image} width="48" height="48" alt=""/><span>{item.name}</span>
            </button>)}</div>
          </fieldset>
          <div className={styles.heroMeta}>{t('Beginner friendly · Free to play', 'Pour débutants · Accès gratuit', '零基础友好 · 免费学习')}</div>
        </div>
        <div><h2>{t('What would $1,000 become in 20 years?', 'Que deviennent 1 000 $ en 20 ans ?', '1,000 美元，20 年后会变成多少？')}</h2><Chart/></div>
      </section>
      <section className={styles.library} aria-labelledby="academy-paths">
        <div className={styles.sectionHead}>
          <div><span className={styles.eyebrow}>{t('Your learning map', 'Votre carte d’apprentissage', '你的学习地图')}</span><h2 id="academy-paths">{t('Pick a path', 'Choisissez un parcours', '选一条路线')}</h2></div>
          <div className={styles.stats} aria-live="polite"><span>✦ {xp} XP</span><span>{t('Level', 'Niveau', '等级')} {1 + Math.floor(xp / 60)}</span></div>
        </div>
        <div className={styles.courses}>{courses.map((item, index) => {
          const done = item.steps.filter(lessonId => progress.done.includes(lessonId)).length;
          return <button key={index} className={styles.course} onClick={() => start(index)}>
            <span className={styles.icon} aria-hidden="true">{item.icon}</span>
            <span><strong>{item.title[lang]}</strong><small>{item.detail[lang]}</small></span>
            <span className={styles.courseCount}>{done}/{item.steps.length} →</span>
          </button>;
        })}</div>
        <aside className={styles.daily}>
          <div><span className={styles.eyebrow}>✧ {t('Daily challenge', 'Défi du jour', '每日挑战')}</span><h3>{date ? lessons[dailyId].title[lang] : t('One quick question', 'Une question rapide', '一道快速练习')}</h3></div>
          <button className={styles.primary} disabled={!date || dailyDone} onClick={() => start(dailyId - 4, true)}>{dailyDone ? t('Completed today ✓', 'Terminé aujourd’hui ✓', '今日已完成 ✓') : t('Take the challenge →', 'Relever le défi →', '接受挑战 →')}</button>
        </aside>
      </section>
    </>}
    <footer className={styles.footer}><span>{t('Financial education · Historical examples and hypothetical scenarios', 'Éducation financière · Exemples historiques et scénarios fictifs', '金融教育 · 历史案例与假设情景')}</span><a href="/privacy">{t('Privacy', 'Confidentialité', '隐私')}</a><a href="/blog">Blog</a></footer>
  </main>;
}
