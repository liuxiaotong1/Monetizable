import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const url = (code) => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const compile = async (path) => ts.transpileModule(await fs.readFile(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const domainURL = url(await compile('src/lib/quest/domain.ts'));
const earningsURL = url((await compile('src/lib/quest/earnings-calendar.ts')).replaceAll(`from './domain'`, `from ${JSON.stringify(domainURL)}`));
const copyURL = url(await compile('src/lib/push/copy.ts'));
const localeURL = url(await compile('src/lib/push/locale.ts'));
const prefsURL = url((await compile('src/lib/push/prefs.ts')).replaceAll(`from './copy'`, `from ${JSON.stringify(copyURL)}`));
const scheduleURL = url((await compile('src/lib/push/schedule.ts'))
  .replaceAll(`from '../quest/domain'`, `from ${JSON.stringify(domainURL)}`)
  .replaceAll(`from '../quest/earnings-calendar'`, `from ${JSON.stringify(earningsURL)}`)
  .replaceAll(`from './copy'`, `from ${JSON.stringify(copyURL)}`)
  .replaceAll(`from './prefs'`, `from ${JSON.stringify(prefsURL)}`));
const { resolveReminderLocale } = await import(localeURL);
const { planNotifications, reminderHref } = await import(scheduleURL);
const copy = await import(copyURL);

assert.equal(resolveReminderLocale({ signedIn: true, accountLocale: 'zh', subscriptionLocale: 'en' }), 'zh');
assert.equal(resolveReminderLocale({ signedIn: true, accountLocale: 'fr', subscriptionLocale: 'zh' }), 'fr');
assert.equal(resolveReminderLocale({ signedIn: false, accountLocale: 'zh', subscriptionLocale: 'fr' }), 'fr');
assert.equal(resolveReminderLocale({ signedIn: true, accountLocale: null, subscriptionLocale: 'zh' }), 'zh');

const bars = [{ symbol: 'QQQ', date: '2026-07-14' }, { symbol: 'QQQ', date: '2026-07-15' }];
const cpi = { id: 'cpi-2026-07-15', kind: 'CPI', at: '2026-07-15T12:30:00.000Z', status: 'scheduled' };
const categories = { premarket: true, review: true, knowledge: true, event: true };
function plans(locale, when, extra = {}) {
  return planNotifications({
    now: new Date(when), events: extra.events || [], bars, judgments: extra.judgments || [], progress: [],
    categories, timeZone: 'Europe/Paris', knowledgeTime: extra.knowledgeTime || '12:30',
    locale, companion: extra.companion || 'female', sentToday: 0,
  });
}

const englishPhrases = [
  'The last card', 'Write down your call', 'The Boss is at the door', 'Today’s review', 'I marked where',
  'The market’s closed', 'hiding a concept', 'just dropped', 'Tomorrow at', 'is released', 'biggest Boss',
  'Send in your prediction', 'Last hour', 'Predictions close', 'Nasdaq-100 ETF', 'Federal Reserve',
  'US jobs', 'US CPI', 'major release',
];
const allowed = new Set(['Monetizable', 'Astra', 'Charlie', 'Nasdaq-100', 'ETF', 'CPI', 'NFP', 'FOMC', 'Boss']);
function assertLanguage(plan, locale) {
  const text = `${plan.title}\n${plan.body}`;
  for (const phrase of englishPhrases) assert.equal(text.includes(phrase), false, `${locale} payload contains “${phrase}”: ${text}`);
  assert.doesNotMatch(text, /\bET\b/);
  assert.match(plan.href, new RegExp(`[?&]lang=${locale}(?:&|#|$)`));
  if (locale === 'zh') {
    assert.match(plan.title, /[\u4e00-\u9fff]/);
    assert.match(plan.body, /[\u4e00-\u9fff]/);
    assert.doesNotMatch(text, /Paris/);
    assert.doesNotMatch(plan.href, /#prevision|#bilan|#prediction(?:&|$)|#review(?:&|$)/);
    for (const word of text.match(/[A-Za-z][A-Za-z-]*/g) || []) {
      assert.equal(allowed.has(word) || /^[A-Z]{1,5}$/.test(word), true, `zh payload has an unexpected Latin word “${word}” in ${text}`);
    }
  }
  if (locale === 'fr') {
    assert.match(text, /[àâçéèêëîïôùûüœ]/i);
    assert.doesNotMatch(text, /美东|巴黎|预测|复盘/);
    assert.doesNotMatch(plan.href, /预测|复盘/);
  }
}

const zhPremarket = plans('zh', '2026-07-15T12:45:00Z');
const frPremarket = plans('fr', '2026-07-15T12:45:00Z', { companion: 'supercharlie' });
assert.equal(zhPremarket[0].title, '星澜');
assert.equal(frPremarket[0].title, 'Charlie');
assert.match(decodeURIComponent(zhPremarket[0].href), /#预测$/);
assert.match(frPremarket[0].href, /#prevision$/);
for (const plan of zhPremarket) assertLanguage(plan, 'zh');
for (const plan of frPremarket) assertLanguage(plan, 'fr');

const zhReview = plans('zh', '2026-07-15T20:30:00Z', { judgments: [{ date: '2026-07-15', eligible: true }] });
const frReview = plans('fr', '2026-07-15T20:30:00Z', { judgments: [{ date: '2026-07-15', eligible: true }], companion: 'female' });
assert.match(decodeURIComponent(zhReview.find((item) => item.category === 'review').href), /#复盘$/);
assert.match(frReview.find((item) => item.category === 'review').href, /#bilan$/);
for (const plan of [...zhReview, ...frReview]) assertLanguage(plan, plan.href.includes('lang=zh') ? 'zh' : 'fr');

const zhEvent = plans('zh', '2026-07-14T18:00:00Z', { events: [cpi] });
const frEvent = plans('fr', '2026-07-14T18:00:00Z', { events: [cpi] });
const frEventCharlie = plans('fr', '2026-07-14T18:00:00Z', { events: [cpi], companion: 'supercharlie' });
assert.match(zhEvent[0].body, /美国 CPI/);
assert.match(zhEvent[0].body, /巴黎/);
assert.match(zhEvent[0].body, /美东/);
assert.match(frEvent[0].body, /IPC américain/);
assert.match(frEvent[0].body, /heure de l’Est/);
for (const plan of [...zhEvent, ...frEvent, ...frEventCharlie]) assertLanguage(plan, plan.href.includes('lang=zh') ? 'zh' : 'fr');

const zhSoon = plans('zh', '2026-07-15T11:30:00Z', { events: [cpi], companion: 'supercharlie' });
const frSoon = plans('fr', '2026-07-15T11:30:00Z', { events: [cpi] });
for (const plan of [...zhSoon, ...frSoon]) assertLanguage(plan, plan.href.includes('lang=zh') ? 'zh' : 'fr');

const zhCard = plans('zh', '2026-07-18T10:30:00Z', { companion: 'supercharlie' });
const frCard = plans('fr', '2026-07-18T10:30:00Z');
assert.match(zhCard[0].href, /lang=zh/);
assert.match(frCard[0].href, /lang=fr/);
for (const plan of [...zhCard, ...frCard]) assertLanguage(plan, plan.href.includes('lang=zh') ? 'zh' : 'fr');

assert.equal(reminderHref('zh', '/?view=learn').includes('lang=zh'), true);
assert.match(copy.eventClock('2026-07-15T12:30:00.000Z', 'zh'), /巴黎/);
assert.match(copy.eventClock('2026-07-15T12:30:00.000Z', 'fr'), /heure de l’Est/);
assert.doesNotMatch(copy.eventClock('2026-07-15T12:30:00.000Z', 'zh'), /\bET\b|Paris/);
assert.doesNotMatch(copy.eventClock('2026-07-15T12:30:00.000Z', 'fr'), /\bET\b|美东/);

console.log('Reminder language checks passed: account locale wins, a switch to French stays French, and zh/fr payloads do not fall back to English.');
