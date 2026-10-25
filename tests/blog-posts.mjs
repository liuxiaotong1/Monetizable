import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const jsx=await import('react/jsx-runtime');
function load(file,deps={}){const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(name=>{if(name==='react/jsx-runtime')return jsx;if(name.endsWith('.css'))return{};if(name in deps)return deps[name];throw Error(name)},mod,mod.exports);return mod.exports;}
const data=JSON.parse(fs.readFileSync('src/data/trading-posts.json','utf8'));
const positioning=load('src/lib/marketing/positioning.ts');
const library=load('src/lib/marketing/blog.ts',{'@/data/trading-posts.json':data,'./positioning':positioning});
const route=load('src/app/blog/[slug]/page.tsx',{'next/navigation':{notFound:()=>{throw Error('NOT_FOUND')}},'@/lib/marketing/blog':library,'@/lib/marketing/positioning':positioning});
assert.equal(data.length,2);
for(const p of data){
 const markdown=fs.readFileSync(`content/blog/${p.slug}.md`,'utf8');
 const words=(markdown.replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[#*|]/g,' ').match(/\b[\w’]+(?:[-.][\w’]+)*\b/g)||[]).length;
 assert.equal(p.words,words);assert(words>800&&words<=1000);assert.equal(Math.ceil(words/200),5);assert.equal(p.readingMinutes,5);
 assert(!/trademindful|eight tools|founder|I tried|I built/i.test(markdown));assert(!/<script|onerror=|javascript:/i.test(p.html));
 assert(fs.existsSync('public'+p.hero));
 const props={params:Promise.resolve({slug:p.slug})};const meta=await route.generateMetadata(props);
 assert.equal(meta.alternates.canonical,`${positioning.SITE_URL}/blog/${p.slug}`);
 const html=renderToStaticMarkup(await route.default(props));
 assert.equal((html.match(/<h1>/g)||[]).length,1);assert(html.includes('5 min read'));assert(html.includes('application/ld+json'));assert(html.includes('#first-prediction'));
 assert.equal(library.articleSchema(p)['@graph'][0].timeRequired,'PT5M');
}
const rows=data[0].html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/g);
assert.equal(rows.length,7);assert.deepEqual(rows.map((r,i)=>r.includes('highlight-row')?i+1:null).filter(Boolean),[2,4,6]);
assert(rows[1].includes('Monetizable'));assert(rows[3].includes('Edgewonk'));assert(rows[5].includes('Tradervue'));
await assert.rejects(route.default({params:Promise.resolve({slug:'not-a-post'})}),/NOT_FOUND/);
const feed=load('src/app/feed.xml/route.ts',{'@/lib/marketing/blog':library,'@/lib/marketing/positioning':positioning});
const rss=await feed.GET().text();assert.equal((rss.match(/<item>/g)||[]).length,2);assert(rss.includes('&amp;'));
console.log('Passed: 5-minute word budgets, 7 tools, rows 2/4/6 highlighted, metadata/schema/images/CTAs, RSS and unknown-post 404.');
