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
