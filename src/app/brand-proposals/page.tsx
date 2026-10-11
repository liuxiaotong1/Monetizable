import { currentUser, isAdmin } from "@/lib/account/auth";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Monetizable · Five logo directions",
  description:
    "Dollar signs, game controls and stock charts: five Monetizable logo concepts.",
};
const concepts = [
  {
    name: "Monetizable",
    slug: "monetizable-01",
    color: "#C5F49B",
    tag: "DOLLAR + CONTROLLER + CANDLESTICKS",
    title: "Dollar Pad",
    cn: "美元手柄",
    description:
      "The dollar sign and candlesticks become the two sides of a game controller. A clear investing-meets-play mark, designed to remain legible as an app icon.",
    zh: "美元符号与 K 线分别成为手柄的两侧。投资与游戏一眼可见，轮廓简洁，最适合作为 App 主图标。",
  },
  {
    name: "Monetizable",
    slug: "monetizable-02",
    color: "#F5D37D",
    tag: "PIXEL DOLLAR + COIN + STOCK CHART",
    title: "Pixel Coin",
    cn: "像素金币",
    description:
      "A pixel dollar coin, a directional pad and a rising price path. More retro and collectible, ideal for learning rewards and badges.",
    zh: "像素美元金币，结合方向键与行情线。偏复古街机，适合知识奖励、收藏徽章和轻松的学习体验。",
  },
  {
    name: "Monetizable",
    slug: "monetizable-03",
    color: "#82DECF",
    tag: "BULL + GAMEPAD + MARKET DATA",
    title: "Bull Controller",
    cn: "牛市手柄",
    description:
      "Bull horns extend a controller silhouette. A dollar and stock candles stay inside the mark: playful, bold and unmistakably market-related.",
    zh: "牛角融入手柄外轮廓，美元与 K 线藏在内部。更有角色感、辨识度强，适合做会动的品牌小伙伴。",
  },
  {
    name: "Monetizable",
    slug: "monetizable-04",
    color: "#AFA4FF",
    tag: "MONOGRAM M + DOLLAR + GAME CONTROLS",
    title: "Level M",
    cn: "升级字母 M",
    description:
      "Monetizable’s M doubles as a market path; a dollar coin and game controls complete the mark. The most compact brand-led direction.",
    zh: "Monetizable 的 M 变成行情走势，搭配美元金币和游戏按键。更像成熟品牌，适合导航、头像与字母标记。",
  },
  {
    name: "Monetizable",
    slug: "monetizable-05",
    color: "#FFB88A",
    tag: "DOLLAR SCREEN + STOCK CHART + ARCADE",
    title: "Market Arcade",
    cn: "股市街机",
    description:
      "An arcade cabinet with a dollar and stock chart on screen. The most explicit game-world concept, with room for small animated interactions.",
    zh: "街机屏幕里放入美元与行情线，配上摇杆和按钮。游戏氛围最强，适合引导页、加载动画和活动视觉。",
  },
];
export default async function Page() {
  const zh = isAdmin(await currentUser());
  return (
    <main className="brand-proposals" lang={zh ? "zh-CN" : "en"}>
      <a className="brand" href="/">
        ← Monetizable
      </a>
      <header className="proposal-heading">
        <span className="eyebrow">ONE NAME / FIVE LOGO DIRECTIONS</span>
        <h1>
          {zh
            ? "Monetizable · 投资，也可以很好玩。"
            : "Monetizable. Investing meets play."}
        </h1>
        <p>
          {zh
            ? "名字已定为 Monetizable。这次只选图形：美元符号 × 游戏元素 × 股票行情，五种不同表达。"
            : "The name is Monetizable. Now choose the mark: a dollar sign, game language and stock-market signals, in five original vector directions."}
        </p>
      </header>
      <div className="proposal-grid">
        {concepts.map((c, i) => (
          <article className="proposal-card" key={c.slug}>
            <div className="proposal-logo">
              <span>0{i + 1} / BRAND CONCEPT</span>
              <img
                src={`/brand-proposals/${c.slug}.svg`}
                alt={`Monetizable ${c.title} logo concept`}
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
          ? "首推 01 美元手柄：投资与游戏的结合最直接，小尺寸也容易辨认。偏角色化选 03，偏复古趣味选 02。"
          : "First pick: 01 Dollar Pad — the clearest investing-meets-gaming mark, with a clean silhouette for small app icons. Choose 03 for more character or 02 for retro charm."}
      </section>
      <p className="proposal-footer">
        {zh
          ? "五套均为 Monetizable 的原创图形提案，可下载 SVG。名称已确定；最终图标待你选定后再统一替换。"
          : "Five original Monetizable logo concepts, available as SVG downloads. The name is fixed; the final app icon will follow your selected direction."}
      </p>
    </main>
  );
}
