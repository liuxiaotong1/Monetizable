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
const saved={fetchedAt:'2026-10-14T19:59:50Z',bars:[{symbol:'QQQ',date:'2026-10-13'}]};
assert.equal(free.freeBarsNeedRefresh(saved,new Date('2026-10-14T19:59:59Z')),false);
assert.equal(free.freeBarsNeedRefresh(saved,new Date('2026-10-14T20:00:00Z')),true);
assert.equal(free.freeBarsNeedRefresh({...saved,fetchedAt:'2026-10-14T20:00:01Z'},new Date('2026-10-14T20:00:10Z')),false);
assert.equal(free.freeBarsNeedRefresh({...saved,fetchedAt:'2026-10-14T20:00:01Z'},new Date('2026-10-14T20:00:16Z')),true,'Missing closing candles retry after fifteen seconds, not fifteen minutes');
assert.equal(free.freeBarsNeedRefresh({...saved,fetchedAt:'2026-10-14T20:00:01Z',bars:[{symbol:'QQQ',date:'2026-10-14'}]},new Date('2026-10-14T20:01:00Z')),false);
for(const [date,close] of [['2026-10-30','2026-10-30T20:00:00Z'],['2026-11-02','2026-11-02T21:00:00Z'],['2026-11-27','2026-11-27T18:00:00Z']]){
 const at=new Date(close);assert.equal(domain.sessionReady(date,new Date(+at-1)),false);assert.equal(domain.sessionReady(date,at),true);assert.equal(domain.latestCompletedDate(at),date);
}
assert.equal(domain.sessionReady('2026-12-25',new Date('2026-12-25T23:00:00Z')),false);
const close=new Date('2026-11-02T21:00:00Z');
const candle={chart:{result:[{meta:{symbol:'QQQ',exchangeTimezoneName:'America/New_York',dataGranularity:'1d',regularMarketTime:+close/1000},timestamp:[+new Date('2026-11-02T14:30:00Z')/1000],indicators:{quote:[{open:[100],high:[102],low:[99],close:[101],volume:[10000]}]}}]}};
assert.throws(()=>free.parseFreeBars(candle,'QQQ',new Date(+close-1)));
assert.equal(free.parseFreeBars(candle,'QQQ',close)[0].date,'2026-11-02');
const delayed=structuredClone(candle);delayed.chart.result[0].meta.regularMarketTime-=60;
assert.throws(()=>free.parseFreeBars(delayed,'QQQ',close),'A delayed pre-close quote cannot become a completed result');
console.log('Passed immediate closing boundary, fifteen-second retry, daylight/standard time, early close, holiday and delayed-quote checks.');
