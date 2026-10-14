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
// A consumed left-swipe review must not be revived by legacy migration or cloud merge.
const reviewed=engine.classifyCard(answered.progress,current,'review','2026-10-12T12:01:00Z',visit);
const cloudPending=structuredClone(reviewed);
engine.beginLearningVisit([reviewed],'return-visit','2026-10-12T12:02:00Z');
engine.migrateLearningProgress(cards,[reviewed]);
assert.equal(reviewed.reviewPending,false);
assert.equal(reviewed.reviewVisitId,'return-visit');
assert(reviewed.updatedAt>cloudPending.lastDispositionAt,'Consuming a review has a newer sync timestamp');
const {mergeRecords}=await import(toUrl(await compile('src/lib/quest/merge-records.ts')));
const base={judgments:[],forecasts:[],cards,progress:[],notes:{},rewards:[],xp:0,learningDays:{},readNotices:[]};
const merged=mergeRecords({...base,progress:[cloudPending]},{...base,progress:[reviewed]});
assert.equal(merged.progress[0].reviewPending,false,'Cloud merge cannot resurrect an older pending review');
const versionA={...cards[0],id:'lesson:v1:aabbccddeeff',question:'First wording'},versionB={...cards[0],id:'lesson:v2:112233445566',question:'Updated wording'};
const old=engine.answerCard({cardId:versionA.id,attempts:0,correctCount:0},versionA,0,0,4,'2026-10-12T12:00:00Z',visit).progress;
assert.equal(engine.learningQueue([versionB],[old],'2026-10-13',undefined,undefined,'new-visit').length,0,'A publication hash or revision must not turn a learned concept into a new card');
console.log('Passed consumed-review migration, cross-device merge and publication-version deduplication.');

const englishDelta={...cards[0],id:'en:options:01',conceptId:'en:options:01',category:'options',question:'What does Delta mean?'};
const chineseDelta={...cards[0],id:'options-01',category:'options',question:'Delta 是什么？'};
const trialAnswer=engine.answerCard({cardId:englishDelta.id,attempts:0,correctCount:0},englishDelta,0,0,4,'2026-10-12T12:00:00Z',visit).progress;
assert.equal(engine.learningQueue([chineseDelta],[trialAnswer],'2026-10-13',undefined,undefined,'signed-in-visit').length,0,'English trial progress suppresses the matching Chinese concept after signing in');
console.log('Passed cross-language trial-to-account concept deduplication.');

const freshTopic={...chineseDelta,id:'new-options-topic',question:'A different options question'};
assert(engine.assignDaily([chineseDelta,freshTopic],[trialAnswer],'2026-10-13',[chineseDelta.id]).includes(freshTopic.id),'An old translated card in daily assignments cannot prevent a fresh topic from being added');
