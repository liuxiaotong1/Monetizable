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
    color: "#9A9CFF",
    tag: "BULL + GAMEPAD + MARKET DATA",
    title: "Bull Controller · Selected",
    cn: "牛市手柄 · 已选定",
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
        <span className="eyebrow">OFFICIAL BRAND / BLUE-VIOLET BULL</span>
        <h1>
          {zh
            ? "Monetizable · 投资，也可以很好玩。"
            : "Monetizable. Investing meets play."}
        </h1>
        <p>
          {zh
            ? "Monetizable 已选定方案 03：蓝紫色牛市手柄。美元、游戏与股票线索融于同一图形，已应用到网站与 App 图标。"
            : "Monetizable’s official mark is concept 03: the blue-violet bull controller. Dollar, gaming and stock-market cues come together in the website and app icons."}
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
          ? "已采用方案 03：蓝紫色牛市手柄。蓝色 #63A8FF → 紫色 #B18BFA，美元符号使用亮蓝色 #87BFFF。"
          : "Selected: 03 Bull Controller. Blue #63A8FF → violet #B18BFA, with a bright-blue #87BFFF dollar sign."}
      </section>
      <p className="proposal-footer">
        {zh
          ? "当前正式标识为方案 03 的蓝紫版。其余图形保留为设计过程参考。"
          : "The blue-violet version of concept 03 is the official mark. Other concepts remain as design references."}
      </p>
    </main>
  );
}
