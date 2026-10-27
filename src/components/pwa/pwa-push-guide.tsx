"use client";
import { useEffect, useState } from "react";

type Locale = "en" | "fr" | "zh";
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
type PushSubscriptionJson = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};
const words: Record<Locale, Record<string, string>> = {
  en: {
    title: "Bring Monetizable to your home screen",
    description: "Keep your daily market quest one tap away.",
    install: "Add to home screen",
    reminders: "Enable pre-market reminder",
    active: "Pre-market reminder is on",
    stop: "Turn reminder off",
    close: "Dismiss this guide",
    ios: "In Safari, tap Share, then Add to Home Screen.",
    browser: "Choose Install app or Add to Home screen in your browser menu.",
    permission: "Allow notifications in your browser to receive the reminder.",
    installedFirst: "Add Monetizable to your home screen first, then enable notifications here.",
    saved: "Your reminder is ready for 08:30 New York time on market days.",
    removed: "Pre-market reminder turned off.",
    failed: "Please try again in your browser settings.",
    blocked: "Notifications are blocked for this site in your browser settings."
  },
  fr: {
    title: "Ajoutez Monetizable à votre écran d’accueil",
    description: "Retrouvez votre quête de marché quotidienne en un geste.",
    install: "Ajouter à l’écran d’accueil",
    reminders: "Activer le rappel avant l’ouverture",
    active: "Le rappel avant l’ouverture est activé",
    stop: "Désactiver le rappel",
    close: "Fermer le guide",
    ios: "Dans Safari, touchez Partager, puis Sur l’écran d’accueil.",
    browser: "Dans le menu du navigateur, choisissez Installer l’application ou Ajouter à l’écran d’accueil.",
    permission: "Autorisez les notifications dans votre navigateur pour recevoir le rappel.",
    installedFirst: "Ajoutez d’abord Monetizable à l’écran d’accueil, puis activez les notifications ici.",
    saved: "Votre rappel est prêt à 08:30, heure de New York, les jours de marché.",
    removed: "Rappel avant l’ouverture désactivé.",
    failed: "Réessayez dans les réglages de votre navigateur.",
    blocked: "Les notifications sont bloquées pour ce site dans les réglages du navigateur."
  },
  zh: {
    title: "把 Monetizable 放到桌面",
    description: "每天一键开启你的市场冒险。",
    install: "添加到主屏幕",
    reminders: "开启盘前提醒",
    active: "盘前提醒已开启",
    stop: "关闭提醒",
    close: "收起此引导",
    ios: "在 Safari 点“分享”，再选“添加到主屏幕”。",
    browser: "在浏览器菜单选择“安装应用”或“添加到主屏幕”。",
    permission: "允许浏览器发送通知，即可收到盘前提醒。",
    installedFirst: "先把 Monetizable 添加到主屏幕，再回来开启通知。",
    saved: "提醒已设好：每个美股交易日纽约时间 08:30。",
    removed: "盘前提醒已关闭。",
    failed: "请在浏览器设置中重试。",
    blocked: "此网站的通知权限已关闭，请到浏览器设置中开启。"
  }
};
function locale(): Locale {
  const lang = typeof document === "undefined" ? "en" : document.documentElement.lang.toLowerCase();
  return lang.startsWith("zh") ? "zh" : lang.startsWith("fr") ? "fr" : "en";
}
function installedApp() {
  const ios = navigator as Navigator & { standalone?: boolean };
  return Boolean(ios.standalone || window.matchMedia("(display-mode: standalone)").matches);
}
function decodeVapidKey(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
export default function PwaPushGuide() {
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [manual, setManual] = useState(false);
  const [pushKey, setPushKey] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const language = locale();
  const text = words[language];

  useEffect(() => {
    const isInstalled = installedApp();
    setInstalled(isInstalled);
    if (!localStorage.getItem("monetizable-pwa-guide-dismissed-v1")) {
      const timer = window.setTimeout(() => setVisible(true), 6500);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    function onInstall(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      setManual(false);
    }
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    let active = true;
    fetch("/api/push/config", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { publicKey?: string }) => {
        if (active) setPushKey(data.publicKey || "");
      })
      .catch(() => undefined);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then(async (registration) => {
        const subscription = await registration.pushManager?.getSubscription();
        if (active && subscription) setSubscribed(true);
      }).catch(() => undefined);
    }
    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) {
      setManual((value) => !value);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setInstallPrompt(null);
    }
  }

  async function togglePush() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIOS && !installedApp()) {
        setManual(true);
        setMessage(text.installedFirst);
        return;
      }
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !pushKey) {
        setMessage(text.failed);
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      if (current && subscribed) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: current.endpoint })
        });
        await current.unsubscribe();
        setSubscribed(false);
        setMessage(text.removed);
        return;
      }
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== "granted") {
        setMessage(permission === "denied" ? text.blocked : text.permission);
        return;
      }
      const subscription = current || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(pushKey)
      });
      const payload: PushSubscriptionJson = subscription.toJSON() as PushSubscriptionJson;
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: payload, locale: language })
      });
      if (!response.ok) throw new Error("Subscription could not be saved");
      setSubscribed(true);
      setMessage(text.saved);
    } catch {
      setMessage(text.failed);
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;
  return (
    <aside className="pwa-guide" aria-label={text.title}>
      <button className="pwa-guide-close" type="button" onClick={() => {
        localStorage.setItem("monetizable-pwa-guide-dismissed-v1", "yes");
        setVisible(false);
      }} aria-label={text.close}>×</button>
      <span className="pwa-guide-mark" aria-hidden="true">✦</span>
      <div className="pwa-guide-copy">
        <strong>{text.title}</strong>
        <span>{text.description}</span>
      </div>
      <div className="pwa-guide-actions">
        {!installed && <button type="button" className="pwa-guide-install" onClick={() => void install()}>{text.install}</button>}
        {pushKey && <button type="button" className="pwa-guide-push" disabled={busy} onClick={() => void togglePush()}>
          {subscribed ? text.active : text.reminders}
        </button>}
        {subscribed && <button type="button" className="pwa-guide-stop" disabled={busy} onClick={() => void togglePush()}>{text.stop}</button>}
      </div>
      {manual && !installed && <p className="pwa-guide-tip" role="status">{/iphone|ipad|ipod/i.test(typeof navigator === "undefined" ? "" : navigator.userAgent) ? text.ios : text.browser}</p>}
      {message && <p className="pwa-guide-tip" role="status">{message}</p>}
    </aside>
  );
}
