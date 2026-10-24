import assert from 'node:assert/strict';import fs from 'node:fs/promises';import ts from 'typescript';import {pathToFileURL}from'node:url';
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const compile=async name=>ts.transpileModule(await fs.readFile(`src/lib/quest/${name}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const domain=url(await compile('domain'));
const packageURL=pathToFileURL(import.meta.resolve('cheerio').replace('file://','')).href;
const backfill=url((await compile('official-backfill')).replace('"./domain"',JSON.stringify(domain)).replace('"cheerio"',JSON.stringify(packageURL)));
const blsApi=url(await compile('bls-api'));
const earnings=url((await compile('earnings-releases')).replace("'./domain'",JSON.stringify(domain)).replace("'cheerio'",JSON.stringify(packageURL)));
const releases=url((await compile('official-release')).replace("'./earnings-releases'",JSON.stringify(earnings)).replace("'./bls-api'",JSON.stringify(blsApi)).replace("'./domain'",JSON.stringify(domain)).replace("'./official-backfill'",JSON.stringify(backfill)).replace("'cheerio'",JSON.stringify(packageURL)));
const {parseStatisticalRelease}=await import(releases);
const {state}=JSON.parse(await fs.readFile('src/data/public-feed.json','utf8')),cpi=state.events.find(e=>e.id==='cpi-2026-10-14'),text=await fs.readFile('tests/fixtures/cpi-2026-10-14.txt','utf8');
const result=parseStatisticalRelease(cpi,`<body>${text}</body>`,'https://www.dol.gov/newsroom/economicdata/cpi_10142026.pdf','2026-10-14T20:40:00Z');
assert.equal(result.actual,3.7);assert.equal(result.previous,3.4);assert.equal(result.period,'2026-09');assert.equal(result.status,'confirmed');assert.equal(result.report.metrics[0].value,0.6);assert.equal(result.report.metrics[1].value,2.6);assert(result.report.summary.some(s=>s.includes('0.6')));assert(result.report.summary.some(s=>s.includes('2.6')));
assert.throws(()=>parseStatisticalRelease({...cpi,at:'2026-11-10T13:30:00Z'},`<body>${text}</body>`,result.sourceUrl,'2026-11-10T20:40:00Z'));
assert.throws(()=>parseStatisticalRelease(cpi,`<body>${text}</body>`,result.sourceUrl,'2026-10-14T12:29:00Z'));
assert.throws(()=>parseStatisticalRelease(cpi,'<body>October 14, 2026 Calendar only: CPI release at 8:30</body>',result.sourceUrl,'2026-10-14T20:40:00Z'));
// Extract pure parser functions from server module; no live DB or network in regression tests.
let refreshCode=await compile('data-refresh');refreshCode=refreshCode.replace(/^import .*?;\n/gm,'');
const {parseCalendar,parseHistory,publicationVersion}=await import(url(`import {load} from ${JSON.stringify(packageURL)};import {marketDate,nyTimeToUtc,addDays} from ${JSON.stringify(domain)};\n`+refreshCode));
const html='<table><tr><td>14 Consumer Price Index (08:30)</td><td>15 Initial Claims (08:30)</td></tr></table>';
const parsed=parseCalendar(html,'2026-10',state.events,'https://www.newyorkfed.org/research/calendars/i-oct26.html',new Date('2026-10-14T20:40:00Z'));
assert.equal(parsed[0].at,'2026-10-14T12:30:00.000Z');
const winter=parseCalendar(html,'2026-11',state.events,'https://www.newyorkfed.org/research/calendars/i-nov26.html',new Date('2026-10-14T20:40:00Z'));assert.equal(winter[0].at,'2026-11-14T13:30:00.000Z');
assert.equal(parseHistory('observation_date,CPIAUCNS\n2025-09-01,100\n2026-09-01,103.7',{id:'CPIAUCNS',change:'yoy'})[0].value,3.7);
assert.equal(parseHistory('observation_date,PAYEMS\n2026-07-01,100\n2026-09-01,200',{id:'PAYEMS',change:'diff'}).length,0,'A missing month must not be counted as a one-month jobs change');
const history=publicationVersion(cpi,result);assert.equal(history.length,1);assert.equal(publicationVersion({...result,releaseHistory:history},result).length,1,'Repeating an identical release must not append a duplicate');assert.equal(publicationVersion({...result,releaseHistory:history},{...result,actual:3.8}).length,2);
const cardsModule=url((await compile('daily-content')).replace("'./domain'",JSON.stringify(domain)));const {factualCards}=await import(cardsModule);state.events=[result];const cards=factualCards(state,'en');assert.equal(cards[0].asOf,'2026-10-14');assert.equal(cards[0].conceptId,factualCards(state,'zh')[0].conceptId);assert.equal(cards[0].id,factualCards(state,'en')[0].id,'Polling must not create duplicate question identities');
console.log('Passed official CPI actual/previous/core/monthly, wrong date, pre-release guard, calendar DST, historical units/gaps, version idempotence and factual card identities.');

const {parseOfficialDocument}=await import(backfill);const ism=parseOfficialDocument({kind:'ISM',url:'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/pmi/september/',content:'<body>September 2026 ISM Manufacturing PMI Report Manufacturing PMI registered 54.5 percent in September, 0.1 point below the August figure of 54.6 percent.</body>'},'2026-10-14T21:00:00Z');assert.equal(ism.actual,54.5);assert.equal(ism.previous,54.6);console.log('Passed ISM current/previous comparator wording.');

const {parseBlsSeries,enrichReleaseMetrics}=await import(blsApi);const records=await fs.readFile('tests/fixtures/bls-cpi-2026-09.json','utf8');if(records){const parsed=parseBlsSeries(cpi,JSON.parse(records),'2026-10-14T21:30:00Z');assert.equal(parsed.actual,3.7);assert.equal(parsed.previous,3.4);assert.equal(parsed.report.metrics[0].value,0.6);assert.equal(parsed.report.metrics[1].value,2.6);}
const migrated=enrichReleaseMetrics({...result,report:{...result.report,metrics:undefined}});assert.equal(migrated.report.metrics[0].value,0.6);assert.equal(migrated.fetchedAt,result.fetchedAt);console.log('Passed official API fallback and legacy verified metric enrichment.');

const staleAPI=JSON.parse(records);staleAPI.Results.series.forEach(s=>s.data=s.data.filter(p=>!(p.year==='2026'&&p.period==='M09')));assert.throws(()=>parseBlsSeries(cpi,staleAPI,'2026-10-14T21:30:00Z'));console.log('Passed stale API period rejection.');
