import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const catalog=JSON.parse(fs.readFileSync('src/lib/i18n/fr.json'));
function load(file,deps={}){const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;const module={exports:{}};new Function('require','module','exports',code)(name=>{if(name in deps)return deps[name];throw Error('Unmocked dependency '+name);},module,module.exports);return module.exports;}
const locale=load('src/lib/i18n/locale.ts');
assert.equal(locale.resolveLocale(undefined),'fr');assert.equal(locale.resolveLocale('en'),'en');assert.equal(locale.resolveLocale('zh'),'zh');assert.equal(locale.resolveLocale(undefined,true),'zh');assert.equal(locale.resolveLocale('fr',true),'fr');
const trans=load('src/lib/i18n/translate.ts',{'./fr.json':catalog,'./zh.json':JSON.parse(fs.readFileSync('src/lib/i18n/zh.json'))});
assert.equal(trans.translateString('Daily Quest'),'Quête du jour');assert.equal(trans.translateString('Daily Quest','en'),'Daily Quest');
assert.equal(trans.translateString('Monetizable'),'Monetizable');
assert.equal(trans.translateString('No eligible prediction for 2026-10-15; calls for other dates are checked separately.'),'Aucune prévision admissible pour le 2026-10-15 ; celles des autres dates sont vérifiées séparément.');
assert.equal(trans.translateString('Latest verified close: 2026-10-15. Daily data is up to date.').includes('Daily data'),false,'Nested template captures are translated');
for(const [en,fr]of Object.entries(catalog)){assert.deepEqual((en.match(/\{\d+\}/g)||[]).sort(),(fr.match(/\{\d+\}/g)||[]).sort(),'Placeholders: '+en);}
assert.equal(trans.translateString('Above consensus · QQQ · potential valuation pressure').includes('potential valuation'),false);
assert.equal(trans.translateString('% · year over year · not seasonally adjusted'),'% · sur un an · non corrigé des variations saisonnières');
const cards=JSON.parse(fs.readFileSync('src/data/english-cards.json'));
for(const card of cards){const fr=trans.frenchCopy(card);assert.equal(fr.id,card.id);assert.equal(fr.conceptId,card.conceptId);assert.deepEqual(fr.tags,card.tags);assert.equal(fr.answerIndex,card.answerIndex);assert.equal(fr.choices.length,card.choices.length);assert.deepEqual(fr.sources.map(s=>s.url),card.sources.map(s=>s.url));for(const key of ['title','question','explanation','answerExplanation','analogy','example']){assert.ok(catalog[card[key].replace(/\s+/g,' ').trim()]||!/[A-Za-z]{2}/.test(card[key]),'French coverage: '+card.id+' '+key);}for(const choice of card.choices)assert.ok(catalog[choice.replace(/\s+/g,' ').trim()]||!/[A-Za-z]{2}/.test(choice),'Choice coverage '+choice);}
const jsx=await import('react/jsx-runtime');const provider=load('src/components/i18n/locale-provider.tsx',{'react':React,'react/jsx-runtime':jsx,'@/lib/i18n/translate':trans});
const {LocaleProvider,LocalizeTree}=provider;
const tree=React.createElement(LocaleProvider,{locale:'fr'},React.createElement(LocalizeTree,null,React.createElement('div',null,React.createElement('button',{onClick:()=>{},title:'Daily Quest'},'Daily Quest'),React.createElement('p',{translate:'no'},'Bullish'),React.createElement('input',{value:'Bullish',readOnly:true,placeholder:'Daily Quest'}))));
const html=renderToStaticMarkup(tree);assert.ok(html.includes('title="Quête du jour"'));assert.ok(html.includes('translate="no">Bullish'));assert.ok(html.includes('value="Bullish"'));assert.ok(html.includes('placeholder="Quête du jour"'));
const billing=fs.readFileSync('src/lib/account/billing.ts','utf8');assert.ok(billing.includes('PREMIUM_CENTS=1990,TRIAL_DAYS=7'));assert.ok(billing.includes('locale:await requestLocale(isAdmin(user))'));assert.ok(billing.includes('s.locale===locale'));assert.ok(billing.includes('19,90 $US par mois'));
console.log('French locale: defaults, admin exception, nested templates, all 62 card identities/content, user text and form values, and unchanged subscription terms passed.');
assert.equal(trans.translateString('Continue with Google','zh'),'使用 Google 继续');
const chineseTree=React.createElement(LocaleProvider,{locale:'zh'},React.createElement(LocalizeTree,null,React.createElement('div',null,React.createElement('button',null,'Continue with Google'),React.createElement('input',{value:'My own words',readOnly:true}),React.createElement('p',{'data-user-content':true},'Continue with Google'))));
const chineseHtml=renderToStaticMarkup(chineseTree);assert.ok(chineseHtml.includes('使用 Google 继续'));assert.ok(chineseHtml.includes('value="My own words"'));assert.ok(chineseHtml.includes('>Continue with Google</p>'));
const publicSwitcher=renderToStaticMarkup(React.createElement(LocaleProvider,{locale:'fr'},React.createElement(provider.LanguageSwitcher)));
assert.ok(publicSwitcher.includes('value="zh"'),'Chinese is available to visitors without admin privileges');
console.log('Public Chinese selection, translated auth copy and preservation of user content passed.');
