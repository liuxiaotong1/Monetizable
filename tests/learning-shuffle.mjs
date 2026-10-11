import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const toUrl = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
async function compile(path) { return ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText; }
const shuffleUrl=toUrl(await compile('src/lib/quest/shuffle.ts'));
const {shuffledIndices}=await import(shuffleUrl);
const engine=await import(toUrl((await compile('src/lib/quest/learning-engine.ts')).replace('"./shuffle"',JSON.stringify(shuffleUrl))));
const {styleQuestions,styleResult}=await import(toUrl(await compile('src/lib/quest/investment-style.ts')));
const cards=Array.from({length:20},(_,i)=>({id:`card-${i}`,question:`Question ${i}`,category:'history',choices:['correct','wrong','other','none'],answerIndex:0}));
const ids=queue=>queue.map(c=>c.id),visit='visit-one';
const initial=engine.learningQueue(cards,[],'2026-10-12',undefined,undefined,visit);
assert.deepEqual(ids(initial),ids(engine.learningQueue(cards,[],'2026-10-12',undefined,undefined,visit)));
assert.notDeepEqual(ids(initial),ids(engine.learningQueue(cards,[],'2026-10-12',undefined,undefined,'visit-two')));
const expanded=[...cards,{...cards[0],id:'extra-card',question:'Extra question'}];
assert.deepEqual(ids(engine.learningQueue(expanded,[],'2026-10-12',undefined,undefined,visit)).filter(id=>id!=='extra-card'),ids(initial),'Daily additions preserve existing relative order');
const current=initial[0],choices=shuffledIndices(4,`${visit}:${current.id}:choices`);
const displayedCorrect=choices.indexOf(current.answerIndex);
const answered=engine.answerCard({cardId:current.id,attempts:0,correctCount:0},current,choices[displayedCorrect],0,4,'2026-10-12T12:00:00Z',visit);
assert.equal(answered.award,5);assert.equal(answered.progress.lastAnswerIndex,0);
const reviewing=engine.learningQueue(cards,[answered.progress],'2026-10-12',undefined,undefined,visit);
assert.equal(reviewing[0].id,current.id,'Answer explanation stays on the same card');
const mastered=engine.classifyCard(answered.progress,current,'master','2026-10-12T12:01:00Z',visit);
assert.deepEqual(ids(engine.learningQueue(cards,[mastered],'2026-10-12',undefined,undefined,visit)),ids(initial).slice(1),'Completing a card preserves the remaining order');
const review=engine.classifyCard(answered.progress,current,'review','2026-10-12T12:01:00Z',visit);
assert(!ids(engine.learningQueue(cards,[review],'2026-10-12',undefined,undefined,visit)).includes(current.id));
engine.beginLearningVisit([review],'next-visit');
assert.equal(engine.learningQueue(cards,[review],'2026-10-12',undefined,undefined,'next-visit')[0].id,current.id,'Explicit review keeps priority');
for(let run=0;run<100;run++) {
 const seed=`run-${run}`,order=shuffledIndices(10,seed);
 assert.equal(new Set(order).size,10);
 const answers=order.map(q=>{const options=shuffledIndices(4,`${seed}:question:${q}`);assert.equal(new Set(options).size,4);return options[options.indexOf(1)];});
 assert.deepEqual(styleResult(answers).leaders,['analyst'],'Scoring follows meaning rather than displayed position');
 assert(styleQuestions[order[0]]);
}
console.log('Passed stable visits, randomized new visits, canonical answer scoring, explanation retention, mastery order, explicit review and 100 style permutations.');
