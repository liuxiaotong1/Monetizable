import { currentUser, isAdmin } from "@/lib/account/auth";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Five brand directions · QQQ Quest",
  description: "Investing meets play: five name and logo concepts.",
};
const concepts = [
  {
    name: "StockQuest",
    slug: "stockquest",
    color: "#B6ED96",
    tag: "STOCKS + ADVENTURE",
    title: "Every market day is a new quest.",
    cn: "股票 × 冒险任务",
    description:
      "An ascending chart becomes a mountain trail, with a quest flag at the summit. Familiar finance signals meet a clear game world.",
    zh: "上升行情线变成登山路线，终点插上任务旗。股票与游戏冒险的含义一眼可见，最贴近每日判断与复盘。",
  },
  {
    name: "InvestArcade",
    slug: "investarcade",
    color: "#B5A0FA",
    tag: "INVESTING + ARCADE",
    title: "Make investing a little more playful.",
    cn: "投资 × 街机游乐场",
    description:
      "A joystick sits between candlesticks. A broader, warmer brand for investing education, quizzes and daily challenges.",
    zh: "摇杆结合两侧 K 线。名字直接出现 Invest 和 Arcade，更宽泛、轻松，适合把学习、答题与每日挑战做成投资游乐场。",
  },
  {
    name: "MarketXP",
    slug: "marketxp",
    color: "#79DDF4",
    tag: "MARKETS + EXPERIENCE POINTS",
    title: "Better questions. More experience.",
    cn: "市场 × 经验升级",
    description:
      "A mastery star, rising bars and an XP meter. Short, app-friendly, and centered on learning rather than taking more risk.",
    zh: "掌握之星、柱状行情和经验条结合。名字短、适合 App 图标，重点是能力升级；副标题补充 Investing，避免 Market 被理解成购物市场。",
  },
  {
    name: "PortfolioPlay",
    slug: "portfolioplay",
    color: "#FFBA78",
    tag: "PORTFOLIO + PLAY",
    title: "Build understanding before you build a portfolio.",
    cn: "投资组合 × 趣味探索",
    description:
      "An investment case contains a play button and a small chart. Friendly and recognizable, with room to expand beyond one ETF.",
    zh: "投资公文包里放入 Play 按钮和小行情线。专业但亲和，未来扩展到组合、资产配置与其他品种也合适；名字稍长。",
  },
  {
    name: "TickerQuest",
    slug: "tickerquest",
    color: "#F39CD3",
    tag: "TICKERS + DISCOVERY",
    title: "Find your next market discovery.",
    cn: "行情代码 × 探索任务",
    description:
      "A market compass framed by candlesticks. A distinctive name for stock explorers who enjoy discovering the story behind a ticker.",
    zh: "指南针搭配 K 线，表达行情探索。名字有辨识度，适合围绕个股代码追踪事件与财报；Ticker 对完全新手需要一句解释。",
  },
];
export default async function Page() {
  const zh = isAdmin(await currentUser());
  return (
    <main className="brand-proposals" lang={zh ? "zh-CN" : "en"}>
      <a className="brand" href="/">
        ← QQQ QUEST
      </a>
      <header className="proposal-heading">
        <span className="eyebrow">FIVE DIRECTIONS / ONE IDEA</span>
        <h1>
          {zh
            ? "把投资，变成值得期待的冒险。"
            : "Investing, with a little more play."}
        </h1>
        <p>
          {zh
            ? "五套名称与原创矢量 Logo 方向。每套都把投资线索与游戏语言放在一起，保持适合长期学习的气质。"
            : "Five original name and vector-logo directions. Financial cues meet the language of play — built for curiosity, preparation and learning."}
        </p>
      </header>
      <div className="proposal-grid">
        {concepts.map((c, i) => (
          <article className="proposal-card" key={c.slug}>
            <div className="proposal-logo">
              <span>0{i + 1} / BRAND CONCEPT</span>
              <img
                src={`/brand-proposals/${c.slug}.svg`}
                alt={`${c.name} logo`}
                width="135"
                height="135"
              />
            </div>
            <div className="proposal-wordmark" style={{ color: c.color }}>
              {c.name}
            </div>
            <div className="proposal-info">
              <span className="eyebrow" style={{ color: c.color }}>
                {c.tag}
              </span>
              <h2>{zh ? c.cn : c.title}</h2>
              <p>{zh ? c.zh : c.description}</p>
              <a href={`/brand-proposals/${c.slug}.svg`} download>
                {zh ? "下载 SVG Logo" : "Download SVG logo"} ↗
              </a>
            </div>
          </article>
        ))}
      </div>
      <section className="proposal-recommendation">
        {zh
          ? "首推 StockQuest：股票 + 游戏任务最直观，与当前 QQQ 的每日冒险贴合。若未来要覆盖更多投资品种，我更推荐 InvestArcade。"
          : "First pick: StockQuest — the clearest link between stocks and a daily game-like quest. Choose InvestArcade for a broader investing playground."}
      </section>
      <p className="proposal-footer">
        {zh
          ? "这是品牌概念提案，尚未完成商标、域名与 App 名称可用性核验。当前产品名称仍为 QQQ Quest，待你选定后再统一替换。"
          : "These are brand concepts. Trademark, domain and app-name availability have not been verified. QQQ Quest remains the current name until a direction is selected."}
      </p>
    </main>
  );
}
