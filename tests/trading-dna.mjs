import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
function load(path,deps={}){const module={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{if(n in deps)return deps[n];throw Error(n);},module,module.exports);return module.exports;}
const domain=load('src/lib/quest/domain.ts'),weekly=load('src/lib/quest/weekly-tracking.ts',{'./domain':domain}),{tradingDNA,historyWindow}=load('src/lib/quest/trading-dna.ts',{'./domain':domain,'./weekly-tracking':weekly});
const now='2026-10-21T15:00:00Z',session=domain.sessionFor(new Date(now)),calls=Array.from({length:8},(_,i)=>({id:'j'+i,forecastId:'f'+i,date:domain.addDays('2026-10-21',-i),direction:i%2?'bearish':'bullish',confidence:'high',reason:'If support fails, the view is invalid.',eligible:true,createdAt:domain.addDays('2026-10-21',-i)+'T11:00:00Z',lockedAt:domain.addDays('2026-10-21',-i)+'T11:00:00Z'}));
const reviews=calls.map(j=>({id:'r'+j.id,date:j.date,forecastId:j.forecastId,judgmentId:j.id,judgmentSnapshot:j,matched:false,completedAt:undefined,actual:{close:100}}));const state={mode:'live',now,session,reviews,judgment:calls[0]};
assert.equal(tradingDNA(state).count,7);assert.equal(tradingDNA(state,true).count,8);assert.equal(tradingDNA(state,true).mission,'reflect');assert.equal(tradingDNA(state,true).score,70);assert.equal(tradingDNA({...state,reviews:[]}).score,undefined);
const bad={...reviews[0],forecastId:'unrelated',matched:true};assert.equal(tradingDNA({...state,reviews:[bad]},true).verified.length,0,'Do not score a different forecast');
assert.equal(tradingDNA({...state,reviews:[{...reviews[0],matched:undefined}]},true).verified.length,0,'Pending data is not a miss');
assert.equal(tradingDNA({...state,judgment:{...calls[0],id:'changed',lockedAt:'2026-10-21T12:00:00Z'}},true).count,8,'One target day is one observation');
const window=historyWindow(state,false);assert.equal(window.reviews.length,7);assert.equal(state.reviews.length,8,'Entitlements must not delete records');assert.deepEqual(historyWindow(state,true).reviews,state.reviews);assert.deepEqual(historyWindow(state,true).predictionMonths,window.predictionMonths,'Monthly aggregates do not depend on archive access');assert(window.trackingWeeks.every(w=>w.days.every(d=>d.date>='2026-10-15')));
console.log('Passed genuine eligible records, 7-day/full history, unique dates, matched-forecast-only outcomes, pending guards, transparent habits and no deletion.');

const plan={system:'Trend method',rules:['reason'],custom:'Wait for support',since:'2026-10-18T12:00:00Z'};
assert.equal(tradingDNA(state,true,plan).count,3,'Exclude calls locked before the system existed');
assert.equal(tradingDNA(state,true,{...plan,since:'2026-10-10T00:00:00Z'}).score,100,'Selected reason rule is scored independently of unselected review');
assert.equal(tradingDNA(state,true,{...plan,since:'2026-10-22T00:00:00Z'}).count,0,'Never back-score an older call against new rules');
const {validateDiscipline}=load('src/lib/quest/discipline-plan.ts');
assert.equal(validateDiscipline({...plan,rules:[]}),null);assert.equal(validateDiscipline({...plan,rules:['profit']}),null);assert.deepEqual(validateDiscipline(plan),{system:plan.system,rules:plan.rules,custom:plan.custom});
console.log('Passed prospective rule assessment, rule selection and validation.');
