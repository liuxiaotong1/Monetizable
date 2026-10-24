import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as cheerio from 'cheerio';
function load(file,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>{if(name in deps)return deps[name];throw Error(name);},m,m.exports);return m.exports;}
const domain=load('src/lib/quest/domain.ts');
const releases=load('src/lib/quest/earnings-releases.ts',{'cheerio':cheerio,'./domain':domain});
const policy=load('src/lib/quest/refresh-policy.ts');
const now=new Date('2026-10-24T15:00:00Z');
const events=Object.entries(releases.verifiedEarningsReports).map(([key])=>{const [symbol,date]=key.split(':');return {kind:'EARNINGS',symbol,id:`earnings-${symbol}-${date}`,at:`${date}T20:00:00Z`,status:'pending',consensus:9,unit:'USD / EPS'};});
const chosen=policy.releaseCandidates(events,new Map(),now);
assert.equal(chosen.length,4,'Released earnings must be selected for result sync');
for(const event of events){const result=await releases.fetchEarningsRelease(event,now,()=>{throw Error('Upstream unavailable')});assert.equal(result.status,'confirmed');assert(result.earningsReport);assert(result.report.bodyUrl.startsWith('https://'));assert.equal(result.actual,undefined,'GAAP data must not be scored against an unverified adjusted consensus');assert.equal(result.consensus,9,'The original saved reference is not silently replaced');assert(result.fetchedAt<=now.toISOString());}
assert.equal(policy.refreshIssues([],events,now).overdue.length,4,'Health monitoring includes overdue earnings');
const tsla=events.find(e=>e.symbol==='TSLA');
assert.throws(()=>releases.applyEarningsReport({...tsla,at:'2027-01-21T21:00:00Z'},releases.verifiedEarningsReports['TSLA:2026-10-21'],new Date('2027-01-24')),/不匹配/);
assert.throws(()=>releases.parseEarningsNotice(tsla,'<h1>Tesla to Announce Third Quarter 2026 Results</h1><p>October 21, 2026 Tesla will post financial results.</p>','https://ir.tesla.com/notice',now),/预告/);
const notice='<h1>Tesla Releases Third Quarter 2026 Financial Results</h1><p>Austin, October 21, 2026. Tesla has released its financial results for the third quarter 2026.</p>';
assert.equal(releases.parseEarningsNotice(tsla,notice,'https://ir.tesla.com/results',now).status,'confirmed');
assert.throws(()=>releases.parseEarningsNotice(tsla,notice,'https://evil.example/results',now),/来源/);
assert.throws(()=>releases.parseEarningsNotice({...tsla,at:'2026-10-22T20:00:00Z'},notice,'https://ir.tesla.com/results',now),/目标日/);
await assert.rejects(releases.fetchEarningsRelease({...tsla,at:'2026-10-25T20:00:00Z'},now),/尚未/);
const macro=Array.from({length:8},(_,i)=>({id:'macro-'+i,kind:'CPI',status:'pending',at:'2026-10-23T12:30:00Z'}));
const mixed=policy.releaseCandidates([...events,...macro],new Map(),now);assert.equal(mixed.filter(e=>e.kind==='EARNINGS').length,4);assert.equal(mixed.filter(e=>e.kind!=='EARNINGS').length,6,'Earnings cannot starve macro updates');
console.log('Passed: released-earnings queue, 4 official backfills, outage fallback, source/date checks, no future results, EPS basis isolation and independent macro slots.');
const future={...tsla,id:'tsla-2026-10-28',at:'2026-10-28T20:00:00Z',sourceUrl:'https://ir.tesla.com/announcement'};
const discovered=await releases.fetchEarningsRelease(future,new Date('2026-10-29T12:00:00Z'),async url=>url.includes('/submissions/')?JSON.stringify({filings:{recent:{form:['8-K'],reportDate:['2026-10-28'],filingDate:['2026-10-28'],items:['2.02'],accessionNumber:['0001-26-0001'],primaryDocument:['tesla-result.htm']}}}):'<h1>Tesla Releases Third Quarter 2026 Financial Results</h1><p>October 28, 2026. Tesla has released its financial results for the third quarter 2026.</p>');
assert.equal(discovered.status,'confirmed');assert(discovered.sourceUrl.includes('/Archives/edgar/data/1318605/'));assert.equal(discovered.earningsReport.period,'2026-Q3');
console.log('Passed automatic dated SEC filing discovery without a bundled backfill.');
