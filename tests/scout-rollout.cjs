const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const load = Module._load;
Module._load = function(name, parent, main) {
  if (name === 'next/image') return ({ sizes, ...props }) => React.createElement('img', props);
  if (name === 'next/link') return props => React.createElement('a', props);
  return load.call(this, name, parent, main);
};
require.extensions['.tsx'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
const { OpportunityAgentIntro } = require('../src/components/opportunity-agent-intro.tsx');
for (const locale of ['en', 'fr', 'de', 'es', 'it', 'zh']) {
  const html = renderToStaticMarkup(React.createElement(OpportunityAgentIntro, { locale }));
  assert.match(html, /supercharlie-scout\.png/);
  assert.match(html, /href="#analyze"/);
  assert.equal((html.match(/<article /g) || []).length, 3);
  for (const pose of ['ready', 'thinking', 'found']) assert.match(html, new RegExp(`supercharlie-scout-${pose}\\.png`));
  assert.doesNotMatch(html, /working 24h|sends it directly|undefined/);
}
const companion = fs.readFileSync(path.join(__dirname, '../src/components/supercharlie-companion.tsx'), 'utf8');
assert.match(companion, /supercharlie-scout\.png/);
assert.doesNotMatch(companion, /pet-v2|maskImage/);
assert.match(companion, /width=\{1254\} height=\{1254\}/);
assert.match(companion, /Hide SuperCharlie/);
assert.match(companion, /onPointerDown=\{startDrag\}/);
const funnel = fs.readFileSync(path.join(__dirname, '../src/components/funnel.tsx'), 'utf8');
assert.match(funnel, /poster="\/supercharlie-walkthrough-poster\.png"/);
assert.match(funnel, /<video controls playsInline preload="none"/);
assert.doesNotMatch(funnel.match(/<video[^>]*>/)[0], /autoPlay/);
assert.ok(fs.existsSync(path.join(__dirname, '../public/supercharlie-walkthrough-poster.png')));
Promise.all(['supercharlie-scout', 'supercharlie-scout-ready', 'supercharlie-scout-thinking', 'supercharlie-scout-found'].map(async name => {
  const stats = await require('sharp')(path.join(__dirname, `../public/${name}.png`)).stats();
  assert.equal(stats.channels.length, 4);
  assert.equal(stats.channels[3].min, 0);
  assert.equal(stats.channels[3].max, 255);
})).then(() => {
  console.log('Scout rollout passed: six locales, three illustrated poses, paused video poster, shared mascot and transparent alpha.');
}).catch(error => { console.error(error); process.exitCode = 1; });
