"use client";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatMarketDate } from "@/lib/i18n/locale";
import { SubscribeButton, useBilling } from "../account/billing-access";
import { readBrowserRecord } from "@/lib/quest/browser-store";
import { disciplineReport, reportJudgments, type DisciplineFacts, type DisciplineGoal } from "@/lib/quest/discipline-report";
import type { EventPrediction } from "@/lib/quest/event-prediction";
import type { Direction, QuestState } from "@/lib/quest/types";
import "./discipline-report.css";

const copy = {
  en: {
    label: "Discipline report",
    title: "Your discipline report",
    week: (n: number) => `Week ${n} · Paris`,
    sample: "Sample",
    hit: "Prediction hit rate",
    hitWhy: "One number for whether you decided before you acted.",
    waiting: (n: number) => `${n} sealed call${n === 1 ? "" : "s"} still waiting for the verified close.`,
    empty: "No sealed call this week yet. Keep predicting — one reason before the open is enough to start.",
    low: "Fewer than 3 predictions this week. Keep predicting. One reason a day is enough for a pattern to show up.",
    bias: "Direction bias",
    biasWhy: "Always bullish or always bearish is an expensive habit.",
    counts: (d: Record<Direction, number>) => `Bullish ${d.bullish} · Range-bound ${d.neutral} · Bearish ${d.bearish}`,
    biasNote: {
      bullish: "This week was almost only bullish. If your real decisions were too, watch the “only bullish” habit.",
      bearish: "This week was almost only bearish. If your real decisions were too, watch the “only bearish” habit.",
      neutral: "This week stayed almost only range-bound. Write down what would change that view.",
    },
    high: "High-confidence accuracy",
    highWhy: "A miss costs the most when your confidence is highest.",
    highValue: (count: number, correct: number) => `${count} high-confidence call${count === 1 ? "" : "s"} · ${correct} matched`,
    highNone: "No high-confidence call this week.",
    highWait: (count: number) => `${count} high-confidence call${count === 1 ? "" : "s"} · waiting for the verified close.`,
    review: "Review completion",
    reviewWhy: "A prediction without a review does not change the next one.",
    boss: "Boss prediction hits",
    bossWhy: "A separate habit: calling the macro number, not the day’s price.",
    bossValue: (hits: number, scored: number) => `${hits}/${scored} matched`,
    bossNone: "No Boss call this week.",
    bossWait: (total: number) => `${total} sealed · waiting for the official release.`,
    goal: "One aim for next week",
    goals: {
      "keep-predicting": "Next week’s aim: seal one call on each trading day, with one reason. Three calls let this report show a habit.",
      "bias-bullish": "Next week’s aim: seal a call each day and write one lesson after the close. Keep bullish calls to 3 or fewer.",
      "bias-bearish": "Next week’s aim: seal a call each day and write one lesson after the close. Keep bearish calls to 3 or fewer.",
      "bias-neutral": "Next week’s aim: write the condition that would move you out of the range, and one lesson after each close.",
      "high-confidence": "Next week’s aim: before a high-confidence call, write the evidence that would change your mind.",
      "write-reviews": "Next week’s aim: write one lesson after every sealed call.",
      "stay-steady": "Next week’s aim: keep one sealed call and one lesson on each trading day.",
    } satisfies Record<DisciplineGoal, string>,
    cta: "See my full report",
    pitch: "Every Sunday: your discipline report — bias, confidence, review.",
    trial: "7 days free, then US$19.90/month. Cancel before the trial ends to avoid a charge.",
    foot: "The hit rate counts only eligible premarket calls with a verified close. This checks your discipline. It does not promise a profit.",
  },
  fr: {
    label: "Rapport de discipline",
    title: "Votre rapport de discipline",
    week: (n: number) => `Semaine ${n} · Paris`,
    sample: "Exemple",
    hit: "Taux de prévisions justes",
    hitWhy: "Un chiffre pour voir si vous avez décidé avant d’agir.",
    waiting: (n: number) => `${n} prévision${n === 1 ? "" : "s"} scellée${n === 1 ? "" : "s"} en attente du cours vérifié.`,
    empty: "Aucune prévision scellée cette semaine. Continuez : une raison avant l’ouverture suffit pour commencer.",
    low: "Moins de 3 prévisions cette semaine. Continuez. Une raison par jour suffit pour qu’une habitude apparaisse.",
    bias: "Biais de direction",
    biasWhy: "Toujours haussier ou toujours baissier est une habitude coûteuse.",
    counts: (d: Record<Direction, number>) => `Haussier ${d.bullish} · En range ${d.neutral} · Baissier ${d.bearish}`,
    biasNote: {
      bullish: "Cette semaine, presque uniquement haussier. Si vos décisions réelles le sont aussi, surveillez le biais « seulement haussier ».",
      bearish: "Cette semaine, presque uniquement baissier. Si vos décisions réelles le sont aussi, surveillez le biais « seulement baissier ».",
      neutral: "Cette semaine, presque uniquement en range. Notez ce qui changerait cette vue.",
    },
    high: "Justesse en haute confiance",
    highWhy: "Une erreur coûte le plus quand la confiance est au plus haut.",
    highValue: (count: number, correct: number) => `${count} prévision${count === 1 ? "" : "s"} en haute confiance · ${correct} juste${correct === 1 ? "" : "s"}`,
    highNone: "Aucune prévision en haute confiance cette semaine.",
    highWait: (count: number) => `${count} prévision${count === 1 ? "" : "s"} en haute confiance · en attente du cours vérifié.`,
    review: "Taux de revues",
    reviewWhy: "Prévoir sans écrire de revue ne change pas la prochaine décision.",
    boss: "Prévisions Boss justes",
    bossWhy: "Une autre habitude : le chiffre macro, pas le cours du jour.",
    bossValue: (hits: number, scored: number) => `${hits}/${scored} justes`,
    bossNone: "Aucune prévision Boss cette semaine.",
    bossWait: (total: number) => `${total} prévision${total === 1 ? "" : "s"} scellée${total === 1 ? "" : "s"} · en attente de la publication officielle.`,
    goal: "Un objectif pour la semaine prochaine",
    goals: {
      "keep-predicting": "Objectif : sceller une prévision chaque jour de bourse, avec une raison. Trois prévisions permettent au rapport de montrer une habitude.",
      "bias-bullish": "Objectif : sceller une prévision chaque jour et écrire une leçon après la clôture. Gardez au plus 3 prévisions haussières.",
      "bias-bearish": "Objectif : sceller une prévision chaque jour et écrire une leçon après la clôture. Gardez au plus 3 prévisions baissières.",
      "bias-neutral": "Objectif : notez la condition qui vous sortirait du range, et une leçon après chaque clôture.",
      "high-confidence": "Objectif : avant une prévision à haute confiance, écrivez la preuve qui vous ferait changer d’avis.",
      "write-reviews": "Objectif : écrire une leçon après chaque prévision scellée.",
      "stay-steady": "Objectif : une prévision scellée et une leçon chaque jour de bourse.",
    } satisfies Record<DisciplineGoal, string>,
    cta: "Voir mon rapport complet",
    pitch: "Chaque dimanche : votre rapport de discipline — biais, confiance, revue.",
    trial: "7 jours gratuits, puis 19,90 $US/mois. Annulez avant la fin de l’essai pour éviter le prélèvement.",
    foot: "Le taux ne compte que les prévisions admissibles avant l’ouverture, avec un cours de clôture vérifié. Ceci décrit votre discipline, pas un gain futur.",
  },
  zh: {
    label: "个人纪律周报",
    title: "你的个人纪律周报",
    week: (n: number) => `第 ${n} 周 · 巴黎`,
    sample: "示例",
    hit: "本周预测命中率",
    hitWhy: "你有没有先想清楚再行动，一个数字就能看见。",
    waiting: (n: number) => `还有 ${n} 次封存判断在等收盘核对。`,
    empty: "本周还没有封存判断。继续预测吧，开盘前留下一句理由就够开始。",
    low: "本周预测少于 3 次。继续预测，每天一句理由，习惯才会显出来。",
    bias: "方向偏差",
    biasWhy: "总是看涨或总是看跌，是很贵的坏习惯。",
    counts: (d: Record<Direction, number>) => `偏多 ${d.bullish} · 震荡 ${d.neutral} · 偏空 ${d.bearish}`,
    biasNote: {
      bullish: "本周几乎只看涨。若实际决定也偏多，留意「只做多」偏差。",
      bearish: "本周几乎只看跌。若实际决定也偏空，留意「只做空」偏差。",
      neutral: "本周几乎只看震荡。写下什么情况会改变这个看法。",
    },
    high: "高信心时准不准",
    highWhy: "信心最高的时候更容易下重注，这里错了代价最大。",
    highValue: (count: number, correct: number) => `${count} 次高信心 · 命中 ${correct}`,
    highNone: "本周没有高信心判断。",
    highWait: (count: number) => `${count} 次高信心 · 等待收盘核对。`,
    review: "复盘完成率",
    reviewWhy: "只预测不复盘，日志等于白写。",
    boss: "Boss 预测命中",
    bossWhy: "这是对宏观数字的纪律，和当天涨跌是另一块肌肉。",
    bossValue: (hits: number, scored: number) => `${hits}/${scored} 命中`,
    bossNone: "本周没有 Boss 预测。",
    bossWait: (total: number) => `已封存 ${total} 次 · 等待官方公布。`,
    goal: "下周一句目标",
    goals: {
      "keep-predicting": "下周目标：每个交易日封存一次判断，并写下一句理由。满 3 次，这份报告才能看出习惯。",
      "bias-bullish": "下周目标：每天封存判断，收盘写一句教训；偏多次数不超过 3。",
      "bias-bearish": "下周目标：每天封存判断，收盘写一句教训；偏空次数不超过 3。",
      "bias-neutral": "下周目标：写下会让你离开震荡看法的条件，每次收盘写一句教训。",
      "high-confidence": "下周目标：高信心判断前，先写下一句会让你改变看法的证据。",
      "write-reviews": "下周目标：每次封存判断之后，收盘写一句教训。",
      "stay-steady": "下周目标：每个交易日保留一次封存判断，并写一句教训。",
    } satisfies Record<DisciplineGoal, string>,
    cta: "查看完整周报",
    pitch: "每周日一份个人纪律周报：命中率、方向偏差、高信心准不准、复盘有没有做。",
    trial: "7 天免费，之后每月 19.90 美元。试用结束前取消可避免扣款。",
    foot: "命中率只统计已核对的有效盘前判断。这是纪律检查，不是收益承诺。",
  },
} as const;

function hitLabel(facts: DisciplineFacts, locale: "en" | "fr" | "zh") {
  if (facts.hitRate === undefined) return "—";
  const ratio = `${facts.correct}/${facts.scored}`;
  if (locale === "zh") return `${facts.hitRate}%（${ratio}）`;
  if (locale === "fr") return `${facts.hitRate} % (${ratio})`;
  return `${facts.hitRate}% (${ratio})`;
}

export default function DisciplineReport({ state }: { state: QuestState }) {
  const locale = useLocale();
  const { access } = useBilling();
  const text = copy[locale];
  const [predictions, setPredictions] = useState<EventPrediction[]>([]);
  useEffect(() => {
    const load = () => {
      try { setPredictions(readBrowserRecord().eventPredictions || []); }
      catch { setPredictions([]); }
    };
    load();
    window.addEventListener("quest-progress", load);
    return () => window.removeEventListener("quest-progress", load);
  }, []);
  const facts = useMemo(
    () => disciplineReport(state, reportJudgments(state), predictions, state.events),
    [state, predictions],
  );
  const range = `${formatMarketDate(facts.start, locale)} – ${formatMarketDate(facts.end, locale)}`;
  const rest = (
    <>
      <article className="discipline-metric">
        <h3>2. {text.bias}</h3>
        <strong className="discipline-counts">{text.counts(facts.directions)}</strong>
        <p className="discipline-why">{text.biasWhy}</p>
        {facts.bias && <p className="discipline-note">{text.biasNote[facts.bias]}</p>}
      </article>
      <article className="discipline-metric">
        <h3>3. {text.high}</h3>
        <strong>{facts.highScored ? `${facts.highCorrect}/${facts.highScored}` : "—"}</strong>
        <p className="discipline-why">{text.highWhy}</p>
        <p className="discipline-note">{facts.highCount === 0 ? text.highNone : facts.highScored === 0 ? text.highWait(facts.highCount) : text.highValue(facts.highCount, facts.highCorrect)}</p>
      </article>
      <article className="discipline-metric">
        <h3>4. {text.review}</h3>
        <strong>{facts.recorded ? `${facts.completed}/${facts.recorded}` : "—"}</strong>
        <p className="discipline-why">{text.reviewWhy}</p>
      </article>
      <article className="discipline-metric">
        <h3>5. {text.boss}</h3>
        <strong>{facts.bossScored ? `${facts.bossHits}/${facts.bossScored}` : "—"}</strong>
        <p className="discipline-why">{text.bossWhy}</p>
        <p className="discipline-note">{facts.bossTotal === 0 ? text.bossNone : facts.bossScored === 0 ? text.bossWait(facts.bossTotal) : text.bossValue(facts.bossHits, facts.bossScored)}</p>
      </article>
      <div className="discipline-goal">
        <h3>{text.goal}</h3>
        <p>{text.goals[facts.goal]}</p>
      </div>
    </>
  );
  return (
    <section id="discipline-report" className="panel en-card discipline-report" aria-label={text.label}>
      <div className="discipline-kicker">
        <span className="eyebrow">🛡️ {text.label}</span>
        {state.mode === "demo" && <span className="badge gold">{text.sample}</span>}
      </div>
      <h2>{text.title}</h2>
      <small className="discipline-range">{text.week(facts.week)} · {range}</small>
      <article className="discipline-metric">
        <h3>1. {text.hit}</h3>
        <strong>{hitLabel(facts, locale)}</strong>
        <p className="discipline-why">{text.hitWhy}</p>
        {facts.recorded === 0 ? <p className="discipline-note discipline-lead">{text.empty}</p> : facts.lowData ? <p className="discipline-note discipline-lead">{text.low}</p> : facts.pending > 0 ? <p className="discipline-note discipline-lead">{text.waiting(facts.pending)}</p> : null}
      </article>
      {access.premium ? rest : (
        <div className="discipline-locked">
          <div className="discipline-locked-body" aria-hidden="true">{rest}</div>
          <div className="discipline-cta">
            <h3>{text.cta}</h3>
            <p>{text.pitch}</p>
            <SubscribeButton locale={locale === "zh" ? "zh" : "en"} label={text.cta} />
            <small>{text.trial}</small>
          </div>
        </div>
      )}
      <small className="discipline-foot">{text.foot}</small>
    </section>
  );
}
