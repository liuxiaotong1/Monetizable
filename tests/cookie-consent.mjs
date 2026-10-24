import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

function load(file, deps = {}) {
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', out.outputText)((name) => {
    if (name in deps) return deps[name];
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return jsx;
    if (name.endsWith('.css')) return {};
    throw Error('Unmocked dependency ' + name);
  }, module, module.exports);
  return module.exports;
}

const jsx = await import('react/jsx-runtime');
const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
const scripts = [];
globalThis.window = {};
globalThis.document = {
  getElementById: (id) => scripts.find((script) => script.id === id) ?? null,
  createElement: () => ({ id: '', async: false, src: '' }),
  head: { appendChild: (script) => scripts.push(script) },
};

const clarity = load('src/lib/clarity.ts');
assert.equal(clarity.clarityProjectId(''), 'y1en34n746');
assert.equal(clarity.clarityProjectId('   '), 'y1en34n746');
assert.equal(clarity.clarityProjectId('not an id'), 'y1en34n746');
assert.equal(clarity.clarityProjectId('Ab12project'), 'Ab12project');
assert.equal(clarity.clarityEnabled, true);
assert.equal(clarity.readCookieChoice(), null);

clarity.applyCookieChoice('denied');
assert.equal(store.get('monetizable:cookie-consent'), 'denied');
assert.equal(scripts.length, 0, 'Refusing must not insert the Clarity tag');
assert.equal(globalThis.window.clarity, undefined);

clarity.setClarityTag('email', 'person@example.com');
clarity.setClarityTag('plan', 'free');
assert.equal(globalThis.window.clarity, undefined, 'Tags stay queued off without analytics consent');

clarity.applyCookieChoice('granted');
assert.equal(scripts.length, 1);
assert.equal(scripts[0].id, 'microsoft-clarity');
assert.equal(scripts[0].async, true);
assert.equal(clarity.CLARITY_PROJECT_ID, 'y1en34n746');
assert.equal(scripts[0].src, `https://www.clarity.ms/tag/${clarity.clarityProjectId()}`);
assert.equal(clarity.clarityProjectId(undefined), process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() && /^[a-z0-9]+$/i.test(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID.trim()) ? process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID.trim() : 'y1en34n746');
const queued = globalThis.window.clarity.q.map((entry) => entry[0]);
assert.ok(queued.includes('consentv2'));
const consent = globalThis.window.clarity.q.find((entry) => entry[0] === 'consentv2');
assert.deepEqual(consent[1], { ad_Storage: 'denied', analytics_Storage: 'granted' });
assert.ok(globalThis.window.clarity.q.findIndex((entry) => entry[0] === 'consentv2') >= 0);
clarity.applyCookieChoice('granted');
assert.equal(scripts.length, 1, 'Accepting again does not add a second tag');

clarity.setClarityTag('email', 'person@example.com');
clarity.setClarityTag('userId', 'abc');
clarity.setClarityTag('token', 'secret');
clarity.setClarityTag('plan', 'free');
const tags = globalThis.window.clarity.q.filter((entry) => entry[0] === 'set');
assert.deepEqual(tags, [['set', 'plan', 'free']]);

clarity.applyCookieChoice('denied');
const tail = globalThis.window.clarity.q.slice(-2);
assert.deepEqual(tail[0], ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' }]);
assert.deepEqual(tail[1], ['consent', false]);
assert.equal(scripts.length, 1, 'Withdrawal does not load another tag');

const banner = load('src/components/cookie-consent.tsx', {
  '@/components/i18n/locale-provider': { useLocale: () => 'fr' },
  '@/lib/i18n/locale': {},
  '@/lib/clarity': clarity,
}).CookieBanner;
for (const [locale, accept, refuse] of [['fr', 'Accepter', 'Refuser'], ['en', 'Accept', 'Refuse'], ['zh', '接受', '拒绝']]) {
  const html = renderToStaticMarkup(React.createElement(banner, { locale, choice: null, onChoose() {}, onClose() {} }));
  const buttons = [...html.matchAll(/<button type="button" class="cookie-choice"/g)];
  assert.equal(buttons.length, 2, locale);
  assert.ok(html.includes(accept) && html.includes(refuse), html);
  assert.equal(html.includes('cookie-choice-primary'), false);
  assert.equal(html.includes('>' + refuse + '<') && html.includes('>' + accept + '<'), true);
  assert.equal(html.includes('cookie-dismiss'), false);
}
const manage = renderToStaticMarkup(React.createElement(banner, { locale: 'fr', choice: 'granted', onChoose() {}, onClose() {} }));
assert.ok(manage.includes('Fermer'));
assert.ok(manage.includes('Avis de confidentialité'));
const link = load('src/components/cookie-consent.tsx', {
  '@/components/i18n/locale-provider': { useLocale: () => 'fr' },
  '@/lib/i18n/locale': {},
  '@/lib/clarity': clarity,
}).CookieSettingsLink;
assert.ok(renderToStaticMarkup(React.createElement(link)).includes('Gérer les cookies'));

const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
assert.ok(layout.includes('<CookieConsent />'));
assert.equal(layout.includes('clarity.ms'), false);
const catalog = JSON.parse(fs.readFileSync('src/lib/i18n/fr.json', 'utf8'));
const chinese = JSON.parse(fs.readFileSync('src/lib/i18n/zh.json', 'utf8'));
const privacy = 'Microsoft Clarity measures how the site is used and masks sensitive content. It loads only after you accept analytics cookies. Use Cookies in the footer to change that choice.';
assert.ok(catalog[privacy].includes('cookies d’analyse'));
assert.ok(chinese[privacy].includes('分析 Cookie'));
assert.equal(catalog['Updated October 24, 2026.'], 'Mis à jour le 24 octobre 2026.');
console.log('Cookie consent: fallback project, tag only after accept, equal FR/EN/ZH choices, masked custom tags, withdrawal passed.');
