"use client";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useHero } from "@/components/quest/hero-preference";
import { deviceTimeZone } from "@/lib/push/browser";
import { defaultCategories, type PushCategories } from "@/lib/push/prefs";
import CompanionPushCard from "./companion-push-card";

const labels = {
  en: {
    title: "Companion reminders",
    intro: "Astra or Charlie can remind you on this phone or computer. Each reminder uses your companion’s portrait.",
    on: "Reminders are on",
    off: "Turn on reminders",
    signIn: "Sign in to turn reminders on",
    premarket: "Pre-market prediction",
    premarketHint: "Trading days, 45 minutes before the US open. Skipped after you lock today’s call.",
    review: "Daily review",
    reviewHint: "Trading days, about 30 minutes after the close, when you made a call that day.",
    knowledge: "Knowledge card",
    knowledgeHint: "Once a day. Weekends and US market holidays keep this reminder.",
    event: "Event Boss",
    eventHint: "The evening before a major release, and again one hour before. Replaces the pre-market reminder that day.",
    time: "Knowledge card time",
    timeHint: "Your device’s local time. The default is 12:30.",
    saved: "Reminder choices saved.",
    denied: "Notifications are blocked. On iPhone: Settings → Notifications → Monetizable. On Android or desktop, allow them in the browser settings for this site.",
    cap: "At most two reminders each day.",
  },
  fr: {
    title: "Rappels du partenaire",
    intro: "Astra ou Charlie peut te rappeler sur ce téléphone ou cet ordinateur. Chaque rappel montre son portrait.",
    on: "Les rappels sont activés",
    off: "Activer les rappels",
    signIn: "Connecte-toi pour activer les rappels",
    premarket: "Prévision avant l’ouverture",
    premarketHint: "Jours de séance, 45 minutes avant l’ouverture américaine. Passé si tu as déjà verrouillé ton jugement.",
    review: "Bilan du jour",
    reviewHint: "Jours de séance, environ 30 minutes après la clôture, si tu as fait une prévision ce jour-là.",
    knowledge: "Carte de connaissance",
    knowledgeHint: "Une fois par jour. Les week-ends et jours fériés du marché américain gardent ce rappel.",
    event: "Boss d’événement",
    eventHint: "La veille au soir, puis une heure avant la publication. Remplace le rappel d’avant-ouverture ce jour-là.",
    time: "Heure de la carte",
    timeHint: "Heure locale de cet appareil. Par défaut, 12:30.",
    saved: "Choix de rappels enregistrés.",
    denied: "Les notifications sont bloquées. Sur iPhone : Réglages → Notifications → Monetizable. Sur Android ou ordinateur, autorise-les dans les réglages du navigateur.",
    cap: "Deux rappels maximum par jour.",
  },
  zh: {
    title: "伙伴提醒",
    intro: "星澜或查理可以在这台手机或电脑上提醒你。每条通知都会带上你选择的伙伴头像。",
    on: "提醒已开启",
    off: "开启提醒",
    signIn: "登录后开启提醒",
    premarket: "盘前预测",
    premarketHint: "交易日，美股开盘前 45 分钟。今天已经写下判断就会跳过。",
    review: "每日复盘",
    reviewHint: "交易日收盘后约 30 分钟，只发给当天做过预测的人。",
    knowledge: "知识卡牌",
    knowledgeHint: "每天一次。周末和美国休市日只保留这一条。",
    event: "事件 Boss",
    eventHint: "重大数据前一晚，以及公布前 1 小时。公布当天会代替盘前提醒。",
    time: "知识卡时间",
    timeHint: "按这台设备的本地时间。默认 12:30。",
    saved: "提醒选择已保存。",
    denied: "通知已被系统关闭。iPhone：设置 → 通知 → Monetizable。安卓或电脑：在浏览器里允许本站通知。",
    cap: "每人每天最多两条提醒。",
  },
} as const;

export default function PushSettings() {
  const locale = useLocale();
  const hero = useHero();
  const text = labels[locale];
  const [categories, setCategories] = useState<PushCategories>(defaultCategories());
  const [knowledgeTime, setKnowledgeTime] = useState("12:30");
  const [subscribed, setSubscribed] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [card, setCard] = useState(false);
  const [note, setNote] = useState("");
  const denied = typeof Notification !== "undefined" && Notification.permission === "denied";

  useEffect(() => {
    let active = true;
    fetch("/api/push/preferences", { cache: "no-store" }).then((response) => response.json()).then((data: { subscribed?: boolean; user?: { id: string } | null; categories?: PushCategories; knowledgeTime?: string }) => {
      if (!active) return;
      setSignedIn(Boolean(data.user));
      setSubscribed(Boolean(data.subscribed));
      if (data.categories) setCategories(data.categories);
      if (data.knowledgeTime) setKnowledgeTime(data.knowledgeTime);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function save(next: PushCategories, time = knowledgeTime) {
    setCategories(next);
    setKnowledgeTime(time);
    if (!subscribed) return;
    const response = await fetch("/api/push/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: next, knowledgeTime: time, companion: hero, locale, timeZone: deviceTimeZone() }),
    });
    setNote(response.ok ? text.saved : "");
  }

  const rows: { key: keyof PushCategories; title: string; hint: string }[] = [
    { key: "premarket", title: text.premarket, hint: text.premarketHint },
    { key: "review", title: text.review, hint: text.reviewHint },
    { key: "knowledge", title: text.knowledge, hint: text.knowledgeHint },
    { key: "event", title: text.event, hint: text.eventHint },
  ];

  return (
    <div className="settings-section" translate="no">
      <h3>{text.title}</h3>
      <p className="muted small-text">{text.intro}</p>
      {denied && <p className="pwa-guide-tip" role="status">{text.denied}</p>}
      {!subscribed && (signedIn
        ? <button type="button" className="secondary full" onClick={() => setCard(true)}>{text.off}</button>
        : <a className="secondary full" href={"/auth?next=" + encodeURIComponent("/?push=1")}>{text.signIn}</a>)}
      {subscribed && <p className="muted small-text">{text.on}</p>}
      {card && !subscribed && <CompanionPushCard categories={categories} knowledgeTime={knowledgeTime} onClose={() => setCard(false)} onSubscribed={() => { setSubscribed(true); setSignedIn(true); setCard(false); }} />}
      {rows.map((row) => (
        <label className="toggle-row" key={row.key}>
          <div><strong>{row.title}</strong><span>{row.hint}</span></div>
          <input type="checkbox" checked={categories[row.key]} onChange={(event) => void save({ ...categories, [row.key]: event.target.checked })} />
        </label>
      ))}
      <label className="field-label" htmlFor="knowledge-time">{text.time}</label>
      <input id="knowledge-time" type="time" step={900} value={knowledgeTime} onChange={(event) => void save(categories, event.target.value || "12:30")} />
      <p className="muted small-text">{text.timeHint} {text.cap}</p>
      {note && <p className="muted small-text" role="status">{note}</p>}
    </div>
  );
}
