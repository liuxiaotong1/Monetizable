import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
function load(path,deps={}){const module={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{if(n in deps)return deps[n];throw Error(n);},module,module.exports);return module.exports;}
const policy=load('src/lib/quest/review-access.ts');
const report={reflection:{headline:'Your reason',detail:'A clear thesis.'},evidence:{headline:'The close',detail:'Checked evidence.'},practice:{headline:'Next check',detail:'Keep your original condition. Compare the countercase. Write your next plan.'},marketImpact:{detail:'PRIVATE_BOSS'},macro:{detail:'PRIVATE_MACRO'},mediumTerm:{detail:'PRIVATE_MEDIUM'},shortTerm:{detail:'PRIVATE_SHORT'},context:{private:'PRIVATE_CONTEXT'},currentContext:{private:'PRIVATE_CURRENT'},signals:{private:'PRIVATE_SIGNALS'},verified:{matched:false,close:100},generatedAt:'2026-11-03T21:00:00Z'};
const basic=policy.projectPredictionReview(report,false);assert.equal(basic.access,'basic');assert.equal(basic.nextStep.detail,'Keep your original condition.');assert.equal(basic.verified.close,100);assert.equal(basic.reflection.detail,'A clear thesis.');assert(!JSON.stringify(basic).includes('PRIVATE_'));assert(!('practice' in basic));
const pro=policy.projectPredictionReview(report,true);assert.equal(pro.access,'pro');assert.equal(pro.marketImpact.detail,'PRIVATE_BOSS');assert.deepEqual(pro.context,report.context);
assert.equal(policy.firstAction({headline:'下一关',detail:'保留原条件。观察相反情景。'}).detail,'保留原条件。');
assert.equal(policy.firstAction({headline:'Checkpoint',detail:'Check 681.09 before comparing. Keep the original plan.'}).detail,'Check 681.09 before comparing.');
const feedback={headline:'One call',detail:'A personal observation.',nextStep:'One check.',reasoning:'PRIVATE_REASONING',countercase:'PRIVATE_COUNTERCASE',checkpoint:'PRIVATE_CHECKPOINT'};
assert(!JSON.stringify(policy.projectReasonFeedback(feedback,false)).includes('PRIVATE_'));assert.equal(policy.projectReasonFeedback(feedback,true).countercase,'PRIVATE_COUNTERCASE');
assert.equal(policy.mentorQuestion('countercase'),'countercase');assert.equal(policy.mentorQuestion('reveal-all'),null);
// Exercise the real route: entitlement is server-owned and checked before Pro follow-up generation.
let paid=false,generated=0,followed=0;
const auth={sameOrigin:()=>true,currentUser:async()=>({id:'fixture-user'})};
const route=load('src/app/api/prediction-review/route.ts',{'@/lib/account/auth':auth,'@/lib/account/billing':{billingStatus:async()=>({premium:paid})},'@/lib/quest/review-access':policy,'@/lib/quest/companion-coach':{reviewFollowup:async()=>{followed++;return {answer:'Private mentor answer'};}},'@/lib/quest/prediction-review-service':{generatePredictionReview:async()=>{generated++;return Response.json(report);}}});
const request=input=>new Request('https://getmonetizable.com/api/prediction-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
let response=await route.POST(request({date:'2026-11-03',premium:true,access:'pro'}));assert.equal(response.status,200);assert(!JSON.stringify(await response.json()).includes('PRIVATE_'),'Client premium flags cannot reveal paid fields');
response=await route.POST(request({question:'reason',premium:true}));assert.equal(response.status,402);assert.equal(followed,0);assert.equal(generated,1,'Free follow-up is rejected before generating a report');
paid=true;response=await route.POST(request({}));assert.equal((await response.json()).access,'pro');response=await route.POST(request({question:'next'}));assert.equal((await response.json()).answer,'Private mentor answer');assert.equal(followed,1);
auth.currentUser=async()=>null;assert.equal((await route.POST(request({}))).status,401);
console.log('Passed free/Pro payload allowlists, one useful next step, forged-client entitlement rejection, paid follow-up gate and anonymous access checks.');
