// Read-only regressions. Run: node tests/company-needs.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'next/link') return ({ href, children, ...props }) => require('react').createElement('a', { href, ...props }, children);
  if (name === 'next/dynamic') return () => () => null;
  if (name === 'next/image') return ({ unoptimized, ...props }) => require('react').createElement('img', props);
  if (name.startsWith('@/')) name = path.join(root, 'src', name.slice(2));
  return originalLoad.call(this, name, parent, isMain);
};
require.extensions['.css'] = (module) => { module.exports = new Proxy({}, { get: (_, key) => String(key) }); };
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } });
  module._compile(compiled.outputText, filename);
};
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { RoleModelPortrait } = require('../src/components/role-model-portrait.tsx');
const { enrichCareerProspects, isTrustedWikipediaUrl } = require('../src/lib/role-model.ts');
const { GET } = require('../src/app/api/role-model/portrait/route.ts');
const source = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Tim_Ferriss.jpg/330px-Tim_Ferriss.jpg';
const prospect = { name: 'Tim Ferriss', wikipediaTitle: 'Tim Ferriss' };
assert.ok(isTrustedWikipediaUrl(source, 'image'));
assert.ok(isTrustedWikipediaUrl('https://upload.wikimedia.org/image.jpg', 'image'));
for (const url of ['http://thumb.wikimedia.org/x', 'https://thumb.wikimedia.org.evil.test/x', 'https://evil.test/x']) assert.equal(isTrustedWikipediaUrl(url, 'image'), false);
const html = renderToStaticMarkup(React.createElement(RoleModelPortrait, { prospect }));
assert.match(html, /src="\/api\/role-model\/portrait\?title=Tim%20Ferriss"/);
assert.match(html, /alt="Tim Ferriss portrait"/);
assert.match(renderToStaticMarkup(React.createElement(RoleModelPortrait, { prospect: { ...prospect, imageUrl: source } })), /src="https:\/\/thumb.wikimedia.org/);
assert.match(renderToStaticMarkup(React.createElement(RoleModelPortrait, { prospect: { name: 'Mellody Hobson' } })), /title=Mellody%20Hobson/);
for (const file of ['report.tsx', 'preview-client.tsx']) assert.match(fs.readFileSync(path.join(root, 'src/components', file), 'utf8'), /<RoleModelPortrait prospect=/);
(async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async () => Response.json({ query: { pages: { 1: { title: 'Tim Ferriss', fullurl: 'https://en.wikipedia.org/wiki/Tim_Ferriss', thumbnail: { source } } } } });
    const enriched = await enrichCareerProspects([{ careerProspect: prospect }]);
    assert.equal(enriched[0].careerProspect.imageUrl, source);
    const response = await GET(new Request('https://thecoreme.com/api/role-model/portrait?title=Tim%20Ferriss'));
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), source);
    assert.match(response.headers.get('cache-control'), /s-maxage=86400/);
    assert.equal((await GET(new Request('https://thecoreme.com/api/role-model/portrait?title=A%7CB'))).status, 400);
    global.fetch = async () => { throw new Error('Upstream unavailable'); };
    const failure = await GET(new Request('https://thecoreme.com/api/role-model/portrait?title=Tim'));
    assert.equal(failure.status, 503);
    assert.equal(failure.headers.get('cache-control'), 'no-store');
  } finally { global.fetch = originalFetch; }
  console.log('Role model portrait regressions passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
