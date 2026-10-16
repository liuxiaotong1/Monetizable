"use client";
import {LocalizeTree} from '@/components/i18n/locale-provider';
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

type View = "today" | "events" | "learn";
type Step = { view: View; selector: string; title: [string, string]; text: [string, string]; navigation?: boolean };
const steps: Step[] = [
  { view: "today", selector: '[data-tour-nav="today"]', navigation: true, title: ["Start with Daily Quest", "从今日冒险开始"], text: ["This button opens your daily preparation and review. On your phone, find it in the bottom navigation. Click the highlighted button or Next to explore it.", "这个按钮进入每日准备与复盘；手机上位于底部导航。点击高亮按钮或「下一步」开始。"] },
  { view: "today", selector: '.en-hero .primary, .hero .primary', title: ["Play today's first quest", "开始今天的第一项任务"], text: ["Play for free scrolls to today's first market quest. Choose a scenario and write one reason. This tour never submits a prediction for you.", "「免费开始玩」会滚动到今天的第一项市场任务。选择一个剧本并写下一句理由。引导不会替你提交判断。"] },
  { view: "today", selector: '#en-judgment button.primary, #judgment .primary', title: ["Record your own prediction", "留下你的盘前判断"], text: ["Choose direction and confidence, then write your reason. Guests can try the form; saving asks for an account. Scored predictions must be locked before the opening bell. This tour never submits a prediction for you.", "选择方向、信心并写一句理由，再主动保存封存。引导不会替你提交判断。开盘后或休市日，不能补写盘前判断。"] },
  { view: "today", selector: '.en-week summary, .tracking-nav', title: ["Track your judgment over time", "回看一周的判断记录"], text: ["Expand a week to compare daily calls and results. Missing or late predictions are kept separate from eligible premarket results.", "展开一周，逐日对照判断与结果；漏做或开盘后补写的记录不会混入盘前命中统计。"] },
  { view: "events", selector: '[data-tour-nav="events"]', navigation: true, title: ["Open Event Boss", "进入事件 Boss"], text: ["This is your event map: important economic releases and earnings first, market commentary afterward. Click the highlighted button or Next.", "这里先展示重要经济数据与财报，再看市场解读。点击高亮按钮或「下一步」进入。"] },
  { view: "events", selector: '.en-event summary, .event-row, .en-next-boss, .boss-hero', title: ["Open an event’s briefing", "点击事件，展开作战情报"], text: ["Open an event to see the release time, previous reading, market forecast and confirmed result, with sources. A missing reading means it has not been verified yet.", "点击事件查看发布时间、前值、市场预测、已确认结果与来源。没有可靠数值时，会明确保留待确认状态。"] },
  { view: "events", selector: '[data-tour="briefs"] .eyebrow, .agent-hub-heading', title: ["Find the premarket brief and week ahead", "查看盘前快报与一周前瞻"], text: ["Your premarket brief and Sunday outlook live here. The source section is folded at the bottom; expand it when you want to check market forecasts, commentary and sentiment.", "盘前快报与周日前瞻都在这里。页面底部的信息来源默认折叠，需要核对预测、解读与市场情绪时再展开。"] },
  { view: "learn", selector: '[data-tour-nav="learn"]', navigation: true, title: ["Open Knowledge Deck", "进入知识卡片"], text: ["Use this button to learn through questions across five paths. Click the highlighted button or Next to see how a card works.", "从这个按钮进入五条学习路线，用问题学习。点击高亮按钮或「下一步」，看看卡片怎么使用。"] },
  { view: "learn", selector: '.en-choices, .quiz-choices, .en-answer, .quiz-reveal, .en-deck-done, .card-stage', title: ["Pick an answer to reveal the explanation", "先选答案，再解锁讲解"], text: ["Select an option on the card. It flips to the correct answer and explanation; a correct answer gets a little celebration. The tour does not answer or grade a card for you.", "在卡片中选择答案，随后翻面展示正确答案与讲解；答对会有小庆祝。引导不会替你答题或改变学习成绩。"] },
  { view: "learn", selector: '.en-disposition, .swipe-actions, .en-deck-done, .card-stage', title: ["Decide what to review", "决定是否还需要复习"], text: ["After reading the explanation, swipe left or use the left button to review once next visit. Swipe right or use the right button when mastered. These buttons stay disabled until you answer. You can reopen this tour from Quick tour at the top.", "看完讲解后，左滑或点左侧按钮，在下次访问复习一次；右滑或点右侧按钮表示已掌握。答题前按钮不可用。以后随时可从顶部「使用引导」重新打开。"] },
];
type Bounds = { top: number; left: number; width: number; height: number };
export default function ProductTour({ zh, onFinish }: { zh: boolean; onFinish: () => void }) {
  const [index, setIndex] = useState(0), [bounds, setBounds] = useState<Bounds | null>(null), [position, setPosition] = useState({ top: 60, left: 16 });
  const panel = useRef<HTMLElement>(null), target = useRef<HTMLElement | null>(null);
  const current = steps[index], language = zh ? 1 : 0;
  const next = () => index === steps.length - 1 ? onFinish() : setIndex(index + 1);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onFinish(); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); if (before?.isConnected) before.focus(); };
  }, [onFinish]);
  useEffect(() => {
    setBounds(null);
    const visible = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)].find(el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
    // Use the same real navigation controls as a visitor; never submit forms or answer cards.
    let scrolled = false;
    let navigated = false;
    const locate = () => {
      if (!navigated) { const nav = visible(`.sidebar [data-tour-nav="${current.view}"], .mobile-nav [data-tour-nav="${current.view}"], .bottom-nav [data-tour-nav="${current.view}"]`); if (nav) { navigated = true; if (!nav.classList.contains("active")) { nav.click(); window.scrollTo({ top: 0, behavior: "instant" }); } } }
      const el = visible(current.navigation ? `.sidebar [data-tour-nav="${current.view}"], .mobile-nav [data-tour-nav="${current.view}"], .bottom-nav [data-tour-nav="${current.view}"]` : current.selector);
      target.current = el || null;
      if (!el) return;
      if (!scrolled) { el.scrollIntoView({ behavior: "instant", block: "start", inline: "nearest" }); if (getComputedStyle(el.closest("nav") || el).position !== "fixed") window.scrollBy({ top: -72, behavior: "instant" }); scrolled = true; }
      const rect = el.getBoundingClientRect();
      const updated = { top: Math.max(0, rect.top - 5), left: Math.max(0, rect.left - 5), width: Math.min(innerWidth - Math.max(0, rect.left - 5), rect.width + 10), height: Math.min(innerHeight, rect.bottom + 5) - Math.max(0, rect.top - 5) };
      setBounds(previous => previous && Object.keys(updated).every(key => previous[key as keyof Bounds] === updated[key as keyof Bounds]) ? previous : updated);
    };
    locate();
    const observer = new MutationObserver(locate); observer.observe(document.body, { childList: true, subtree: true });
    const resize = new ResizeObserver(locate); resize.observe(document.body);
    window.addEventListener("resize", locate); window.addEventListener("scroll", locate, true);
    const click = (event: MouseEvent) => { if (event.isTrusted && current.navigation && target.current?.contains(event.target as Node)) setIndex(i => Math.min(i + 1, steps.length - 1)); };
    document.addEventListener("click", click);
    return () => { observer.disconnect(); resize.disconnect(); window.removeEventListener("resize", locate); window.removeEventListener("scroll", locate, true); document.removeEventListener("click", click); };
  }, [current]);
  useLayoutEffect(() => {
    const height = panel.current?.offsetHeight || 260, width = Math.min(360, innerWidth - 32);
    let top = bounds ? bounds.top + bounds.height + 14 : 60;
    if (top + height > innerHeight - 16) {
      const above = bounds ? bounds.top - height - 14 : 60;
      top = above >= 52 ? above : Math.max(52, innerHeight - height - 16);
    }
    if (top < 52) top = Math.max(52, Math.min(innerHeight - height - 16, bounds ? bounds.top : 60));
    let left = bounds ? Math.min(innerWidth - width - 16, Math.max(16, bounds.left)) : (innerWidth - width) / 2;
    // Tall panels use the free space beside the target on desktop.
    if (bounds && bounds.height > innerHeight / 2 && bounds.left > width + 24) { left = 16; top = Math.max(60, Math.min(bounds.top, innerHeight - height - 16)); }
    setPosition({ top, left });
  }, [bounds, index]);
  useEffect(() => { panel.current?.querySelector<HTMLButtonElement>(".tour-next")?.focus({ preventScroll: true }); }, [index]);
  return <LocalizeTree>{<div className="product-tour">
    {bounds && bounds.height > 0 ? <>
      <div className="tour-shade" style={{ top: 0, left: 0, width: "100%", height: bounds.top }} />
      <div className="tour-shade" style={{ top: bounds.top, left: 0, width: bounds.left, height: bounds.height }} />
      <div className="tour-shade" style={{ top: bounds.top, left: bounds.left + bounds.width, right: 0, height: bounds.height }} />
      <div className="tour-shade" style={{ top: bounds.top + bounds.height, left: 0, bottom: 0, width: "100%" }} />
      <div className="tour-spotlight" style={bounds} />
    </> : <div className="tour-shade" style={{ inset: 0 }} />}
    <section ref={panel} className="tour-popover" style={position} role="dialog" aria-modal="false" aria-labelledby="tour-heading">
      <button className="tour-close" onClick={onFinish} aria-label={zh ? "关闭引导" : "Close tour"}><X size={18}/></button>
      <span className="eyebrow">{zh ? "操作引导" : "GUIDED WALKTHROUGH"} · {index + 1} / {steps.length}</span>
      <h2 id="tour-heading">{current.title[language]}</h2><p>{current.text[language]}</p>
      {!bounds && <p className="tour-wait">{zh ? "此区域暂无内容。可以继续下一步；引导不会生成示例交易。" : "This area has no content yet. Continue to the next step; the tour won’t create sample trades."}</p>}
      <div className="tour-controls"><button className="tour-back" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft size={15}/>{zh ? "上一步" : "Back"}</button><button className="primary tour-next" onClick={next}>{index === steps.length - 1 ? (zh ? "开始探索" : "Start exploring") : (zh ? "下一步" : "Next")}<ArrowRight size={15}/></button></div>
      <button className="tour-skip" onClick={onFinish}>{zh ? "跳过引导" : "Skip tour"}</button>
    </section>
  </div>}</LocalizeTree>;
}
