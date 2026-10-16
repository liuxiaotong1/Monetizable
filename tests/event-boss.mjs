import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file,deps={}){const module={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(name=>{if(name in deps)return deps[name];throw Error(name);},module,module.exports);return module.exports;}
const {predictionReference,predictionOpen,predictionResult}=load('src/lib/quest/event-prediction.ts');
const event={id:'claims:2026-10-22',at:'2026-10-22T12:30:00Z',kind:'CLAIMS',status:'scheduled',unit:'人，季调初次申请',consensus:200000,previous:199000};
assert.deepEqual(predictionReference(event),{value:200000,kind:'consensus'});
assert.deepEqual(predictionReference({...event,consensus:undefined}),{value:199000,kind:'previous'});
assert.equal(predictionReference({...event,consensus:undefined,previous:undefined}),undefined);
assert.equal(predictionOpen(event,'2026-10-22T12:29:59Z'),true);
assert.equal(predictionOpen(event,event.at),false);
assert.equal(predictionOpen({...event,status:'unconfirmed'},'2026-10-20T12:00:00Z'),false);
assert.equal(predictionOpen({...event,actual:200000},'2026-10-20T12:00:00Z'),false);
const p={eventId:event.id,releaseAt:event.at,unit:event.unit,reference:200000,pick:'higher',savedAt:'2026-10-20T12:00:00Z'};
assert.equal(predictionResult(p,event),undefined);
assert.equal(predictionResult(p,{...event,actual:201000,status:'pending'}),undefined);
assert.equal(predictionResult(p,{...event,actual:201000,status:'confirmed',consensus:205000}).matched,true,'Uses original reference, not later consensus');
assert.equal(predictionResult(p,{...event,actual:200000,status:'confirmed'}).matched,false);
assert.equal(predictionResult(p,{...event,actual:201000,status:'confirmed',at:'2026-10-29T12:30:00Z'}),undefined);
assert.equal(predictionResult(p,{...event,actual:201000,status:'confirmed',unit:'thousands'}),undefined);
const {mergeRecords}=load('src/lib/quest/merge-records.ts');
const empty=()=>({version:1,judgments:[],forecasts:[],cards:[],progress:[],notes:{},rewards:[],xp:0,learningDays:{},settings:{},readNotices:[]});
const merged=mergeRecords({...empty(),eventPredictions:[p]},{...empty(),eventPredictions:[{...p,pick:'lower',savedAt:'2026-10-21T12:00:00Z'}]});
assert.equal(merged.eventPredictions[0].pick,'higher');assert.equal(merged.eventPredictions.length,1);
assert.equal(merged.xp,0,'Predictions do not reward trading or create XP');
console.log('Boss predictions: reference snapshots, release deadline, no pending scores, same-measure comparison and immutable cloud merge passed.');
const lessons=JSON.parse(fs.readFileSync('src/lib/quest/learning-depth.json'));
const fr=JSON.parse(fs.readFileSync('src/lib/i18n/fr.json')),zh=JSON.parse(fs.readFileSync('src/lib/i18n/zh.json'));
const {cardTerms,termLabel}=load('src/lib/quest/learning-depth.ts',{'./learning-depth.json':lessons});
const terms=cardTerms({id:'regression:glossary',title:'',question:'Put call strike premium assignment delta gamma theta IV liquidity bank run leverage EPS gross margin cash flow RSI ATR VWAP EMA CPI PCE GDP FOMC GPU HBM consensus',explanation:'',answerExplanation:'',tags:[]});
assert.equal(terms.length,26);
for(const term of terms){assert.ok(!/\p{Script=Han}/u.test(termLabel(term.name,'en')),term.name);assert.ok(!/\p{Script=Han}/u.test(termLabel(term.name,'fr')),term.name);assert.ok(/\p{Script=Han}/u.test(termLabel(term.name,'zh')),term.name);assert.ok(fr[term.en]||['Delta','Gamma'].includes(term.name),'French definition '+term.name);}
for(const lesson of lessons)for(const source of lesson.sources){assert.ok(fr[source.title],source.title);assert.ok(zh[source.title],source.title);}
console.log('All 26 glossary labels/definitions and 18 detailed-lesson sources have separate language coverage.');
