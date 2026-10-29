"use client";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { installedApp } from "@/lib/push/browser";
import CompanionPushCard from "./companion-push-card";

const installCopy = {
  en: {
    title: "Add Monetizable to your home screen",
    description: "Keep today’s quest one tap away. On iPhone, reminders start after you open the home-screen icon.",
    install: "Add to home screen",
    close: "Dismiss",
    ios: "In Safari, tap Share, then Add to Home Screen.",
    browser: "Choose Install app or Add to Home screen in your browser menu.",
  },
  fr: {
    title: "Ajoute Monetizable à ton écran d’accueil",
    description: "Garde la quête du jour à portée de main. Sur iPhone, les rappels commencent après l’ouverture depuis l’icône.",
    install: "Ajouter à l’écran d’accueil",
    close: "Fermer",
    ios: "Dans Safari, touche Partager, puis Sur l’écran d’accueil.",
    browser: "Dans le menu du navigateur, choisis Installer l’application ou Ajouter à l’écran d’accueil.",
  },
  zh: {
    title: "把 Monetizable 放到主屏幕",
    description: "今天的任务一按就到。iPhone 需要从主屏幕图标打开后，才能收到提醒。",
    install: "添加到主屏幕",
    close: "关闭",
    ios: "在 Safari 点“分享”，再选“添加到主屏幕”。",
    browser: "在浏览器菜单选择“安装应用”或“添加到主屏幕”。",
  },
} as const;

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function PwaPushGuide() {
  const locale = useLocale();
  const [pushOpen, setPushOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const text = installCopy[locale];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const standalone = installedApp();
    const dismissedPush = localStorage.getItem("monetizable-push-card-dismissed");
    const dismissedInstall = localStorage.getItem("monetizable-pwa-guide-dismissed-v1");
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const showPush = params.get("push") === "1" || (standalone && !dismissedPush);
    let installTimer = 0;
    if (showPush) setPushOpen(true);
    else if (!standalone && !dismissedInstall) installTimer = window.setTimeout(() => setInstallOpen(true), 6500);
    function onOpen() { setPushOpen(true); setInstallOpen(false); }
    function onInstall(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
      if (!installedApp()) setInstallOpen(true);
    }
    window.addEventListener("monetizable-open-push", onOpen);
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => {
      window.clearTimeout(installTimer);
      window.removeEventListener("monetizable-open-push", onOpen);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, []);

  if (pushOpen) {
    return <CompanionPushCard onClose={() => { localStorage.setItem("monetizable-push-card-dismissed", "yes"); setPushOpen(false); }} onSubscribed={() => localStorage.removeItem("monetizable-push-card-dismissed")} />;
  }
  if (!installOpen) return null;
  return (
    <aside className="pwa-guide" translate="no" aria-label={text.title}>
      <button className="pwa-guide-close" type="button" aria-label={text.close} onClick={() => { localStorage.setItem("monetizable-pwa-guide-dismissed-v1", "yes"); setInstallOpen(false); }}>×</button>
      <div className="pwa-guide-copy"><strong>{text.title}</strong><span>{text.description}</span></div>
      <div className="pwa-guide-actions">
        <button type="button" className="pwa-guide-install" onClick={() => { if (prompt) void prompt.prompt(); else setManual((value) => !value); }}>{text.install}</button>
      </div>
      {manual && <p className="pwa-guide-tip" role="status">{/iphone|ipad|ipod/i.test(navigator.userAgent) ? text.ios : text.browser}</p>}
    </aside>
  );
}
