"use client";
import TourPractice from './tour-practice';
import '@/components/quest/yelan.css';
import {useLocale,LocalizeTree} from '@/components/i18n/locale-provider';
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

type View = "today" | "events" | "learn";
type Step = { view: View; selector: string; title: [string, string, string]; text: [string, string, string]; navigation?: boolean };
const steps: Step[] = [
 {view:'today',selector:'.scenario-choices, #judgment .direction-options, #en-judgment, #judgment',title:['1 · Make your call','1 · 留下你的判断','1 · Faites votre prévision'],text:['Choose a direction and give one reason. After the close, compare your call with verified prices: a correct call lets Yelan defeat the Market Boss. Next, discover what could move the market.','选择方向，写一句理由。收盘后用已核实行情验证；判断正确，夜兰击败市场 Boss。接着看看，哪些事件可能影响市场。','Choisissez une direction et donnez une raison. Après la clôture, vérifiez votre prévision : si elle est juste, Yelan bat le Boss du marché. Découvrez ensuite ce qui peut faire bouger le marché.']},
 {view:'events',selector:'.boss-picks, .boss-quest, .en-event, .event-row',title:['2 · Read the Boss before predicting','2 · 看懂事件，再挑战 Boss','2 · Comprenez le Boss avant de prédire'],text:['Read the next release, previous value and consensus. Make your own prediction; a verified correct result unlocks victory. Turn unfamiliar concepts into your next learning quest.','查看即将公布的数据、前值与市场预期，再做预测。官方结果核实且预测正确时解锁胜利；不熟悉的概念，就去下一站学习。','Consultez la prochaine publication, la valeur précédente et le consensus. Faites votre prévision : un résultat confirmé et juste déclenche la victoire. Un concept inconnu ? Passez aux cartes !']},
 {view:'learn',selector:'.en-choices, .quiz-choices, .en-disposition, .swipe-actions, .swipe-deck, .card-stage, .en-deck-done, .premium-gate',title:['3 · Learn, then finish your deck','3 · 学懂卡片，完成任务','3 · Apprenez et terminez votre paquet'],text:['Answer to flip the card and read the explanation. Swipe left to review next visit, right when understood. Finish a pack to celebrate, then bring what you learned to your next daily prediction.','先答题，翻面看解释。左滑留待下次复习，右滑表示已学会。学完一叠就庆祝通关，再把新知识用到下一次每日判断。','Répondez, puis lisez l’explication au verso. Glissez à gauche pour revoir à la prochaine visite, à droite si vous avez compris. Terminez un paquet, célébrez, puis réutilisez vos acquis dans votre prochaine prévision.']},
];
type Bounds = { top: number; left: number; width: number; height: number };
export default function ProductTour({ zh, onFinish }: { zh: boolean; onFinish: () => void }) {
  const [index, setIndex] = useState(0), [bounds, setBounds] = useState<Bounds | null>(null), [position, setPosition] = useState({ top: 60, left: 16 });
  const panel = useRef<HTMLElement>(null), target = useRef<HTMLElement | null>(null);
  const locale=useLocale();
  const current = steps[index], language = zh ? 1 : locale==='fr'?2:0;
  const t=(en:string,cn:string,fr:string)=>[en,cn,fr][language];
  const next = () => index === steps.length - 1 ? onFinish() : setIndex(index + 1);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onFinish(); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); if (before?.isConnected) before.focus(); };
  }, [onFinish]);
  useEffect(() => {
    setBounds(null);
    const visible = (selector: string) => selector.split(",").map(part => [...document.querySelectorAll<HTMLElement>(part.trim())].find(el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden")).find(Boolean);
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
      <div className="tour-pointer" style={{top:Math.max(46,bounds.top-32),left:Math.min(Math.max(16,bounds.left+12),innerWidth-220)}}>{t('↓ Interact here on the page','↓ 页面上的互动位置','↓ Votre zone d’interaction')}</div>
    </> : <div className="tour-shade" style={{ inset: 0 }} />}
    <section ref={panel} className="tour-popover" style={position} role="dialog" aria-modal="false" aria-labelledby="tour-heading">
      <button className="tour-close" onClick={onFinish} aria-label={zh ? "关闭引导" : "Close tour"}><X size={18}/></button>
      <span className="eyebrow">{zh ? "操作引导" : "GUIDED WALKTHROUGH"} · {index + 1} / {steps.length}</span>
      <h2 id="tour-heading">{current.title[language]}</h2><p>{index===0?t('On the page: tap a direction card → add a reason → Save. Try the same steps below.','页面中：点方向卡片 → 写理由 → 保存。先在下方试一次。','Sur la page : carte de direction → raison → Enregistrer. Essayez ci-dessous.'):index===1?t('On the page: find the next Boss → compare with consensus → lock your prediction.','页面中：找到下一个 Boss → 对比市场预期 → 封存预测。','Sur la page : prochain Boss → comparaison au consensus → validation.'):t('On the page: tap an answer → read the back → swipe left to review or right when understood.','页面中：点答案 → 翻面看解释 → 左滑复习／右滑已学会。','Sur la page : réponse → explication au verso → gauche pour revoir, droite si compris.')}</p>
      <div className="tour-route">{[t('Daily Quest','今日冒险','Quête du jour'),t('Event Boss','事件 Boss','Boss économique'),t('Knowledge Deck','知识卡片','Cartes')].map((label,i)=><span key={i} className={i===index?'active':''}>{label}</span>)}</div>
      <TourPractice key={index} step={index}/>
      {!bounds && <p className="tour-wait">{zh ? "此区域暂无内容。可以继续下一步；引导不会生成示例交易。" : "This area has no content yet. Continue to the next step; the tour won’t create sample trades."}</p>}
      <div className="tour-controls"><button className="tour-back" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft size={15}/>{zh ? "上一步" : "Back"}</button><button className="primary tour-next" onClick={next}>{index === steps.length - 1 ? (zh ? "开始探索" : "Start exploring") : (zh ? "下一步" : "Next")}<ArrowRight size={15}/></button></div>
      <button className="tour-skip" onClick={onFinish}>{zh ? "跳过引导" : "Skip tour"}</button>
    </section>
  </div>}</LocalizeTree>;
}
