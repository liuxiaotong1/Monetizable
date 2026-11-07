"use client";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useHero } from "@/components/quest/hero-preference";
import { deviceTimeZone } from "@/lib/push/browser";
import { reminderDeviceState, type ReminderPermission } from "@/lib/push/device-status";
import { defaultCategories, type PushCategories } from "@/lib/push/prefs";
import CompanionPushCard from "./companion-push-card";

const labels = {
  en: {
    title: "Companion reminders",
    intro: "Astra or Charlie can remind you on this phone or computer. Each reminder uses your companion’s portrait.",
    on: "This device is registered. Daily reminders can arrive here.",
    accountOnly: "Your account already has reminders. Register this device to receive them here. On iPhone, open the Home Screen icon first — that icon keeps its own registration.",
    off: "Turn on reminders",
    signIn: "Sign in to turn reminders on",
    test: "Send a test reminder",
    testing: "Sending a test reminder…",
    testSent: "A test reminder is on its way to this device.",
    testLater: "A test reminder was just sent. You can send another in a little while.",
    testFailed: "The test reminder could not be sent. Turn reminders on again, then try once more.",
    unsupported: "This browser cannot show reminders yet. On iPhone, add Monetizable to the Home Screen with iOS 16.4 or newer, then open it from the icon.",
    premarket: "Pre-market prediction",
    premarketHint: "Trading days, during the 45 minutes before the US open, while today’s call is still open.",
    review: "Daily review",
    reviewHint: "Trading days, from about 30 minutes after the close until 22:30 Eastern Time, when you made a call that day.",
    knowledge: "Knowledge card",
    knowledgeHint: "Once a day, from your chosen time until 21:00 on this device. Weekends and US market holidays keep this reminder.",
    event: "Event Boss",
    eventHint: "The evening before a major release, and again during the hour before it. Replaces the pre-market reminder that day.",
    time: "Knowledge card time",
    timeHint: "Your device’s local time. The default is 12:30.",
    saved: "Reminder choices saved.",
    denied: "Notifications are blocked. On iPhone: Settings → Notifications → Monetizable. On Android or desktop, allow them in the browser settings for this site.",
    cap: "At most two reminders each day.",
  },
  fr: {
    title: "Rappels du partenaire",
    intro: "Astra ou Charlie peut te rappeler sur ce téléphone ou cet ordinateur. Chaque rappel montre son portrait.",
    on: "Cet appareil est enregistré. Les rappels du jour peuvent arriver ici.",
    accountOnly: "Ton compte a déjà des rappels. Enregistre cet appareil pour les recevoir ici. Sur iPhone, ouvre d’abord l’icône de l’écran d’accueil : elle garde sa propre inscription.",
    off: "Activer les rappels",
    signIn: "Connecte-toi pour activer les rappels",
    test: "Envoyer un rappel d’essai",
    testing: "Envoi d’un rappel d’essai…",
    testSent: "Un rappel d’essai est en route vers cet appareil.",
    testLater: "Un rappel d’essai vient d’être envoyé. Tu pourras en envoyer un autre dans un moment.",
    testFailed: "Le rappel d’essai n’a pas pu partir. Active à nouveau les rappels, puis réessaie.",
    unsupported: "Ce navigateur ne peut pas encore afficher les rappels. Sur iPhone, ajoute Monetizable à l’écran d’accueil avec iOS 16.4 ou plus récent, puis ouvre-le depuis l’icône.",
    premarket: "Prévision avant l’ouverture",
    premarketHint: "Jours de séance, pendant les 45 minutes avant l’ouverture américaine, tant que ton jugement est encore ouvert.",
    review: "Bilan du jour",
    reviewHint: "Jours de séance, d’environ 30 minutes après la clôture jusqu’à 22:30 heure de l’Est, si tu as fait une prévision ce jour-là.",
    knowledge: "Carte de connaissance",
    knowledgeHint: "Une fois par jour, de l’heure choisie jusqu’à 21:00 sur cet appareil. Les week-ends et jours fériés du marché américain gardent ce rappel.",
    event: "Boss d’événement",
    eventHint: "La veille au soir, puis pendant l’heure avant la publication. Remplace le rappel d’avant-ouverture ce jour-là.",
    time: "Heure de la carte",
    timeHint: "Heure locale de cet appareil. Par défaut, 12:30.",
    saved: "Choix de rappels enregistrés.",
    denied: "Les notifications sont bloquées. Sur iPhone : Réglages → Notifications → Monetizable. Sur Android ou ordinateur, autorise-les dans les réglages du navigateur.",
    cap: "Deux rappels maximum par jour.",
  },
  zh: {
    title: "伙伴提醒",
    intro: "星澜或查理可以在这台手机或电脑上提醒你。每条通知都会带上你选择的伙伴头像。",
    on: "这台设备已登记。每日提醒可以发到这里。",
    accountOnly: "你的账户已经开过提醒。把这台设备也登记上，就能在这里收到。iPhone 请先从主屏幕图标打开，那个图标单独保存登记。",
    off: "开启提醒",
    signIn: "登录后开启提醒",
    test: "发送一条测试提醒",
    testing: "正在发送测试提醒…",
    testSent: "测试提醒已发往这台设备。",
    testLater: "刚刚发过一条测试提醒，过一会儿可以再发。",
    testFailed: "测试提醒没能发出。请重新开启提醒后再试一次。",
    unsupported: "这个浏览器还不能显示提醒。iPhone 请使用 iOS 16.4 或更新版本，把 Monetizable 加到主屏幕后再从图标打开。",
    premarket: "盘前预测",
    premarketHint: "交易日，美股开盘前 45 分钟内，在你写下今天的判断之前。",
    review: "每日复盘",
    reviewHint: "交易日收盘后约 30 分钟起，直到美东 22:30，只发给当天做过预测的人。",
    knowledge: "知识卡牌",
    knowledgeHint: "每天一次，从你设定的时间起，直到这台设备当地 21:00。周末和美国休市日也会发送。",
    event: "事件 Boss",
    eventHint: "重大数据前一晚，以及公布前的 1 小时内。公布当天会代替盘前提醒。",
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
  const [signedIn, setSignedIn] = useState(false);
  const [accountSubscribed, setAccountSubscribed] = useState(false);
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);
  const [endpoint, setEndpoint] = useState("");
  const [permission, setPermission] = useState<ReminderPermission>("default");
  const [pushSupported, setPushSupported] = useState(true);
  const [card, setCard] = useState(false);
  const [note, setNote] = useState("");
  const [testing, setTesting] = useState(false);
  const state = reminderDeviceState({ pushSupported, permission, signedIn, deviceSubscribed, accountSubscribed });

  useEffect(() => {
    let active = true;
    const prefsPromise = fetch("/api/push/preferences", { cache: "no-store" }).then((response) => response.json()).catch(() => null);
    (async () => {
      const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
      let nextEndpoint = "";
      let nextPermission: ReminderPermission = supported ? Notification.permission : "unsupported";
      if (supported) {
        try {
          await navigator.serviceWorker.register("/sw.js");
          const registration = await navigator.serviceWorker.getRegistration();
          nextEndpoint = (await registration?.pushManager.getSubscription())?.endpoint || "";
        } catch {
          nextPermission = "unsupported";
        }
      }
      const [prefs, device] = await Promise.all([
        prefsPromise,
        fetch("/api/push/device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: nextEndpoint }),
        }).then((response) => response.json()).catch(() => null),
      ]);
      if (!active) return;
      setPushSupported(nextPermission !== "unsupported");
      setPermission(nextPermission);
      setEndpoint(nextEndpoint);
      if (prefs?.categories) setCategories(prefs.categories);
      if (prefs?.knowledgeTime) setKnowledgeTime(prefs.knowledgeTime);
      setSignedIn(Boolean(device?.signedIn ?? prefs?.user));
      setAccountSubscribed(Boolean(device?.accountSubscribed ?? prefs?.subscribed));
      setDeviceSubscribed(Boolean(device?.deviceSubscribed));
    })().catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function markRegistered() {
    setDeviceSubscribed(true);
    setAccountSubscribed(true);
    setSignedIn(true);
    setPermission("granted");
    setCard(false);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const next = (await registration?.pushManager.getSubscription())?.endpoint || "";
      if (next) setEndpoint(next);
    } catch {
      /* The status line already says this device is registered. */
    }
  }

  async function save(next: PushCategories, time = knowledgeTime) {
    setCategories(next);
    setKnowledgeTime(time);
    if (!accountSubscribed && !deviceSubscribed) return;
    const response = await fetch("/api/push/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: next, knowledgeTime: time, companion: hero, locale, timeZone: deviceTimeZone() }),
    });
    setNote(response.ok ? text.saved : "");
  }

  async function sendTest() {
    if (testing) return;
    setTesting(true);
    setNote("");
    if (!endpoint) {
      setNote(text.testFailed);
      setTesting(false);
      return;
    }
    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "knowledge", endpoint }),
      });
      const data = await response.json().catch(() => ({})) as { sent?: number; code?: string };
      if (response.ok && Number(data.sent) > 0) setNote(text.testSent);
      else if (response.status === 429 || data.code === "later") setNote(text.testLater);
      else setNote(text.testFailed);
    } catch {
      setNote(text.testFailed);
    } finally {
      setTesting(false);
    }
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
      {state === "blocked" && <p className="pwa-guide-tip" role="status">{text.denied}</p>}
      {state === "unsupported" && <p className="pwa-guide-tip" role="status">{text.unsupported}</p>}
      {state === "ready" && <p className="muted small-text" role="status">{text.on}</p>}
      {state === "account-only" && <p className="pwa-guide-tip" role="status">{text.accountOnly}</p>}
      {state === "ready" && <button type="button" className="secondary full" disabled={testing} onClick={() => void sendTest()}>{testing ? text.testing : text.test}</button>}
      {(state === "off" || state === "account-only") && <button type="button" className="secondary full" onClick={() => setCard(true)}>{text.off}</button>}
      {state === "signed-out" && <a className="secondary full" href={"/auth?next=" + encodeURIComponent("/?push=1")}>{text.signIn}</a>}
      {card && state !== "ready" && <CompanionPushCard categories={categories} knowledgeTime={knowledgeTime} onClose={() => setCard(false)} onSubscribed={() => { void markRegistered(); }} />}
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
