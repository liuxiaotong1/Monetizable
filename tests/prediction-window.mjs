import assert from 'node:assert/strict';import fs from 'node:fs/promises';import ts from 'typescript';
const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');const compile=async path=>ts.transpileModule(await fs.readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const domainURL=url(await compile('src/lib/quest/domain.ts')),domain=await import(domainURL);
const predictionURL=url((await compile('src/lib/quest/prediction-window.ts')).replace('"./domain"',JSON.stringify(domainURL)).replace("'./domain'",JSON.stringify(domainURL))),prediction=await import(predictionURL);
const target=now=>prediction.predictionSession({now,session:domain.sessionFor(new Date(now))}).date;
assert.equal(target('2026-10-13T13:29:59Z'),'2026-10-13');assert.equal(target('2026-10-13T13:30:00Z'),'2026-10-14');assert.equal(target('2026-10-16T20:30:00Z'),'2026-10-19');assert.equal(target('2026-12-25T12:00:00Z'),'2026-12-28');
const bars=Array.from({length:25},(_,i)=>({symbol:'QQQ',date:domain.addDays('2026-09-01',i),open:100+i,high:103+i,low:98+i,close:101+i,volume:1000,source:'verified fixture',fetchedAt:'2026-10-12T22:00:00Z'}));
const forecast=prediction.preparationForecast(bars,'2026-10-14',new Date('2026-10-13T15:00:00Z'));
assert.equal(forecast.date,'2026-10-14');assert.equal(forecast.provisional,true);assert.equal(forecast.baselineDate,bars.at(-1).date);assert(forecast.scenarios.every(s=>Number.isFinite(s.low)&&s.low<=s.high));
console.log('Passed opening cutoff, next session, Friday/weekend, holiday and provisional forecast checks.');

const freeURL=url((await compile('src/lib/quest/free-market.ts')).replace('"./domain"',JSON.stringify(domainURL))),free=await import(freeURL);
const saved={fetchedAt:'2026-10-14T20:13:09Z',bars:[{symbol:'QQQ',date:'2026-10-13'}]};
assert.equal(free.freeBarsNeedRefresh(saved,new Date('2026-10-14T20:19:59Z')),false);
assert.equal(free.freeBarsNeedRefresh(saved,new Date('2026-10-14T20:20:00Z')),true);
assert.equal(free.freeBarsNeedRefresh({...saved,fetchedAt:'2026-10-14T20:21:00Z'},new Date('2026-10-14T20:22:00Z')),false,'An after-close attempt should respect the retry interval');
assert.equal(free.freeBarsNeedRefresh({...saved,bars:[{symbol:'QQQ',date:'2026-10-14'}]},new Date('2026-10-14T20:22:00Z')),false);
console.log('Passed close-confirmation cache boundary and retry checks.');
