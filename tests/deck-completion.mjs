import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load as html} from 'cheerio';
const require=createRequire(import.meta.url);let locale='fr';const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(name=>{if(name.includes('locale-provider'))return{useLocale:()=>locale};if(name==='@/lib/quest/english')return{eventText:e=>({title:e.title})};if(name==='@/lib/i18n/translate')return{translateString:s=>s};if(name.endsWith('.css'))return{};if(name.startsWith('.')||name.startsWith('@/')){const base=name.startsWith('@/')?path.resolve('src',name.slice(2)):path.resolve(path.dirname(file),name);const target=['','.ts','.tsx','.json'].map(ext=>base+ext).find(p=>fs.existsSync(p));return target.endsWith('.json')?JSON.parse(fs.readFileSync(target)):load(target);}return require(name);},module,module.exports);cache.set(file,module.exports);return module.exports;}
const {advanceDeckBatch}=load('src/lib/quest/deck-completion.ts');
let state={seen:[],batch:[]};
assert.equal(advanceDeckBatch(state,'a',['a','b']).completed,0);
for(let i=0;i<5;i++){const r=advanceDeckBatch(state,String(i),['next']);state=r.state;assert.equal(r.completed,i===4?5:0);}
assert.equal(advanceDeckBatch(state,'4',[]).completed,0,'Duplicate completion is ignored');
assert.equal(advanceDeckBatch(state,'last',[]).completed,1,'A shorter final pack also celebrates');
const Victory=load('src/components/quest/deck-victory.tsx').default;
for(locale of ['fr','en','zh']){const demo=html(renderToStaticMarkup(React.createElement(Victory,{demo:true})));assert.equal(demo('button').length,0);assert.ok(demo('small').text());const actual=html(renderToStaticMarkup(React.createElement(Victory,{count:3})));assert.equal(actual('button').length,1);assert.ok(actual('strong').text().startsWith('3'));if(locale!=='zh')assert.ok(!/\p{Script=Han}/u.test(actual.text()));}
console.log('Deck batches, duplicate protection, final short packs and three-language victory views passed.');
