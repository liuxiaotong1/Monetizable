import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createJiti} from 'jiti';
const jiti=createJiti(import.meta.url);const {cacheDue,releaseCandidates,refreshIssues}=await jiti.import('../src/lib/quest/refresh-policy.ts');
const now=new Date('2026-10-15T13:00:00Z');
test('failed daily caches retry in five minutes, successful caches retain their TTL',()=>{
 const prior={version:1,attemptedAt:'2026-10-15T12:54:00Z'};
 assert.equal(cacheDue(prior,86400000,now),false);
 assert.equal(cacheDue({...prior,error:'HTTP 403'},86400000,now),true);
 assert.equal(cacheDue({...prior,error:'HTTP 403',attemptedAt:'2026-10-15T12:59:00Z'},86400000,now),false);
});
test('today is prioritized and old archives cannot be starved by new releases',()=>{
 const events=Array.from({length:8},(_,i)=>({id:`new${i}`,kind:'CPI',at:'2026-10-15T12:30:00Z',status:'pending'}));
 events.push({id:'old',kind:'CLAIMS',at:'2026-08-01T12:30:00Z',status:'pending'});
 const chosen=releaseCandidates(events,new Map(),now);assert.equal(chosen.length,6);assert.ok(chosen.some(e=>e.id==='old'));assert.equal(chosen[0].id,'new0');
});
test('old confirmed releases still retry a failed source or parser upgrade',()=>{
 const event={id:'claims-old',kind:'CLAIMS',at:'2026-10-08T12:30:00Z',status:'confirmed'},latest={...event,id:'claims-new',at:'2026-10-15T12:30:00Z'};
 assert.ok(releaseCandidates([event,latest],new Map([[event.id,{version:4,attemptedAt:now.toISOString()}]]),now).some(e=>e.id===event.id));
});
test('one failed provider makes overall data health partial even if all events are confirmed',()=>{
 assert.equal(refreshIssues([{name:'FRED CPI 历史',status:'delayed',message:'failed'}],[],now).sources.length,1);
 assert.equal(refreshIssues([{name:'Massive 日线',status:'missing',message:'optional'}],[],now).sources.length,0);
});
test('full official FOMC year retires misclassified imported dates, while incomplete calendars and confirmed emergency decisions stay intact',async()=>{
 const {reconcileFomcCalendar}=await jiti.import('../src/lib/quest/refresh-policy.ts');
 const calendar=['01-29','03-19','05-07','06-18','07-30','09-17','10-29','12-10'].map(day=>({kind:'FOMC',at:`2025-${day}T18:00:00Z`}));
 const bad={id:'bad',kind:'FOMC',at:'2025-08-22T18:00:00Z',status:'pending',sourceUrl:'https://www.federalreserve.gov/newsevents/pressreleases/monetary20250822a.htm'};
 assert.equal(reconcileFomcCalendar([bad],calendar).length,0);
 assert.equal(reconcileFomcCalendar([bad],calendar.slice(0,7)).length,1);
 assert.equal(reconcileFomcCalendar([{...bad,status:'confirmed'}],calendar).length,1);
 assert.equal(reconcileFomcCalendar([{...bad,sourceUrl:'https://example.test/manual'}],calendar).length,1);
});
