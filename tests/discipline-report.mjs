import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const url = (code) => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const compile = async (path) => ts.transpileModule(await fs.readFile(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const domainURL = url(await compile('src/lib/quest/domain.ts'));
const domain = await import(domainURL);
const weeklyURL = url((await compile('src/lib/quest/weekly-tracking.ts')).replaceAll('"./domain"', JSON.stringify(domainURL)).replaceAll("'./domain'", JSON.stringify(domainURL)));
const eventURL = url(await compile('src/lib/quest/event-prediction.ts'));
const reportURL = url((await compile('src/lib/quest/discipline-report.ts'))
  .replaceAll('"./domain"', JSON.stringify(domainURL))
  .replaceAll("'./domain'", JSON.stringify(domainURL))
  .replaceAll('"./weekly-tracking"', JSON.stringify(weeklyURL))
  .replaceAll("'./weekly-tracking'", JSON.stringify(weeklyURL))
  .replaceAll('"./event-prediction"', JSON.stringify(eventURL))
  .replaceAll("'./event-prediction'", JSON.stringify(eventURL)));
const report = await import(reportURL);

assert.equal(report.parisMidnight('2026-10-19'), '2026-10-18T22:00:00.000Z');
assert.equal(report.parisMidnight('2026-10-26'), '2026-10-25T23:00:00.000Z');
assert.equal(report.isoWeek('2026-10-12'), 42);
assert.equal(report.isoWeek('2026-10-19'), 43);
assert.equal(report.isoWeek('2025-12-29'), 1);
assert.equal(report.parisDate('2026-10-18T22:30:00.000Z'), '2026-10-19');
assert.equal(report.parisDate('2026-10-18T21:30:00.000Z'), '2026-10-18');

const call = (date, direction, confidence, eligible = true) => ({ id: `j:${date}`, date, forecastId: `f:${date}`, direction, confidence, reason: 'a reason', createdAt: `${date}T11:00:00.000Z`, lockedAt: `${date}T11:00:00.000Z`, eligible });
const review = (date, matched, completed = false) => ({ id: `review:${date}`, date, forecastId: `f:${date}`, judgmentId: `j:${date}`, matched, completedAt: completed ? `${date}T21:00:00.000Z` : undefined, rangeCovered: true });
const dates = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];
const directions = ['bullish', 'bullish', 'bullish', 'bullish', 'neutral'];
const confidence = ['medium', 'medium', 'high', 'high', 'low'];
const matched = [true, true, false, false, true];
const history = dates.map((date, i) => call(date, directions[i], confidence[i]));
const reviews = dates.map((date, i) => review(date, matched[i], i < 2));
const base = (now) => ({ session: domain.sessionFor(new Date(now)), now, reviews });
const boss = {
  eventId: 'nfp:2026-10-14',
  releaseAt: '2026-10-14T12:30:00.000Z',
  savedAt: '2026-10-13T12:00:00.000Z',
  pick: 'higher',
  reference: 100,
  referenceKind: 'consensus',
  unit: 'thousands',
};
const later = { ...boss, eventId: 'cpi:2026-10-20', releaseAt: '2026-10-20T12:30:00.000Z' };
const waiting = { ...boss, eventId: 'claims:2026-10-16', releaseAt: '2026-10-16T12:30:00.000Z', pick: 'lower' };
const events = [
  { id: boss.eventId, at: boss.releaseAt, status: 'confirmed', actual: 120, unit: boss.unit },
  { id: later.eventId, at: later.releaseAt, status: 'confirmed', actual: 3, unit: later.unit },
  { id: waiting.eventId, at: waiting.releaseAt, status: 'scheduled', unit: waiting.unit },
];

const week = report.disciplineReport(base('2026-10-17T15:00:00.000Z'), history, [boss, later, waiting], events);
assert.equal(week.start, '2026-10-12');
assert.equal(week.end, '2026-10-16');
assert.equal(week.week, 42);
assert.equal(week.recorded, 5);
assert.equal(week.scored, 5);
assert.equal(week.correct, 3);
assert.equal(week.hitRate, 60);
assert.deepEqual(week.directions, { bullish: 4, neutral: 1, bearish: 0 });
assert.equal(week.bias, 'bullish');
assert.equal(week.highCount, 2);
assert.equal(week.highScored, 2);
assert.equal(week.highCorrect, 0);
assert.equal(week.completed, 2);
assert.equal(week.bossTotal, 2);
assert.equal(week.bossScored, 1);
assert.equal(week.bossHits, 1);
assert.equal(week.lowData, false);
assert.equal(week.goal, 'bias-bullish');

const stillSunday = report.disciplineReport(base('2026-10-18T21:30:00.000Z'), history, [boss], events);
assert.equal(stillSunday.start, '2026-10-12');
assert.equal(stillSunday.recorded, 5);
const mondayParis = report.disciplineReport(base('2026-10-18T22:30:00.000Z'), history, [boss], events);
assert.equal(mondayParis.start, '2026-10-19');
assert.equal(mondayParis.recorded, 0);
assert.equal(mondayParis.hitRate, undefined);
assert.equal(mondayParis.bossTotal, 0);
assert.equal(mondayParis.goal, 'keep-predicting');
assert.equal(mondayParis.lowData, true);

const two = report.disciplineReport(base('2026-10-17T15:00:00.000Z'), history.slice(0, 2), [], []);
assert.equal(two.recorded, 2);
assert.equal(two.bias, undefined);
assert.equal(two.goal, 'keep-predicting');

const balanced = dates.map((date, i) => call(date, ['bullish', 'bearish', 'neutral', 'bullish', 'bearish'][i], i === 0 ? 'high' : 'medium'));
const missedReviews = dates.map((date, i) => review(date, i !== 0, true));
const missedHigh = report.disciplineReport({ ...base('2026-10-17T15:00:00.000Z'), reviews: missedReviews }, balanced, [], []);
assert.equal(missedHigh.bias, undefined);
assert.equal(missedHigh.highCorrect, 0);
assert.equal(missedHigh.highScored, 1);
assert.equal(missedHigh.goal, 'high-confidence');
const reviewed = report.disciplineReport(
  { ...base('2026-10-17T15:00:00.000Z'), reviews: dates.map((date) => review(date, true, true)) },
  balanced.map((item) => ({ ...item, confidence: 'medium' })),
  [],
  [],
);
assert.equal(reviewed.completed, 5);
assert.equal(reviewed.goal, 'stay-steady');
const needsReview = report.disciplineReport(
  { ...base('2026-10-17T15:00:00.000Z'), reviews: dates.map((date) => review(date, true, false)) },
  dates.map((date, i) => call(date, ['bullish', 'bearish', 'neutral', 'bullish', 'bearish'][i], 'low')),
  [],
  [],
);
assert.equal(needsReview.goal, 'write-reviews');
assert.equal(needsReview.bias, undefined);

const ineligible = report.disciplineReport({ ...base('2026-10-17T15:00:00.000Z'), reviews: [review('2026-10-16', false)] }, [call('2026-10-16', 'bullish', 'high', false)], [], []);
assert.equal(ineligible.recorded, 1);
assert.equal(ineligible.scored, 0);
assert.equal(ineligible.hitRate, undefined);
assert.equal(ineligible.highScored, 0);

const ui = await fs.readFile('src/components/quest/discipline-report.tsx', 'utf8');
assert.ok(ui.includes('Haussier'));
assert.ok(ui.includes('En range'));
assert.ok(ui.includes('Baissier'));
assert.ok(ui.includes('Voir mon rapport complet'));
assert.ok(ui.includes('每周日一份个人纪律周报：命中率、方向偏差、高信心准不准、复盘有没有做。'));
assert.equal(ui.includes('QQQ'), false);
const billing = await fs.readFile('src/components/account/billing-access.tsx', 'utf8');
assert.ok(billing.includes('Chaque dimanche : votre rapport de discipline — biais, confiance, revue.'));
assert.ok(billing.includes('每周日一份个人纪律周报：命中率、方向偏差、高信心准不准、复盘有没有做。'));
assert.ok(billing.includes('The full premarket brief, included'));
const hero = await fs.readFile('src/components/quest/first-quest-hero.tsx', 'utf8');
assert.ok(hero.includes('Understand Finance, Like a Game'));
assert.ok(hero.includes('Comprendre la finance, comme un jeu'));
const product = await fs.readFile('src/lib/account/billing.ts', 'utf8');
assert.ok(product.includes('Every Sunday: your discipline report — bias, confidence, review.'));
assert.ok(product.includes("idempotencyKey:'monetizable-plus-product-v1'"));

console.log('Discipline report: Paris week boundary, five metrics, bias, Boss window, goals, paywall copy passed.');
