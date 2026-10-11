"use client";
import { useEffect, useRef, useState } from "react";
import {
  Compass,
  Swords,
  Layers3,
  ArrowRight,
  X,
  Cloud,
  LogIn,
  LogOut,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { useDialogFocus } from "@/components/quest/use-dialog-focus";
import { mergeRecords } from "@/lib/quest/merge-records";
import {
  setBrowserIdentity,
  saveBrowserRecord,
  readBrowserRecord,
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
  const zh = !!user?.admin;
  const [ready, setReady] = useState(false),
    [sync, setSync] = useState(""),
    [tutorial, setTutorial] = useState(false),
    [step, setStep] = useState(0);
  const revision = useRef(0),
    writing = useRef(false),
    pending = useRef<BrowserRecord | null>(null),
    last = useRef(""),
    enabled = useRef(false),
    pendingTutorial = useRef(false),
    requestSync = useRef<() => Promise<void>>(async () => {});
  const dialog = useRef<HTMLElement>(null);
  useDialogFocus(dialog, tutorial, () => finish());
  const label = (en: string, cn: string) => (zh ? cn : en);
  useEffect(() => {
    let active = true;
    setBrowserIdentity(user?.id);
    document.documentElement.lang = zh ? "zh-CN" : "en";
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
          if (d.record) {
            const merged = mergeRecords(d.record, readBrowserRecord());
            last.current = JSON.stringify(d.record);
            saveBrowserRecord(merged);
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
  }, [user?.id, zh]);
  async function finish() {
    localStorage.setItem(`quest-tutorial:${user?.id || "guest"}:v1`, "done");
    setTutorial(false);
    if (user && enabled.current) {
      pendingTutorial.current = true;
      await requestSync.current();
    }
  }
  const steps = zh
    ? [
        {
          icon: Compass,
          number: "01",
          title: "先留下判断，再看结果",
          text: "每日盘前选择方向与信心，写一句理由。开盘后封存；收盘回看原始判断、当时剧本与实际行情。",
          detail: "经验值来自认真准备和复盘，不来自下单次数或承担风险。",
        },
        {
          icon: Swords,
          number: "02",
          title: "把重大事件变成能读懂的 Boss",
          text: "先看官方时间、前值与公布值，再理解利率、盈利预期与 QQQ 的影响路径。",
          detail: "周一至周五巴黎 14:15 盘前快报；周日 19:00 一周前瞻。",
        },
        {
          icon: Layers3,
          number: "03",
          title: "答一道题，解锁一个新理解",
          text: "五条学习路线：个股财报、期权、金融史、技术面与经济数据。先选答案，再展开讲解。",
          detail:
            "左滑安排下次复习一次，右滑表示掌握。登录后，记录跟随你的账号。",
        },
      ]
    : [
        {
          icon: Compass,
          number: "01",
          title: "Make your call. Learn from the close.",
          text: "Choose a direction and confidence before the bell. Add a reason. After the close, compare your original call with the actual market.",
          detail:
            "Earn XP for preparation and thoughtful reviews — never for trading more or taking more risk.",
        },
        {
          icon: Swords,
          number: "02",
          title: "Meet the next market Boss.",
          text: "See official event times, previous readings and confirmed releases. Understand the route from economic data to rates, earnings and QQQ.",
          detail:
            "Premarket brief: weekdays at 14:15 Paris. Weekly outlook: Sunday at 19:00 Paris. ET times adjust with daylight saving.",
        },
        {
          icon: Layers3,
          number: "03",
          title: "A good question is your next power-up.",
          text: "Explore earnings, options, financial history, technical analysis and economic data. Pick an answer to unlock the explanation.",
          detail:
            "Swipe left to review once on your next visit. Swipe right when you understand it. Sign in to carry your progress across devices.",
        },
      ];
  const current = steps[step];
  return (
    <>
      <div className="account-bar">
        <div>
          {user ? (
            <>
              <Cloud size={14} />
              <span>
                {sync ||
                  label(
                    "Your account. Your progress.",
                    "账号独立保存 · 跨设备同步",
                  )}
              </span>
            </>
          ) : (
            <>
              <span className="guest-dot" />
              <span>Explore first. Sign in when you’re ready.</span>
            </>
          )}
        </div>
        <nav>
          <button
            onClick={() => {
              setStep(0);
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
          <img src="/icon.svg" width="48" height="48" alt="" />
          <h1>QQQ Quest</h1>
          <p>{label("Preparing your adventure…", "正在准备你的冒险…")}</p>
        </main>
      )}
      {tutorial && (
        <div className="tutorial-backdrop">
          <section
            ref={dialog}
            className="tutorial-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-title"
          >
            <button
              className="tutorial-close"
              onClick={() => void finish()}
              aria-label={label("Close tutorial", "关闭引导")}
            >
              <X size={20} />
            </button>
            <div className="tutorial-label">
              QQQ QUEST <span>{label("QUICK START", "新手引导")}</span>
            </div>
            <div className="tutorial-illustration">
              <span className="orbit-one" />
              <span className="orbit-two" />
              <current.icon size={56} />
              <span className="tutorial-level">LEVEL {current.number}</span>
              <i>✦</i>
              <i>✧</i>
            </div>
            <span className="eyebrow">
              {label(
                "INVESTING, WITH A LITTLE MORE PLAY.",
                "让投资学习，多一点乐趣。",
              )}
            </span>
            <h2 id="tutorial-title">{current.title}</h2>
            <p>{current.text}</p>
            <div className="tutorial-tip">{current.detail}</div>
            <div className="tutorial-controls">
              <div className="tutorial-dots">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    aria-label={label(
                      `Tour step ${i + 1}`,
                      `引导第 ${i + 1} 步`,
                    )}
                    aria-current={step === i ? "step" : undefined}
                    onClick={() => setStep(i)}
                    className={step === i ? "active" : ""}
                  />
                ))}
              </div>
              <button
                className="primary"
                onClick={() => (step === 2 ? void finish() : setStep(step + 1))}
              >
                {step === 2
                  ? label("Start my quest", "开始冒险")
                  : label("Next", "下一步")}
                <ArrowRight size={17} />
              </button>
            </div>
            <button className="tutorial-skip" onClick={() => void finish()}>
              {label("I’ll explore on my own", "我想自己探索")}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
