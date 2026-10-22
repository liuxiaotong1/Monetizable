import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(path,deps={}){const module={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{if(n in deps)return deps[n];throw Error(n);},module,module.exports);return module.exports;}
const domain=load('src/lib/quest/domain.ts');
const weekly=load('src/lib/quest/weekly-tracking.ts',{'./domain':domain});
const {monthlyPredictionAccuracy,historyWindow,tradingDNA}=load('src/lib/quest/trading-dna.ts',{'./domain':domain,'./weekly-tracking':weekly});
const now='2026-10-22T23:00:00Z';
const call=(date,extra={})=>({id:`j-${date}`,forecastId:`f-${date}`,date,direction:'bullish',confidence:'medium',reason:'My private thesis',createdAt:`${date}T11:00:00Z`,lockedAt:`${date}T11:00:00Z`,eligible:true,...extra});
const review=(j,matched,extra={})=>({id:`r-${j.id}`,judgmentId:j.id,judgmentSnapshot:j,date:j.date,forecastId:j.forecastId,matched,actual:{date:j.date,symbol:'QQQ',close:100},...extra});
const calls=[call('2026-09-30'),call('2026-10-01',{lockedAt:'2026-09-30T21:00:00Z'}),call('2026-10-05'),call('2026-10-21'),call('2026-10-22'),call('2026-10-23',{lockedAt:'2026-10-22T21:00:00Z'})];
const reviews=calls.map((j,i)=>review(j,i<4?i!==2:undefined));
const state={mode:'live',now,session:domain.sessionFor(new Date(now)),reviews,judgment:calls.at(-1)};
const months=monthlyPredictionAccuracy(state);
assert.deepEqual(months,[{month:'2026-10',recorded:5,verified:3,matched:2,pending:2,accuracy:67},{month:'2026-09',recorded:1,verified:1,matched:1,pending:0,accuracy:100}],'Target-session month controls membership; pending outcomes do not lower accuracy');
assert.equal(months[0].matched,2,'A call sealed in September for October belongs to October');
assert.deepEqual(historyWindow(state,false).predictionMonths,historyWindow(state,true).predictionMonths,'Free and Pro use the same complete monthly aggregate');
assert.equal(historyWindow(state,false).reviews.length,3,'Free history still hides old per-call records');
assert.equal(state.predictionMonths,undefined,'Do not mutate the source state');
assert(!JSON.stringify(historyWindow(state,false).predictionMonths).includes('private'),'Aggregates contain no historical reasoning or per-record details');

const pending=call('2026-10-20');
const badReviews=[review(pending,true,{judgmentId:'wrong-id'}),review(pending,true,{date:'2026-10-19'}),review(pending,true,{forecastId:'different-forecast'}),review(pending,undefined),review(pending,null)];
assert.deepEqual(monthlyPredictionAccuracy({...state,reviews:badReviews,judgment:pending})[0],{month:'2026-10',recorded:1,verified:0,matched:0,pending:1},'Require boolean result and matching judgment ID, target date, forecast ID');
const miss=review(pending,false);
assert.equal(monthlyPredictionAccuracy({...state,reviews:[miss],judgment:pending})[0].accuracy,0,'A verified miss is 0%; no verified results is unavailable');
const legacyReview=review(pending,true);delete legacyReview.judgmentId;
assert.equal(monthlyPredictionAccuracy({...state,reviews:[legacyReview],judgment:pending})[0].accuracy,100,'Legacy review may identify its judgment through its saved snapshot');

const duplicate=call(pending.date,{id:'replacement',lockedAt:'2026-10-20T12:00:00Z'});
assert.deepEqual(monthlyPredictionAccuracy({...state,reviews:[review(pending,false),review(duplicate,true)],judgment:duplicate})[0],{month:'2026-10',recorded:1,verified:1,matched:1,pending:0,accuracy:100},'One target session is one observation');
const ineligible=[call('2026-10-02',{eligible:false}),call('2026-10-06',{lockedAt:'invalid'}),call('2026-10-07',{lockedAt:'2026-10-24T11:00:00Z'})];
assert.deepEqual(monthlyPredictionAccuracy({...state,reviews:ineligible.map(j=>review(j,true)),judgment:undefined}),[{month:'2026-10',recorded:0,verified:0,matched:0,pending:0}],'Do not count unscored, invalid or future-locked calls');

const plan={system:'Changed system',rules:['reason'],custom:'',since:'2026-10-22T22:00:00Z'};
assert.equal(tradingDNA(state,true,plan).count,0);
assert.equal(historyWindow(state,false).predictionMonths[0].accuracy,67,'Changing an optional system does not reset monthly prediction accuracy');
const stale={...state,predictionMonths:[{month:'2026-10',recorded:99,verified:99,matched:99,pending:0,accuracy:100}],reviews:reviews.map(r=>r.date==='2026-10-05'?{...r,matched:true}:r)};
assert.equal(historyWindow(stale,false).predictionMonths[0].accuracy,100,'Recompute aggregates from fresh full records rather than reusing stale cached values');
assert.equal(historyWindow(stale,false).predictionMonths[0].verified,3);
const nextMonth={...state,now:'2026-11-02T13:00:00Z',session:domain.sessionFor(new Date('2026-11-02T13:00:00Z'))};
assert.deepEqual(monthlyPredictionAccuracy(nextMonth)[0],{month:'2026-11',recorded:0,verified:0,matched:0,pending:0},'A new ET calendar month starts empty while earlier target months remain available');
console.log('Passed monthly target-session accuracy, verified-only denominator, identity matching, deduplication, plan independence, full aggregation before history gating, and fresh-state recomputation.');
