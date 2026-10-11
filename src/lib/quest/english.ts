import cards from "@/data/english-cards.json";
import type { QuestState, LearningCard, EventKind, MarketEvent } from "./types";
export const directions = {
  bullish: "Bullish",
  neutral: "Range-bound",
  bearish: "Bearish",
};
export const themes = {
  earnings: "Stock earnings",
  options: "Options",
  history: "Financial history",
  technical: "Technical analysis",
  events: "Economic data",
};
const explain: Record<EventKind, [string, string, string]> = {
  CPI: [
    "Consumer Price Index",
    "The economy’s thermometer: price changes in a consumer basket.",
    "Inflation can change interest-rate expectations and discount rates. Separate headline, core, monthly and yearly measures.",
  ],
  PCE: [
    "PCE inflation",
    "A wider consumption thermometer, with different weights from CPI.",
    "The Fed’s inflation objective uses PCE. Compare the trend, components and revisions.",
  ],
  NFP: [
    "US employment report",
    "A jobs scoreboard with more than one survey.",
    "Payrolls, unemployment, wages and participation can point in different directions. Growth and rate expectations both matter.",
  ],
  GDP: [
    "Gross Domestic Product",
    "The economy’s production scoreboard.",
    "Check real versus nominal and annualized versus yearly growth. Revisions can change the picture.",
  ],
  FOMC: [
    "Federal Reserve rate decision",
    "The Fed sets the rent of short-term money.",
    "Rates and guidance can change financing costs and valuations. The surprise relative to expectations matters.",
  ],
  EARNINGS: [
    "Company earnings",
    "A company’s scorecard — with a preview of the next round.",
    "Read revenue, margins, cash conversion and guidance together. A headline beat does not guarantee a rally.",
  ],
  PPI: [
    "Producer Price Index",
    "A thermometer closer to the factory door.",
    "Producer prices can illuminate cost pressure, but do not translate mechanically into consumer inflation.",
  ],
  CLAIMS: [
    "Initial unemployment claims",
    "The labor market’s weekly warning light.",
    "Weekly data can be noisy. Revisions and multi-week trends add context.",
  ],
  ISM: [
    "ISM purchasing managers survey",
    "Ask businesses whether the room feels warmer or colder.",
    "A diffusion index is not a growth percentage. Compare orders, employment and prices separately.",
  ],
  CONFIDENCE: [
    "Consumer sentiment",
    "The wallet’s mood, not its bank balance.",
    "Sentiment and spending are different. Inflation expectations within the survey may also matter.",
  ],
  MINUTES: [
    "FOMC meeting minutes",
    "The transcript arrives after the team announced its tactics.",
    "Minutes describe an earlier meeting. Publication is not a new rate decision.",
  ],
  BEIGE_BOOK: [
    "Federal Reserve Beige Book",
    "A collection of local economic weather reports.",
    "Qualitative regional observations add context; this report has no single headline number.",
  ],
  RETAIL: [
    "Retail sales",
    "A checkout-counter snapshot.",
    "Check components, revisions and nominal versus inflation-adjusted changes.",
  ],
  TRADE: [
    "International trade balance",
    "The economy’s cross-border ledger.",
    "A deficit is imports exceeding exports. Its change alone does not establish whether growth is healthy.",
  ],
  JOLTS: [
    "Job openings and labor turnover",
    "A map of hiring doors, quits and job openings.",
    "Openings, hires and quits illuminate demand and worker confidence, with revisions and survey limits.",
  ],
};
export function eventText(e: MarketEvent) {
  const [title, analogy, impact] = explain[e.kind] || explain.CPI;
  return {
    title: e.symbol ? `${e.symbol} · ${title}` : title,
    analogy,
    impact,
  };
}
export function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Source not available";
  }
}
export function eventUnit(e: MarketEvent) {
  if (e.unit.includes("%")) return "%";
  if (e.kind === "CLAIMS" || e.kind === "NFP" || e.kind === "JOLTS")
    return "people / jobs · source definition applies";
  if (e.kind === "TRADE") return "USD billions";
  if (e.kind === "ISM" || e.kind === "CONFIDENCE") return "index";
  return e.kind === "EARNINGS"
    ? "source-reported units"
    : "index / source-reported units";
}
export function englishState(input: QuestState): QuestState {
  const state = structuredClone(input);
  state.cards = cards as LearningCard[];
  const latest = state.bars
    .filter((b) => b.symbol === "QQQ")
    .sort((a, b) => b.date.localeCompare(a.date));
  if (latest.length > 1) {
    const percent = (latest[0].close / latest[1].close - 1) * 100;
    state.cards.unshift({
      id: `en:market:${latest[0].date}`,
      conceptId: "en:market:close-comparison",
      category: "events",
      title: "Today’s market math",
      question: `QQQ closed at $${latest[0].close.toFixed(2)} on ${latest[0].date}, versus $${latest[1].close.toFixed(2)} the previous session. The approximate change was…`,
      choices: [
        `${percent.toFixed(2)}%`,
        `${(-percent).toFixed(2)}%`,
        "The closing price alone gives no comparison",
        "Exactly 0%",
      ],
      answerIndex: 0,
      answerExplanation: `(${latest[0].close.toFixed(2)} ÷ ${latest[1].close.toFixed(2)} − 1) × 100 = ${percent.toFixed(2)}%. This is a verified daily-close comparison, not a real-time quote.`,
      explanation:
        "Compare the same instrument, session and adjustment convention. A daily bar does not establish intraday trigger order.",
      analogy: "Measure today’s height against yesterday’s ruler mark.",
      example:
        "A 1% move and a $1 move are different when the starting price changes.",
      sources: [
        {
          title: "QQQ historical prices",
          url: "https://finance.yahoo.com/quote/QQQ/history/",
        },
      ],
      tags: ["events"],
      difficulty: 1,
      asOf: latest[0].date,
      generatedAt: latest[0].fetchedAt,
    });
  }
  return state;
}
export function readableError(message: string) {
  const known: Record<string, string> = {
    "今天的判断已经封存，无法覆盖。":
      "Today’s prediction is locked and cannot be overwritten.",
    "盘前判断已经截止，请等待下一交易日。":
      "The premarket deadline has passed. Return before the next opening.",
    "请写一句判断理由。": "Add a reason for your prediction.",
    "请先选择答案。": "Choose an answer first.",
    "先选一个答案，再决定是否复习":
      "Answer first, then choose review or mastery.",
    "请写一句教训。": "Add one lesson from the review.",
    "战报不存在。": "A verified review is not available yet.",
    "本机记录暂时无法读取，请保留浏览器数据后重试。":
      "Your browser record could not be read. Keep your browser data and try again.",
    "浏览器未允许保存或空间不足，本次记录尚未保存。请开启本地存储后重试。":
      "Your browser could not save this record. Allow local storage and try again.",
  };
  return (
    known[message] ||
    (/\p{Script=Han}/u.test(message)
      ? "This action could not be completed. Please try again."
      : message)
  );
}
