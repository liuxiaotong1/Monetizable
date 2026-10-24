import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const compile = async (path) => {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  return `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString("base64")}`;
};
const { isAdmin, sameOrigin } = await import(
  await compile("../src/lib/account/policy.ts")
);
const {loginDestination, oauthRecoveryPath} = await import(await compile('../src/lib/account/redirect.ts'));
assert.equal(oauthRecoveryPath('/', new URLSearchParams('error=invalid_request&error_code=bad_oauth_state&error_description=private'), '/admin'), '/auth?error=google_signin&next=%2Fadmin');
assert.equal(oauthRecoveryPath('/', new URLSearchParams('error=x&error_code=x'), '//evil.example'), '/auth?error=google_signin&next=%2F');
assert.equal(oauthRecoveryPath('/blog', new URLSearchParams('error=x&error_code=x')), null);
assert.equal(oauthRecoveryPath('/', new URLSearchParams()), null);
assert.equal(loginDestination('/admin'), '/admin');
assert.equal(isAdmin(null), false);
assert.equal(
  isAdmin({ email: "liuxiaotong268@gmail.com" }),
  false,
  "Unverified email cannot access admin",
);
assert.equal(
  isAdmin({
    email: "someone@example.com",
    email_confirmed_at: "2026-10-11",
    user_metadata: { role: "admin" },
  }),
  false,
  "User-written roles cannot grant admin",
);
assert.equal(
  isAdmin({
    email: "LIUXIAOTONG268@gmail.com",
    email_confirmed_at: "2026-10-11",
  }),
  true,
);
assert.equal(
  isAdmin({
    email: "liuxiaotong268@gmail.com.evil.example",
    email_confirmed_at: "2026-10-11",
  }),
  false,
);
assert.equal(
  sameOrigin(
    new Request("https://getmonetizable.com/api/profile", {
      headers: { origin: "https://evil.example" },
    }),
  ),
  false,
);
assert.equal(
  sameOrigin(new Request("https://getmonetizable.com/api/profile")),
  false,
);
assert.equal(
  sameOrigin(
    new Request("https://getmonetizable.com/api/profile", {
      headers: { origin: "https://getmonetizable.com" },
    }),
  ),
  true,
);
const { mergeRecords } = await import(
  await compile("../src/lib/quest/merge-records.ts")
);
const blank = {
  version: 1,
  judgments: [],
  forecasts: [],
  cards: [],
  progress: [],
  notes: {},
  settings: {
    watchlist: [],
    threshold: 0.3,
    notifications: { daily: true, events: true, results: true },
    displayTimeZone: "Europe/Paris",
  },
  xp: 0,
  rewards: [],
  learningDays: {},
  readNotices: [],
};
const cloud = structuredClone(blank),
  local = structuredClone(blank);
cloud.judgments = [
  { date: "2026-10-12", direction: "bullish", forecastId: "original" },
];
local.judgments = [
  { date: "2026-10-12", direction: "bearish", forecastId: "changed" },
  { date: "2026-10-13", direction: "neutral" },
];
cloud.rewards = ["card:2026-10-11:one"];
cloud.xp = 5;
local.rewards = ["card:2026-10-11:one", "walk:2026-10-11:today"];
local.xp = 10;
cloud.progress = [
  { cardId: "one", learningStatus: "seen", updatedAt: "2026-10-11T12:00:00Z" },
];
local.progress = [
  {
    cardId: "one",
    learningStatus: "mastered",
    updatedAt: "2026-10-11T13:00:00Z",
  },
];
cloud.adventure = { date: "2026-10-11", sections: ["today"] };
local.adventure = { date: "2026-10-11", sections: ["events"] };
const merged = mergeRecords(cloud, local);
assert.equal(
  merged.judgments.find((j) => j.date === "2026-10-12").forecastId,
  "original",
  "Synced immutable original takes precedence",
);
assert.equal(merged.judgments.length, 2);
assert.equal(merged.xp, 10, "Duplicate XP is not added twice");
assert.equal(merged.progress[0].learningStatus, "mastered");
assert.deepEqual(merged.adventure.sections, ["today", "events"]);
assert.equal(
  mergeRecords(merged, local).xp,
  10,
  "Merging repeatedly is idempotent",
);
const cards = JSON.parse(
  await readFile(
    new URL("../src/data/english-cards.json", import.meta.url),
    "utf8",
  ),
);
assert.ok(cards.length >= 60, "Keep at least the initial English inventory");
assert.equal(new Set(cards.map((c) => c.conceptId)).size, cards.length);
for (const c of cards) {
  assert.ok(c.answerIndex >= 0 && c.answerIndex < c.choices.length);
  assert.equal(new Set(c.choices).size, c.choices.length);
  assert.ok(!/\p{Script=Han}/u.test(JSON.stringify(c)));
  assert.ok(c.sources.every((s) => s.url.startsWith("https://")));
}
console.log(
  "Passed: verified admin identity, role injection rejection, origin checks, account merge snapshots/XP/mastery, complete English card definitions.",
);

assert.equal(
  sameOrigin(
    new Request("http://localhost:3221/api/profile", {
      headers: { origin: "http://127.0.0.1:3221", host: "127.0.0.1:3221" },
    }),
  ),
  true,
);
assert.equal(
  sameOrigin(
    new Request("http://localhost:3221/api/profile", {
      headers: { origin: "https://malicious.invalid", host: "127.0.0.1:3221" },
    }),
  ),
  false,
);
