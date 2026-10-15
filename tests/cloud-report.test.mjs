import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportSlot,snapshot,buildReport} from '../scripts/cloud-report.mjs';
test('Paris 14:15 follows DST, never publishes after the actual NY open',()=>{
 for(const [at,open]of [['2026-07-15T12:15:00Z','2026-07-15T13:30:00Z'],['2026-12-15T13:15:00Z','2026-12-15T14:30:00Z'],['2026-10-27T13:15:00Z','2026-10-27T13:30:00Z']])assert.equal(reportSlot(new Date(at),{isTradingDay:true,openAt:open})?.kind,'daily');
 assert.equal(reportSlot(new Date('2026-10-27T13:30:00Z'),{isTradingDay:true,openAt:'2026-10-27T13:30:00Z'}),null);
 assert.equal(reportSlot(new Date('2026-12-25T13:15:00Z'),{isTradingDay:false}),null);
 assert.equal(reportSlot(new Date('2026-07-15T12:14:00Z'),{isTradingDay:true,openAt:'2026-07-15T13:30:00Z'}),null);
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
