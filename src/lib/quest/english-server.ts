import "server-only";
import {factualCards} from "./daily-content";
import cards from "@/data/english-cards.json";
import type {QuestState,LearningCard} from "./types";
export function englishState(input: QuestState): QuestState {
  const state = structuredClone(input);
  state.cards = [...factualCards(input,"en"),...structuredClone(cards)] as LearningCard[];
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
