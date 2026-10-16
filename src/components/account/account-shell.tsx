"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Cloud,
  LogIn,
  LogOut,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { transferKey } from "@/lib/quest/guest-access";
import {LocalizeTree,useLocale,LanguageSwitcher} from '@/components/i18n/locale-provider';
import ProductTour from "./product-tour";
import { mergeRecords } from "@/lib/quest/merge-records";
import {
  setBrowserIdentity,
  saveBrowserRecord,
  readBrowserRecord,
  emptyBrowserRecord,
  type BrowserRecord,
} from "@/lib/quest/browser-store";
export interface AccountUser {
  id: string;
  email?: string;
  admin: boolean;
}
export default function AccountShell({
  user,
  children,
}: {
  user: AccountUser | null;
  children: React.ReactNode;
}) {
  const locale=useLocale(),zh = locale==='zh';
  const [ready, setReady] = useState(false),
    [sync, setSync] = useState(""),
    [tutorial, setTutorial] = useState(false);
  const revision = useRef(0),
    writing = useRef(false),
    pending = useRef<BrowserRecord | null>(null),
    last = useRef(""),
    enabled = useRef(false),
    pendingTutorial = useRef(false),
    requestSync = useRef<() => Promise<void>>(async () => {});
  const label = (en: string, cn: string) => (zh ? cn : en);
  useEffect(() => {
    let active = true;
    setBrowserIdentity(user?.id);
    document.documentElement.lang = zh ? "zh-CN" : locale;
    const tutorialKey = `quest-tutorial:${user?.id || "guest"}:v1`;
    async function bootstrap() {
      try {
        if (user) {
          const r = await fetch("/api/profile", { cache: "no-store" }),
            d = await r.json();
          if (!r.ok) throw Error(d.error);
          if (!active) return;
          revision.current = Number(d.revision);
          enabled.current = true;
          {
            const cloud = d.record || emptyBrowserRecord();
            let local = readBrowserRecord();
            const transfer = localStorage.getItem(transferKey) === "yes";
            if (transfer) {
              const guest = readBrowserRecord("qqq-quest-public:v1");
              // Transfer only explicitly claimed learning; never turn a draft into a locked call.
              guest.judgments = []; guest.forecasts = []; guest.notes = {}; guest.adventure = undefined; guest.settingsUpdatedAt = undefined; guest.readNotices = [];
              guest.rewards = guest.rewards.filter(key => key.startsWith("card:"));
              guest.xp = guest.rewards.length * 5;
              local = mergeRecords(local, guest);
            }
            const merged = mergeRecords(cloud, local);
            last.current = JSON.stringify(cloud);
            saveBrowserRecord(merged);
            if (transfer) localStorage.removeItem(transferKey);
          }
          enabled.current = true;
          setTutorial(!d.tutorial_done && !localStorage.getItem(tutorialKey));
        } else setTutorial(!localStorage.getItem(tutorialKey));
      } catch {
        if (active)
          setSync(
            zh
              ? "云端记录暂不可读取，保留本机副本；请刷新重试。"
              : "Cloud progress is unavailable. Your browser copy is safe; reload to retry.",
          );
      } finally {
        if (active) setReady(true);
      }
    }
    async function flush() {
      if (
        writing.current ||
        !enabled.current ||
        (!pending.current && !pendingTutorial.current)
      )
        return;
      writing.current = true;
      const record = pending.current,
        tutorialDone = pendingTutorial.current;
      pending.current = null;
      setSync(zh ? "正在保存…" : "Saving…");
      try {
        const r = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              record: record || undefined,
              tutorialDone: tutorialDone ? true : undefined,
              revision: revision.current,
            }),
          }),
          d = await r.json();
        if (r.status === 409) {
          const fresh = await fetch("/api/profile", { cache: "no-store" }),
            remote = await fresh.json();
          if (!fresh.ok || !remote.record)
            throw Error("Account progress unavailable.");
          revision.current = Number(remote.revision);
          if (pending.current || record) {
            pending.current = mergeRecords(
              remote.record,
              pending.current || record!,
            );
            saveBrowserRecord(pending.current);
          }
          last.current = JSON.stringify(remote.record);
          setSync(
            zh
              ? "正在合并其他设备的进度…"
              : "Merging progress from another device…",
          );
          return;
        }
        if (!r.ok) {
          enabled.current = false;
          throw Error(d.error);
        }
        revision.current = Number(d.revision);
        if (record) last.current = JSON.stringify(record);
        if (tutorialDone) pendingTutorial.current = false;
        setSync(zh ? "云端已同步" : "Cloud synced");
      } catch (e) {
        setSync(
          zh
            ? "云端保存失败，本机副本已保留；请刷新重试。"
            : e instanceof Error
              ? e.message
              : "Cloud save failed. Your browser copy is safe.",
        );
      } finally {
        writing.current = false;
        if ((pending.current || pendingTutorial.current) && enabled.current)
          void flush();
      }
    }
    requestSync.current = flush;
    const change = (event: Event) => {
      if (!user || !enabled.current) return;
      const record = (event as CustomEvent<BrowserRecord>).detail;
      if (JSON.stringify(record) === last.current) return;
      pending.current = structuredClone(record);
      void flush();
    };
    window.addEventListener("quest-progress", change);
    void bootstrap();
    return () => {
      active = false;
      enabled.current = false;
      window.removeEventListener("quest-progress", change);
    };
  }, [user?.id, zh,locale]);
  const finish = useCallback(async () => {
    localStorage.setItem(`quest-tutorial:${user?.id || "guest"}:v1`, "done");
    setTutorial(false);
    if (user && enabled.current) {
      pendingTutorial.current = true;
      await requestSync.current();
    }
  }, [user?.id]);
  return <LocalizeTree>{(
    <>
      <div className="account-bar">
        <div>
          <a
            className="account-mobile-brand"
            href="/"
            aria-label="Monetizable home"
          >
            <img
              src="/brand/monetizable-curious-m.svg"
              width="30"
              height="30"
              alt=""
            />
            <strong>Monetizable</strong>
          </a>
          {user ? (
            <>
              <Cloud className="account-status" size={14} />
              <span className="account-status">
                {sync ||
                  label(
                    "Your account. Your progress.",
                    "账号独立保存 · 跨设备同步",
                  )}
              </span>
            </>
          ) : (
            <>
              <span className="guest-dot account-status" />
              <span className="account-status">
                Sign in to save your learning progress.
              </span>
            </>
          )}
        </div>
        <nav>
          <LanguageSwitcher admin={!!user?.admin}/>
          <button
            onClick={() => {
              setTutorial(true);
            }}
          >
            <GraduationCap size={16} />
            {label("Quick tour", "使用引导")}
          </button>
          {user?.admin && (
            <a href="/admin">
              <ShieldCheck size={16} />
              管理中心
            </a>
          )}
          {user ? (
            <button
              onClick={async () => {
                const r = await fetch("/api/auth/sign-out", { method: "POST" });
                if (r.ok) location.assign("/");
                else
                  setSync(
                    label("Sign-out failed; try again.", "退出失败，请重试。"),
                  );
              }}
            >
              <LogOut size={15} />
              {label("Sign out", "退出")}
            </button>
          ) : (
            <a className="account-login" href="/auth">
              <LogIn size={15} />
              Sign in
            </a>
          )}
        </nav>
      </div>
      {ready ? (
        children
      ) : (
        <main className="loading-screen">
          <img
            src="/brand/monetizable-curious-m.svg"
            width="48"
            height="48"
            alt=""
          />
          <h1>Monetizable</h1>
          <p>{label("Preparing your adventure…", "正在准备你的冒险…")}</p>
        </main>
      )}
      {ready && tutorial && <ProductTour zh={zh} onFinish={finish} />}
    </>
  )}</LocalizeTree>;
}
