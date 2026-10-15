import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createJiti} from 'jiti';
const jiti=createJiti(import.meta.url);
const {fetchOfficialRelease,officialContent}=await jiti.import('../src/lib/quest/official-release.ts');
const {parseOfficialDocument}=await jiti.import('../src/lib/quest/official-backfill.ts');
const event={id:'claims-2026-10-15',kind:'CLAIMS',at:'2026-10-15T12:30:00.000Z',status:'pending',title:'初请失业金',history:[],unit:'人，季调初次申请'};
// Public-domain excerpt of the DOL release dated 15 October 2026.
const content=`<body>TRANSMISSION OF MATERIALS IN THIS RELEASE IS EMBARGOED UNTIL
8:30 A.M. (Eastern) Thursday, October 15, 2026
UNEMPLOYMENT INSURANCE WEEKLY CLAIMS SEASONALLY ADJUSTED DATA
In the week ending October 10, the advance figure for seasonally adjusted initial claims was 199,000,
an increase of 1,000 from the previous week’s revised level.
The previous week’s level was revised up by 1,000 from 197,000 to 198,000.</body>`;
const now=new Date('2026-10-15T12:45:00Z');
test('dated official archive supplies actual, original previous and revision independently of blocked DOL current PDF',async()=>{
 const calls=[];const result=await fetchOfficialRelease(event,now,async url=>{calls.push(url);if(new URL(url).hostname==='www.dol.gov')throw Error('HTTP 403');return content;});
 assert.equal(calls[0],'https://oui.doleta.gov/press/2026/101526.pdf');
 assert.equal(result.status,'confirmed');assert.equal(result.actual,199000);assert.equal(result.previous,197000);assert.equal(result.revised,198000);assert.equal(result.period,'2026-10-10');
});
test('falls back to current official PDF if archive is temporarily unavailable',async()=>{
 const result=await fetchOfficialRelease(event,now,async url=>{if(new URL(url).hostname==='oui.doleta.gov')throw Error('HTTP 404');return content;});
 assert.equal(result.sourceUrl,'https://www.dol.gov/ui/data.pdf');assert.equal(result.actual,199000);
});
test('a prior-week PDF cannot confirm this week or a report before publication',async()=>{
 await assert.rejects(fetchOfficialRelease(event,now,async()=>content.replace('October 15, 2026','October 8, 2026')));
 await assert.rejects(fetchOfficialRelease(event,new Date('2026-10-15T12:29:00Z'),async()=>content));
});
test('an unrevised prior week is valid and does not invent a revision',()=>{
 const value=parseOfficialDocument({kind:'CLAIMS',url:'https://www.dol.gov/ui/data.pdf',content:content.replace('The previous week’s level was revised up by 1,000 from 197,000 to 198,000.','The previous week’s unrevised level of 197,000.')},now.toISOString());
 assert.equal(value.previous,197000);assert.equal(value.revised,undefined);
});
if(process.env.TEST_LIVE_CLAIMS==='1')test('parses the actual dated official PDF through the production reader',async()=>{
 const result=await fetchOfficialRelease(event,now,officialContent);assert.equal(result.actual,199000);assert.equal(result.revised,198000);
});
test('a BEA RSS outage does not block its date-verified PCE article',async()=>{
 const pce={...event,id:'pce-2026-09-30',kind:'PCE',at:'2026-09-30T12:30:00Z',sourceUrl:'https://apps.bea.gov/API/signup/release_dates.json'};
 const result=await fetchOfficialRelease(pce,new Date('2026-09-30T13:00:00Z'),async url=>{if(url.includes('/rss/'))throw Error('RSS unavailable');assert.equal(url,'https://www.bea.gov/news/2026/personal-income-and-outlays-august-2026');return '<body>September 30, 2026 Personal Income and Outlays From the same month one year ago the PCE price index increased 3.0 percent.</body>';});
 assert.equal(result.actual,3);assert.equal(result.status,'confirmed');
});
test('BEA delayed releases can describe an older observation month, but publication date must match',async()=>{
 const pce={...event,id:'pce-2026-01-22',kind:'PCE',at:'2026-01-22T15:00:00Z',sourceUrl:'https://apps.bea.gov/API/signup/release_dates.json'};
 const result=await fetchOfficialRelease(pce,new Date('2026-01-22T16:00:00Z'),async url=>{if(url.includes('november-2025'))return '<body>January 22, 2026 Personal Income and Outlays From the same month one year ago the PCE price index increased 3.0 percent.</body>';throw Error('Unavailable');});
 assert.equal(result.actual,3);assert.match(result.sourceUrl,/november-2025/);
});
test('Fed target ranges accept nonbreaking hyphens and decimal notation',async()=>{
 const {parseStatisticalRelease}=await jiti.import('../src/lib/quest/official-release.ts');
 const fomc={...event,kind:'FOMC',at:'2026-01-28T19:00:00Z'};
 for(const [range,expected] of [['3‑1/2 to 3‑3/4',3.75],['3.50 to 3.75',3.75]])assert.equal(parseStatisticalRelease(fomc,`<body>January 28, 2026 target range for the federal funds rate at ${range} percent.</body>`,'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260128a.htm','2026-01-28T20:00:00Z').actual,expected);
});
test('BEA archive matches release date and metric, not a neighboring release or untrusted link',async()=>{
 const {parseBeaArchive}=await jiti.import('../src/lib/quest/official-release.ts');
 const row=(href,title,date)=>`<tr><td><a href="${href}">${title}</a></td><td><time datetime="${date}"></time></td></tr>`;
 const html=`<table>${row('/news/2026/gdp-test','GDP (Second Estimate), 2nd Quarter 2026','2026-08-26T08:30:00-04:00')}${row('https://evil.test/news/2026/x','GDP (Second Estimate)','2026-08-26T08:30:00-04:00')}${row('/news/2026/pce','Personal Income and Outlays','2026-08-26T08:30:00-04:00')}${row('/news/2026/wrong-date','GDP (Advance Estimate)','2026-07-30T08:30:00-04:00')}</table>`;
 assert.deepEqual(parseBeaArchive('GDP',html,'2026-08-26'),['https://www.bea.gov/news/2026/gdp-test']);
});
test('combined PCE publication uses the later month rather than silently taking the first value',async()=>{
 const {parseStatisticalRelease}=await jiti.import('../src/lib/quest/official-release.ts');const pce={...event,kind:'PCE',at:'2026-01-22T15:00:00Z'};
 const result=parseStatisticalRelease(pce,'<body>January 22, 2026 Personal Income and Outlays, October and November 2025. From the same month one year ago, the PCE price index increased 2.7 percent in October, followed by an increase of 2.8 percent in November.</body>','https://www.bea.gov/news/2026/personal-income-and-outlays-october-and-november-2025','2026-01-22T16:00:00Z');
 assert.equal(result.actual,2.8);assert.equal(result.previous,2.7);
});
test('BEA RSS links without a scheme are normalized before fetching',async()=>{
 const eventGDP={...event,id:'gdp-2026-02-20',kind:'GDP',at:'2026-02-20T13:30:00Z',sourceUrl:'https://apps.bea.gov/API/signup/release_dates.json'};
 const result=await fetchOfficialRelease(eventGDP,new Date('2026-02-20T15:00:00Z'),async url=>url.includes('/rss/')?'<rss><channel><item><title>GDP (Advance Estimate)</title><pubDate>Fri, 20 Feb 2026 08:30:00 EST</pubDate><link>www.bea.gov/news/2026/gdp-advance</link></item></channel></rss>':(assert.equal(url,'https://www.bea.gov/news/2026/gdp-advance'),'<body>February 20, 2026 Real gross domestic product increased at an annual rate of 1.4 percent.</body>'));
 assert.equal(result.actual,1.4);
});
test('Fed strategy notation votes are qualitative releases, not missing interest rate decisions',async()=>{
 const {parseStatisticalRelease}=await jiti.import('../src/lib/quest/official-release.ts');const e={...event,kind:'FOMC',at:'2025-08-22T18:00:00Z'};
 const r=parseStatisticalRelease(e,`<body>August 22, 2025 Statement on Longer-Run Goals and Monetary Policy Strategy ${'Policy framework text. '.repeat(90)}</body>`,'https://www.federalreserve.gov/newsevents/pressreleases/monetary20250822a.htm','2026-10-15T15:00:00Z');
 assert.equal(r.status,'confirmed');assert.equal(r.actual,undefined);assert.match(r.description,/不是一次利率/);assert.ok(r.report);
});
test('a confirmed qualitative policy statement does not display a pending numeric value',async()=>{
 const {numericEvent}=await jiti.import('../src/lib/quest/event-view.ts');
 assert.equal(Boolean(numericEvent({...event,kind:'FOMC',status:'confirmed',report:{title:'Strategy',summary:[],bodyUrl:'https://www.federalreserve.gov'}})),false);
 assert.equal(Boolean(numericEvent({...event,kind:'FOMC',status:'pending'})),true);
});
