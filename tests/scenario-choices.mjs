import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
const require=createRequire(import.meta.url);let locale='fr';
const code=ts.transpileModule(fs.readFileSync('src/components/quest/scenario-choices.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const module={exports:{}};const formatUsd=(amount,loc)=>new Intl.NumberFormat(loc==='zh'?'zh-CN':loc==='en'?'en-US':'fr-FR',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(amount);
new Function('require','module','exports',code)(name=>name==='@/components/i18n/locale-provider'?{useLocale:()=>locale}:name==='@/lib/i18n/locale'?{formatUsd}:require(name),module,module.exports);
const Choices=module.exports.default;
const forecast={levels:{support:710,resistance:750},scenarios:['bullish','neutral','bearish'].map(direction=>({direction,low:715,high:745}))};
for(locale of ['fr','en','zh']){
 const $=load(renderToStaticMarkup(React.createElement(Choices,{forecast,value:'bearish',onChange:()=>{}})));
 assert.equal($('.scenario-choice').length,3);
 assert.equal($('.scenario-choice[aria-pressed=true]').length,1);
 assert.ok($('.bearish').is('[aria-pressed=true]'));
 assert.equal($('.scenario-choice-icon svg').length,3);
 assert.equal($('.scenario-choice[type=button]').length,3,'Choosing a scenario never submits the form');
 assert.equal($('.scenario-choice-range').length,3);
 const locked=load(renderToStaticMarkup(React.createElement(Choices,{forecast,value:'neutral',onChange:()=>{},disabled:true})));
 assert.equal(locked('button:disabled').length,3,'Locked judgments cannot be edited');
 const open=load(renderToStaticMarkup(React.createElement(Choices,{forecast,value:null,onChange:()=>{}})));
 assert.equal(open('.scenario-choice[aria-pressed=true]').length,0,'A new quest starts with no scenario selected');
 assert.equal(open('.scenario-equipped strong').length,0);
}
console.log('Scenario quests: French/English/Chinese, three direction icons, optional selection, preserved ranges, non-submitting choices and locked-state controls passed.');
