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
const {outlookWindow,default:Weekly}=load('src/components/quest/weekly-outlook.tsx');
assert.deepEqual(outlookWindow('2026-10-18T12:00:00Z'),{start:'2026-10-19',end:'2026-10-26',sunday:true});
assert.deepEqual(outlookWindow('2026-10-17T12:00:00Z'),{start:'2026-10-19',end:'2026-10-26',sunday:false});
assert.equal(outlookWindow('2026-10-17T22:30:00Z').sunday,true,'Paris is already Sunday');
assert.equal(outlookWindow('2026-10-25T23:30:00Z').sunday,false,'Paris winter time is already Monday');
assert.equal(outlookWindow('2026-10-25T12:00:00Z').start,'2026-10-26');
const {bossIdentities}=load('src/lib/quest/boss-identity.ts');assert.equal(Object.keys(bossIdentities).length,15);assert.equal(new Set(Object.values(bossIdentities).map(b=>b.icon)).size,15);
const {default:Preview}=load('src/components/quest/brief-preview.tsx');
const event={id:'claims',kind:'CLAIMS',title:'Release',at:'2026-10-22T12:30:00Z',sourceUrl:'https://example.org',status:'scheduled'};
for(locale of ['fr','en','zh']){const sunday=html(renderToStaticMarkup(React.createElement(Weekly,{events:[event],now:'2026-10-18T12:00:00Z'})));assert.equal(sunday('.weekly-outlook[open]').length,1);assert.equal(sunday('.weekly-modules>section').length,3);assert.equal(sunday('.weekly-lineup a').length,1);const saturday=html(renderToStaticMarkup(React.createElement(Weekly,{events:[],now:'2026-10-17T12:00:00Z'})));assert.equal(saturday('.weekly-outlook[open]').length,0);const preview=html(renderToStaticMarkup(React.createElement(Preview,{events:[],now:'2026-10-17T12:00:00Z'})));assert.ok(preview.text().includes({fr:'Marché fermé aujourd’hui',en:'Market closed today',zh:'今日休市'}[locale]));for(const id of Object.values(bossIdentities)){assert.ok(id[locale]);if(locale!=='zh')assert.ok(!/\p{Script=Han}/u.test(id[locale]));}}
console.log('15 unique Boss identities, localized weekend copy, Sunday expansion, Paris midnight/DST and three-module weekly layout passed.');
if(process.env.BOSS_VISUAL_FIXTURE){
 locale='fr';const Battle=load('src/components/quest/yelan-battle.tsx').default;
 const css=['src/components/quest/yelan.css','src/components/quest/boss-avatar.css'].map(f=>fs.readFileSync(f,'utf8')).join('\n');
 fs.mkdirSync('outputs/boss-world',{recursive:true});
 fs.writeFileSync('outputs/boss-world/battle.html',`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body{margin:24px;background:#fff6e5;font-family:Arial;max-width:420px}h1{font-size:18px}</style><h1>Démonstration visuelle · aucun résultat enregistré</h1>${renderToStaticMarkup(React.createElement(Battle,{date:'2026-10-16',active:true}))}</html>`);
}
