import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const url = (code) => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const compile = async (path) => ts.transpileModule(await fs.readFile(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const domainURL = url(await compile('src/lib/quest/domain.ts'));
const earningsURL = url((await compile('src/lib/quest/earnings-calendar.ts')).replaceAll(`from './domain'`, `from ${JSON.stringify(domainURL)}`));
const copyURL = url(await compile('src/lib/push/copy.ts'));
const prefsURL = url((await compile('src/lib/push/prefs.ts')).replaceAll(`from './copy'`, `from ${JSON.stringify(copyURL)}`));
const scheduleURL = url((await compile('src/lib/push/schedule.ts'))
  .replaceAll(`from '../quest/domain'`, `from ${JSON.stringify(domainURL)}`)
  .replaceAll(`from '../quest/earnings-calendar'`, `from ${JSON.stringify(earningsURL)}`)
  .replaceAll(`from './copy'`, `from ${JSON.stringify(copyURL)}`)
  .replaceAll(`from './prefs'`, `from ${JSON.stringify(prefsURL)}`));
const schedule = await import(scheduleURL);
const domain = await import(domainURL);
const { planNotifications } = schedule;

const bars = [
  { symbol: 'QQQ', date: '2026-07-14' },
  { symbol: 'QQQ', date: '2026-07-15' },
  { symbol: 'QQQ', date: '2026-07-16' },
  { symbol: 'QQQ', date: '2026-01-14' },
  { symbol: 'QQQ', date: '2026-01-15' },
  { symbol: 'QQQ', date: '2026-03-16' },
  { symbol: 'QQQ', date: '2025-07-02' },
  { symbol: 'QQQ', date: '2025-07-03' },
];
const base = {
  events: [],
  bars,
  judgments: [],
  progress: [],
  categories: { premarket: true, review: true, knowledge: true, event: true },
  timeZone: 'Europe/Paris',
  knowledgeTime: '12:30',
  locale: 'zh',
  companion: 'female',
  sentToday: 0,
};

function plans(now, extra = {}) {
  return planNotifications({ ...base, now: new Date(now), ...extra });
}
function kinds(list) { return list.map((item) => item.category + (item.phase ? ':' + item.phase : '')); }

const summerOpen = domain.sessionFor(new Date('2026-07-15T12:45:00Z'));
assert.equal(new Date(Date.parse(summerOpen.openAt) - 45 * 60 * 1000).toISOString(), '2026-07-15T12:45:00.000Z');
assert.deepEqual(kinds(plans('2026-07-15T12:45:00Z')), ['premarket']);
assert.equal(plans('2026-07-15T12:45:00Z')[0].body, '开盘前的最后一张牌。今天纳斯达克100 ETF 是涨还是跌？写下你的判断。');
assert.equal(plans('2026-07-15T12:45:00Z', { companion: 'supercharlie' })[0].title, '查理');
assert.equal(plans('2026-07-15T12:44:00Z').length, 0);
assert.equal(plans('2026-07-15T12:45:00Z', { judgments: [{ date: '2026-07-15', eligible: true }] }).length, 0);

const winterOpen = domain.sessionFor(new Date('2026-01-15T13:45:00Z'));
assert.equal(new Date(Date.parse(winterOpen.openAt) - 45 * 60 * 1000).toISOString(), '2026-01-15T13:45:00.000Z');
assert.deepEqual(kinds(plans('2026-01-15T13:45:00Z')), ['premarket']);

const gapOpen = domain.sessionFor(new Date('2026-03-16T12:45:00Z'));
assert.equal(new Date(Date.parse(gapOpen.openAt) - 45 * 60 * 1000).toISOString(), '2026-03-16T12:45:00.000Z');
assert.deepEqual(kinds(plans('2026-03-16T12:45:00Z')), ['premarket']);

assert.deepEqual(kinds(plans('2026-07-15T20:30:00Z', { judgments: [{ date: '2026-07-15', eligible: true }] })), ['review']);
assert.equal(plans('2026-07-15T20:29:00Z', { judgments: [{ date: '2026-07-15', eligible: true }] }).length, 0);
assert.equal(plans('2026-07-15T20:30:00Z').length, 0);
assert.equal(plans('2026-07-15T20:30:00Z', { judgments: [{ date: '2026-07-15', eligible: false }] }).length, 0);

const early = domain.sessionFor(new Date('2025-07-03T16:00:00Z'));
assert.equal(early.closeAt.startsWith('2025-07-03T17:00:'), true);
assert.deepEqual(kinds(plans('2025-07-03T17:30:00Z', { judgments: [{ date: '2025-07-03', eligible: true }] })), ['review']);

assert.deepEqual(kinds(plans('2026-07-18T10:30:00Z')), ['knowledge']);
assert.equal(plans('2026-07-03T12:45:00Z').some((item) => item.category === 'premarket'), false);
assert.equal(plans('2026-12-25T13:45:00Z').some((item) => item.category === 'premarket'), false);
assert.equal(plans('2026-07-18T10:30:00Z')[0].href.startsWith('/?view=learn'), true);
assert.equal(plans('2026-07-03T10:30:00Z').every((item) => item.category === 'knowledge'), true);
assert.equal(plans('2026-07-18T10:30:00Z', { progress: [{ lastAnswerAt: '2026-07-18T14:00:00Z' }] }).length, 0);

const cpi = { id: 'cpi-2026-07-15', kind: 'CPI', at: '2026-07-15T12:30:00Z', status: 'scheduled' };
assert.deepEqual(kinds(plans('2026-07-14T18:00:00Z', { events: [cpi] })), ['event:eve']);
assert.match(plans('2026-07-14T18:00:00Z', { events: [cpi] })[0].body, /美国 CPI/);
assert.equal(plans('2026-07-14T18:00:00Z', { events: [cpi], locale: 'en', companion: 'supercharlie' })[0].title, 'Charlie');
assert.equal(plans('2026-07-12T18:00:00Z', { events: [{ ...cpi, id: 'cpi-2026-07-13', at: '2026-07-13T12:30:00Z' }] }).some((item) => item.category === 'event'), false);
assert.deepEqual(kinds(plans('2026-07-15T11:30:00Z', { events: [cpi] })), ['event:soon']);
assert.equal(plans('2026-07-15T12:45:00Z', { events: [cpi] }).some((item) => item.category === 'premarket'), false);

const both = plans('2026-07-15T12:45:00Z', { knowledgeTime: '14:45' });
assert.deepEqual(kinds(both), ['premarket', 'knowledge']);
assert.deepEqual(kinds(plans('2026-07-15T12:45:00Z', { knowledgeTime: '14:45', sentToday: 1 })), ['premarket']);
assert.equal(plans('2026-07-15T12:45:00Z', { sentToday: 2 }).length, 0);

for (const item of plans('2026-07-15T12:45:00Z', { locale: 'fr', companion: 'supercharlie' }).concat(plans('2026-07-14T18:00:00Z', { events: [cpi], locale: 'en' }))) {
  assert.equal(item.body.includes('QQQ'), false);
  assert.equal(item.title.includes('QQQ'), false);
}
assert.equal(plans('2026-07-15T12:45:00Z', { locale: 'fr', companion: 'female' })[0].body.includes('ETF Nasdaq-100'), true);
assert.equal(plans('2026-07-15T10:30:00Z', { timeZone: 'America/New_York', knowledgeTime: '06:30' })[0].category, 'knowledge');

console.log('Push schedule checks passed: DST windows, holidays, event replacement, review gate and daily cap.');
