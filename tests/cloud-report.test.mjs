import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportSlot,snapshot,buildReport} from '../scripts/cloud-report.mjs';
test('One hour before NY open follows US DST, including the Paris DST gap',()=>{
 for(const [at,open]of [['2026-07-15T12:30:00Z','2026-07-15T13:30:00Z'],['2026-12-15T13:30:00Z','2026-12-15T14:30:00Z'],['2026-10-27T12:30:00Z','2026-10-27T13:30:00Z']])assert.equal(reportSlot(new Date(at),{isTradingDay:true,openAt:open})?.kind,'daily');
 assert.equal(reportSlot(new Date('2026-10-27T13:30:00Z'),{isTradingDay:true,openAt:'2026-10-27T13:30:00Z'}),null);
 assert.equal(reportSlot(new Date('2026-12-25T13:15:00Z'),{isTradingDay:false}),null);
 assert.equal(reportSlot(new Date('2026-07-15T12:29:59Z'),{isTradingDay:true,openAt:'2026-07-15T13:30:00Z'}),null);
});
test('Sunday 19:00 follows Paris DST; Saturday does not publish',()=>{
 assert.equal(reportSlot(new Date('2026-07-19T17:00:00Z'),{})?.kind,'weekly');
 assert.equal(reportSlot(new Date('2026-12-20T18:00:00Z'),{})?.kind,'weekly');
 assert.equal(reportSlot(new Date('2026-07-18T17:00:00Z'),{}),null);
});
test('future or mismatched upstream quotes remain missing',async()=>{
 const now=new Date('2026-10-15T12:15:00Z');
 const fetcher=async()=>({ok:true,json:async()=>({chart:{result:[{meta:{symbol:'NQ=F',regularMarketPrice:99,regularMarketTime:+now/1000+3600}}]}})});
 assert.equal((await snapshot('NQ=F','Nasdaq futures',now,fetcher)).unavailable,true);
});
test('a stale close cannot produce new entry levels or a ready report',()=>{
 const r=buildReport({bars:[{symbol:'QQQ',date:'2026-10-01',close:100}],events:[],forecasts:[],session:{previousDate:'2026-10-14'}},{sources:[]},[],{date:'2026-10-15',kind:'daily'},new Date('2026-10-15T12:15:00Z'));
 assert.equal(r.status,'partial');assert.match(r.body,/不生成新的价格关卡/);assert.equal(r.origin,'cloud-scheduler');
});
test('5-day chart baseline must not be reported as the previous session close',async()=>{
 const now=new Date('2026-10-15T12:15:00Z');
 const fetcher=async()=>({ok:true,json:async()=>({chart:{result:[{meta:{symbol:'NQ=F',regularMarketPrice:110,regularMarketTime:+now/1000,chartPreviousClose:80,previousClose:100}}]}})});
 assert.ok(Math.abs((await snapshot('NQ=F','Nasdaq futures',now,fetcher)).change-10)<1e-8);
});
test('an unknown daily baseline is missing instead of inventing a daily return',async()=>{
 const now=new Date('2026-10-15T12:15:00Z');const fetcher=async()=>({ok:true,json:async()=>({chart:{result:[{meta:{symbol:'NQ=F',regularMarketPrice:110,regularMarketTime:+now/1000,chartPreviousClose:80}}]}})});
 assert.equal((await snapshot('NQ=F','Nasdaq futures',now,fetcher)).change,null);
});
test('same-day reports accept fresh versions while the notification identity stays unchanged',async()=>{
 const {reportNeedsRefresh}=await import('../scripts/cloud-report.mjs');const slot={kind:'daily',date:'2026-10-15'},report={...slot,origin:'cloud-scheduler',generatedAt:'2026-10-15T12:15:00Z'};
 assert.equal(reportNeedsRefresh(report,slot,new Date('2026-10-15T12:19:59Z')),false);
 assert.equal(reportNeedsRefresh(report,slot,new Date('2026-10-15T12:20:00Z')),true);
});
test('fresh premarket candles replace an older regular-session quote',async()=>{
 const now=new Date('2026-10-15T12:15:00Z'),at=+now/1000-300;
 const fetcher=async()=>({ok:true,json:async()=>({chart:{result:[{meta:{symbol:'QQQ',regularMarketPrice:100,regularMarketTime:at-50000,previousClose:100},timestamp:[at,at+3600],indicators:{quote:[{close:[101,999]}]}}]}})});
 const quote=await snapshot('QQQ','QQQ',now,fetcher);assert.equal(quote.price,101);assert.equal(quote.stale,false);assert.equal(quote.at,new Date(at*1000).toISOString());
});

test('Premarket report includes this week’s large-cap earnings and distinguishes calls from releases',()=>{
 const earnings=[{id:'meta',kind:'EARNINGS',symbol:'META',title:'Meta',at:'2026-10-21T20:00:00Z',earningsTiming:'after-close',earningsCallAt:'2026-10-21T20:30:00Z',sourceUrl:'https://investor.atmeta.com/'},{id:'spcx',kind:'EARNINGS',symbol:'SPCX',title:'SpaceX',at:'2026-10-20T20:00:00Z',earningsTiming:'after-close',sourceUrl:'https://ir.spacex.com/'}];
 const r=buildReport({bars:[],events:earnings,forecasts:[],session:{}},{sources:[]},[],{date:'2026-10-21',kind:'daily'},new Date('2026-10-21T12:30:00Z'));
 assert.match(r.body,/META/);assert.match(r.body,/SPCX/);assert.match(r.body,/美东盘后/);assert.match(r.body,/电话会议/);assert(r.sources.some(s=>s.url==='https://ir.spacex.com/'));
});
