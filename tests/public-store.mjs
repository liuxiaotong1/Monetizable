import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const url = (s) =>
  `data:text/javascript;base64,${Buffer.from(s).toString("base64")}`;
const compile = async (name) =>
  ts.transpileModule(
    await readFile(
      new URL(`../src/lib/quest/${name}.ts`, import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    },
  ).outputText;
const domain = url(await compile("domain"));
const shuffle=url(await compile("shuffle"));
const engine=url((await compile("learning-engine")).replace(/from ["']\.\/shuffle["']/g,`from '${shuffle}'`));
const prediction=url((await compile("prediction-window")).replace(/from ["']\.\/domain["']/g,`from '${domain}'`));
const adventure = url(
  (await compile("adventure")).replace(
    /from ["']\.\/domain["']/g,
    `from '${domain}'`,
  ),
);
const tracking = url(
  (await compile("weekly-tracking")).replace(
    'from "./domain"',
    `from '${domain}'`,
  ),
);
const code = (await compile("browser-store"))
  .replace(/from ["']\.\/prediction-window["']/g, `from '${prediction}'`)
  .replace(/from ["']\.\/domain["']/g, `from '${domain}'`)
  .replace(/from ["']\.\/learning-engine["']/g, `from '${engine}'`)
  .replace(/from ["']\.\/adventure["']/g, `from '${adventure}'`)
  .replace(/from ["']\.\/weekly-tracking["']/g, `from '${tracking}'`);
const {
  emptyBrowserRecord,
  hydrateBrowserState,
  applyBrowserCommand,
  readBrowserRecord,
  saveBrowserRecord,
  setBrowserIdentity,
} = await import(url(code));
const seed = JSON.parse(
  await readFile(
    new URL("../src/data/public-feed.json", import.meta.url),
    "utf8",
  ),
);
assert.ok(
  seed.state.bars.length > 20 &&
    seed.state.cards.length > 100 &&
    seed.state.events.length > 0,
  "Seed contains verified real public data",
);
const forbidden = new Set([
  "judgment",
  "judgments",
  "judgmentSnapshot",
  "judgmentHistory",
  "progress",
  "reviews",
  "settings",
  "tradeReason",
  "tradeResult",
  "lesson",
  "weeklyNote",
  "email",
  "userId",
  "token",
]);
function privacy(v) {
  if (Array.isArray(v)) return v.forEach(privacy);
  if (v && typeof v === "object")
    for (const [k, c] of Object.entries(v)) {
      assert.ok(!forbidden.has(k), `Export contains private field ${k}`);
      privacy(c);
    }
}
privacy(seed);
const { sessionFor } = await import(domain),
  now = "2026-10-11T14:00:00Z";
const shared = {
  ...seed.state,
  now,
  session: sessionFor(new Date(now)),
  reviews: [],
  progress: [],
  xp: 0,
  dailyCardIds: [],
  notices: [],
  settings: emptyBrowserRecord().settings,
  weeklySummary: "",
};
const a = emptyBrowserRecord(),
  b = emptyBrowserRecord();
let s = applyBrowserCommand(shared, a, {
  type: "learningVisit",
  visitId: "visit-1",
});
const card = s.cards.find((c) => c.id === s.dailyCardIds[0]);
assert.ok(card);
s = applyBrowserCommand(shared, a, {
  type: "card",
  cardId: card.id,
  action: "answer",
  answerIndex: card.answerIndex,
});
assert.equal(a.xp, 5);
assert.equal(a.progress[0].dueDate, undefined);
applyBrowserCommand(shared, a, {
  type: "card",
  cardId: card.id,
  action: "answer",
  answerIndex: (card.answerIndex + 1) % 3,
});
assert.equal(a.progress[0].attempts, 1);
assert.equal(a.xp, 5);
assert.equal(
  hydrateBrowserState(shared, b).progress.length,
  0,
  "Visitors never share personal progress",
);
assert.equal(b.xp, 0);
applyBrowserCommand(shared, a, {
  type: "card",
  cardId: card.id,
  action: "review",
});
assert.equal(a.progress[0].reviewPending, true);
applyBrowserCommand(shared, a, { type: "learningVisit", visitId: "visit-2" });
assert.equal(a.progress[0].reviewPending, false);
assert.equal(a.progress[0].reviewVisitId, "visit-2");
applyBrowserCommand(shared, a, {
  type: "card",
  cardId: card.id,
  action: "answer",
  answerIndex: card.answerIndex,
});
assert.equal(a.progress[0].attempts, 2);
assert.equal(a.xp, 5);
applyBrowserCommand(shared, a, {
  type: "card",
  cardId: card.id,
  action: "master",
});
assert.ok(a.progress[0].masteredAt);
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, v),
};
saveBrowserRecord(a);
assert.deepEqual(readBrowserRecord(), a, "Browser progress survives refresh");
setBrowserIdentity("user-a");
saveBrowserRecord(a);
setBrowserIdentity("user-b");
assert.equal(
  readBrowserRecord().xp,
  0,
  "Signed-in accounts use separate browser storage",
);
setBrowserIdentity("user-a");
assert.equal(readBrowserRecord().xp, a.xp);
setBrowserIdentity();
assert.equal(
  readBrowserRecord().xp,
  a.xp,
  "Guest history survives account switching",
);
const judgmentRecord = emptyBrowserRecord(),
  day = "2026-10-12";
const forecast = {
  ...seed.state.forecasts[0],
  id: "test-forecast",
  date: day,
  createdAt: "2026-10-12T12:00:00Z",
};
assert.ok(forecast.scenarios?.length);
const market = {
  ...shared,
  now: "2026-10-12T12:15:00Z",
  session: sessionFor(new Date("2026-10-12T12:15:00Z")),
  forecasts: [forecast],
};
const cmd = {
  type: "judgment",
  forecastId: forecast.id,
  direction: "bullish",
  confidence: "medium",
  reason: "test reason",
};
applyBrowserCommand(market, judgmentRecord, cmd);
assert.throws(
  () =>
    applyBrowserCommand(market, judgmentRecord, {
      ...cmd,
      direction: "bearish",
    }),
  /无法覆盖/,
);
assert.equal(
  judgmentRecord.forecasts[0].id,
  forecast.id,
  "Original scenario is frozen with judgment",
);
assert.throws(
  () =>
    applyBrowserCommand(
      market,
      emptyBrowserRecord(),
      cmd,
      "2026-10-12T13:30:00Z",
    ),
  /截止/,
);
const afterOpen={...market,now:"2026-10-12T14:00:00Z",session:sessionFor(new Date("2026-10-12T14:00:00Z")),bars:Array.from({length:25},(_,i)=>({...shared.bars[0],symbol:"QQQ",date:new Date(Date.UTC(2026,8,1+i)).toISOString().slice(0,10),open:100+i,high:103+i,low:98+i,close:101+i,volume:1000}))};
const nextState=hydrateBrowserState(afterOpen,judgmentRecord);
assert.equal(nextState.forecast.date,"2026-10-13");
applyBrowserCommand(afterOpen,judgmentRecord,{...cmd,forecastId:nextState.forecast.id});
assert.equal(judgmentRecord.judgments.length,2);
assert.equal(judgmentRecord.judgments[0].date,"2026-10-12");
assert.equal(judgmentRecord.judgments[1].date,"2026-10-13");
assert.throws(()=>applyBrowserCommand(afterOpen,judgmentRecord,{...cmd,forecastId:nextState.forecast.id}),/无法覆盖/);
for (const section of ["today", "events", "learn"])
  applyBrowserCommand(shared, a, { type: "walkthrough", section });
assert.equal(a.adventure.sections.length, 3);
assert.ok(a.adventure.completedAt);
globalThis.localStorage.setItem = () => {
  throw Error("QuotaExceededError");
};
assert.throws(() => saveBrowserRecord(a), /尚未保存/);
console.log(
  "Passed: public-only export, separate visitor records, answer/review/mastery persistence, same-day XP idempotence, immutable judgment and scenario, cutoff, daily three-stop completion, storage failure handling.",
);

// Old reflection records must not replace a freshly verified loss with a cached win.
const resultRecord=emptyBrowserRecord();
resultRecord.judgments=[{id:'result-call',date:day,forecastId:forecast.id,direction:'bullish',eligible:true,lockedAt:'2026-10-12T12:00:00Z'}];
resultRecord.forecasts=[forecast];
resultRecord.notes[`review:${day}`]={matched:true,actualDirection:'bullish',judgmentSnapshot:{...resultRecord.judgments[0],direction:'bearish'},lesson:'Keep my original reflection'};
const verified=hydrateBrowserState({...market,now:'2026-10-13T12:00:00Z',bars:[{symbol:'QQQ',date:day,open:forecast.baselineClose,high:forecast.baselineClose,low:forecast.baselineClose*.98,close:forecast.baselineClose*.99,volume:1000,fetchedAt:'2026-10-12T21:00:00Z',source:'test regular session'}]},resultRecord).reviews[0];
assert.equal(verified.matched,false);
assert.equal(verified.actualDirection,'bearish');
assert.equal(verified.judgmentSnapshot.direction,'bullish','The original sealed call remains unchanged');
assert.equal(verified.lesson,'Keep my original reflection');
console.log('Passed: legacy reflection data cannot override the verified verdict or sealed call.');
