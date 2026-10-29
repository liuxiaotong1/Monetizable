"use client";
import { useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useHero } from "@/components/quest/hero-preference";
import { decodeVapidKey, deviceTimeZone, installedApp } from "@/lib/push/browser";
import { defaultCategories, type PushCategories } from "@/lib/push/prefs";

const copy = {
  en: {
    astra: "Turn on reminders so you never miss the daily prediction.",
    charlie: "Turn on reminders so you never miss the daily prediction.",
    action: "Turn on reminders",
    close: "Not now",
    working: "Turning reminders on…",
    saved: "Reminders are on. Astra or Charlie will tap you at the right moment.",
    signIn: "Sign in to save reminders on your account",
    installedFirst: "Add Monetizable to your Home Screen first. In Safari, tap Share, then Add to Home Screen. Open it from the icon, then turn reminders on.",
    unsupported: "This browser cannot show reminders yet. On iPhone, add Monetizable to the Home Screen with iOS 16.4 or newer.",
    denied: "Notifications are off for Monetizable. On iPhone, open Settings → Notifications → Monetizable and allow them. On Android or a computer, allow notifications for this site in the browser settings, then come back.",
    failed: "Reminders could not be saved. Try again in a moment.",
    unavailable: "Reminders are not switched on for this site yet.",
  },
  fr: {
    astra: "Active les rappels pour ne pas manquer la prévision du jour.",
    charlie: "Active les rappels pour ne pas manquer la prévision du jour.",
    action: "Activer les rappels",
    close: "Plus tard",
    working: "Activation des rappels…",
    saved: "Les rappels sont activés. Astra ou Charlie te préviendra au bon moment.",
    signIn: "Connecte-toi pour enregistrer les rappels sur ton compte",
    installedFirst: "Ajoute d’abord Monetizable à l’écran d’accueil. Dans Safari, touche Partager, puis Sur l’écran d’accueil. Ouvre l’icône, puis active les rappels.",
    unsupported: "Ce navigateur ne peut pas encore afficher les rappels. Sur iPhone, ajoute Monetizable à l’écran d’accueil avec iOS 16.4 ou plus récent.",
    denied: "Les notifications sont désactivées pour Monetizable. Sur iPhone : Réglages → Notifications → Monetizable. Sur Android ou ordinateur, autorise-les dans les réglages du navigateur, puis reviens ici.",
    failed: "Les rappels n’ont pas pu être enregistrés. Réessaie dans un instant.",
    unavailable: "Les rappels ne sont pas encore activés sur ce site.",
  },
  zh: {
    astra: "打开提醒，别错过今天的预测。",
    charlie: "打开提醒，别错过今天的预测。",
    action: "开启提醒",
    close: "稍后再说",
    working: "正在开启提醒…",
    saved: "提醒已开启。星澜或查理会在该来的时候叫你。",
    signIn: "登录后才能把提醒记在你的账户上",
    installedFirst: "请先把 Monetizable 添加到主屏幕。在 Safari 点“分享”，再选“添加到主屏幕”。从主屏幕图标打开后，再开启提醒。",
    unsupported: "这个浏览器还不能显示提醒。iPhone 请使用 iOS 16.4 或更新版本，并把 Monetizable 添加到主屏幕。",
    denied: "系统已关闭 Monetizable 的通知。iPhone 请到「设置 → 通知 → Monetizable」打开；安卓或电脑请在浏览器设置里允许本站通知，然后再回来。",
    failed: "提醒暂时没能保存，请稍后再试。",
    unavailable: "这个网站的提醒还没准备好。",
  },
} as const;

export default function CompanionPushCard({ categories = defaultCategories(), knowledgeTime = "12:30", onClose, onSubscribed }: {
  categories?: PushCategories;
  knowledgeTime?: string;
  onClose?: () => void;
  onSubscribed?: () => void;
}) {
  const locale = useLocale();
  const hero = useHero();
  const text = copy[locale];
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const name = hero === "female" ? (locale === "zh" ? "星澜" : "Astra") : (locale === "zh" ? "查理" : "Charlie");
  const line = hero === "female" ? text.astra : text.charlie;
  const portrait = hero === "female" ? "/push/astra-192.png" : "/push/charlie-192.png";

  async function enable() {
    if (busy) return;
    setBusy(true);
    setNote("");
    try {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (ios && !installedApp()) {
        setNote(text.installedFirst);
        return;
      }
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setNote(text.unsupported);
        return;
      }
      const profile = await fetch("/api/profile", { cache: "no-store" }).then((response) => response.json()).catch(() => null);
      if (!profile?.user) {
        location.href = "/auth?next=" + encodeURIComponent("/?push=1");
        return;
      }
      if (Notification.permission === "denied") {
        setNote(text.denied);
        return;
      }
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setNote(permission === "denied" ? text.denied : text.failed);
        return;
      }
      const config = await fetch("/api/push/config", { cache: "no-store" }).then((response) => response.json()) as { publicKey?: string };
      if (!config.publicKey) {
        setNote(text.unavailable);
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      const subscription = current || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(config.publicKey) });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          locale,
          companion: hero,
          timeZone: deviceTimeZone(),
          categories,
          knowledgeTime,
        }),
      });
      if (response.status === 401) {
        location.href = "/auth?next=" + encodeURIComponent("/?push=1");
        return;
      }
      if (!response.ok) throw new Error("save");
      setNote(text.saved);
      onSubscribed?.();
    } catch {
      setNote(text.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="pwa-guide companion-push-card" translate="no" aria-label={name}>
      {onClose && <button className="pwa-guide-close" type="button" onClick={onClose} aria-label={text.close}>×</button>}
      <img className="companion-push-avatar" src={portrait} alt="" width={64} height={64} />
      <div className="pwa-guide-copy">
        <strong>{name}</strong>
        <span>{line}</span>
      </div>
      <div className="pwa-guide-actions">
        <button type="button" className="pwa-guide-install" disabled={busy} onClick={() => void enable()}>{busy ? text.working : text.action}</button>
        {onClose && <button type="button" className="pwa-guide-push" onClick={onClose}>{text.close}</button>}
      </div>
      {note && <p className="pwa-guide-tip" role="status">{note}</p>}
    </aside>
  );
}
