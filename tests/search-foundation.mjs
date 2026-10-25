import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const jsx = await import('react/jsx-runtime');
function load(path, deps = {}) {
  const module = {exports: {}};
  const out = ts.transpileModule(fs.readFileSync(path, 'utf8'), {compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}, reportDiagnostics: true});
  assert.equal((out.diagnostics || []).filter(d => d.category === 1).length, 0, path);
  new Function('require', 'module', 'exports', out.outputText)(name => {
    if (name in deps) return deps[name];
    if (name === 'react/jsx-runtime') return jsx;
    if (name.endsWith('.css')) return {};
    throw Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}
const positioning = load('src/lib/marketing/positioning.ts');
const blogData=JSON.parse(fs.readFileSync('src/data/trading-posts.json','utf8'));
const blogLibrary=load('src/lib/marketing/blog.ts',{'@/data/trading-posts.json':blogData,'./positioning':positioning});
const pages = load('src/lib/marketing/pages.ts', {'./positioning': positioning});
const sitemap = load('src/app/sitemap.ts', {'@/lib/marketing/pages': pages, '@/lib/marketing/positioning': positioning,'@/lib/marketing/blog':blogLibrary}).default();
assert.equal(new Set(sitemap.map(item => item.url)).size, sitemap.length);
assert.equal(sitemap.length, 13);
assert(sitemap.every(item => item.url.startsWith(positioning.SITE_URL)));
assert(!sitemap.some(item => /career|skill-stack|post\//.test(item.url)));
const overview = load('src/components/marketing/public-overview.tsx', {'@/lib/marketing/positioning': positioning}).default;
for (const locale of ['en', 'fr', 'zh']) {
  const html = renderToStaticMarkup(React.createElement(overview, {locale}));
  assert(html.includes(positioning.positioning[locale].description));
  assert(html.includes('href="/blog"'));
  assert(html.includes('href="/pricing"'));
}
const blog = load('src/app/blog/page.tsx', {'@/lib/marketing/pages': pages, '@/lib/marketing/positioning': positioning,'@/lib/marketing/blog':blogLibrary});
const blogHTML = renderToStaticMarkup(React.createElement(blog.default));
for (const page of pages.answerPages) assert(blogHTML.includes(`href="/${page.slug}"`));
assert.equal((blogHTML.match(/class="blog-resource-card"/g) || []).length, 7);
assert.equal((blogHTML.match(/blog-article-card/g)||[]).length,2);
assert.equal(blog.metadata.alternates.canonical, `${positioning.SITE_URL}/blog`);
assert(fs.readFileSync('src/components/account/account-shell.tsx', 'utf8').includes('className="account-blog" href="/blog"'));
const route = load('src/app/[slug]/page.tsx', {'next/navigation': {notFound: () => {throw Error('NOT_FOUND');}}, '@/lib/marketing/pages': pages, '@/lib/marketing/positioning': positioning});
for (const page of pages.answerPages) {
  const props = {params: Promise.resolve({slug: page.slug})};
  const metadata = await route.generateMetadata(props);
  assert.equal(metadata.alternates.canonical, `${positioning.SITE_URL}/${page.slug}`);
  const html = renderToStaticMarkup(await route.default(props));
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert(html.includes('lang="en"'));
  assert(html.includes(`entry=${page.slug}`));
  assert(html.includes('application/ld+json'));
  const schema = JSON.parse(html.match(/<script[^>]*>(.*?)<\/script>/s)[1]);
  assert.equal(schema['@graph'][0].url, metadata.alternates.canonical);
  for (const related of page.related) assert(pages.findAnswerPage(related));
  assert(!/not a|does not|doesn’t|without|isn’t/i.test(page.answer));
}
await assert.rejects(route.default({params: Promise.resolve({slug: 'old-career-page'})}), /NOT_FOUND/);
const source = fs.readFileSync('src/app/page.tsx', 'utf8');
assert(source.indexOf('<PublicOverview') > source.indexOf('</AccountShell>'));
const robots = load('src/app/robots.ts').default();
assert.equal(robots.rules.allow, '/');
assert.equal(robots.sitemap, `${positioning.SITE_URL}/sitemap.xml`);
assert(fs.readFileSync('public/461fa8052c4edd6325892fa2fa1e4882.txt', 'utf8').trim() === '461fa8052c4edd6325892fa2fa1e4882');
console.log('Passed: positioning, homepage, Blog hub with seven resources and two articles, thirteen canonical sitemap URLs, links, schema and unknown-route 404.');
