import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import crypto from 'node:crypto';
let user=null,origin=true,stripeCalls=0,legacyClaims=0,subscription=false,followups=0;
const db={query:async(sql)=>({rows:subscription?[{customer_id:'existing_customer'}]:[]})};
const auth={APP_URL:'https://getmonetizable.com',currentUser:async()=>user,isAdmin:u=>!!u?.admin,sameOrigin:()=>origin};
function load(file,mocks={}){
 const code=ts.transpileModule(fs.readFileSync(path.resolve(file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 const require=(name)=>{if(name in mocks)return mocks[name];throw Error('Unexpected dependency: '+name);};
 vm.runInNewContext('(function(require,module,exports){'+code+'})',{Response,Request,URL,Date,Buffer,console})(require,module,module.exports);
 return module.exports;
}
const experience=load('src/lib/account/experience.ts');
assert.equal(experience.OPEN_EXPERIENCE,true);
const billing=load('src/lib/account/billing.ts',{
 'server-only':{},'./experience':experience,'./plans':{MONTHLY_CENTS:1799,ANNUAL_CENTS:11988,TRIAL_DAYS:7},
 'stripe':class{constructor(){stripeCalls++;throw Error('Stripe must remain idle');}},
 '@/lib/i18n/server-locale':{requestLocale:async()=> 'en'},'node:crypto':crypto,'./db':{database:()=>db},
 './learning-access':{learningUsage:async()=>{legacyClaims++;return [];}},
 './auth':auth,'@/lib/marketing/growth-server':{recordCheckout:async()=>{}}
});
let access=await billing.billingStatus();assert.equal(access.premium,true);assert.equal(access.signedIn,false);assert.equal(access.openExperience,true);assert.equal(legacyClaims,0);
user={id:'free_user'};access=await billing.billingStatus();assert.equal(access.premium,true);assert.equal(access.signedIn,true);assert.equal(access.admin,false);assert.equal(access.hasSubscription,false);
subscription=true;access=await billing.billingStatus();assert.equal(access.hasSubscription,true);assert.equal(access.configured,true);subscription=false;
await assert.rejects(()=>billing.checkout('annual'),/Free practice/);assert.equal(stripeCalls,0);
const checkout=load('src/app/api/billing/checkout/route.ts',{
 '@/lib/account/experience':experience,'@/lib/account/plans':{paidPlan:x=>x},'@/lib/account/billing':billing,
 '@/lib/account/auth':auth,'@/lib/account/db':{rateLimit:async()=>true}
});
let response=await checkout.POST(new Request('https://getmonetizable.com/api/billing/checkout',{method:'POST',body:'{"plan":"annual"}'}));assert.equal(response.status,409);assert.equal((await response.json()).code,'OPEN_EXPERIENCE');assert.equal(stripeCalls,0);
origin=false;response=await checkout.POST(new Request('https://getmonetizable.com/api/billing/checkout',{method:'POST'}));assert.equal(response.status,403);origin=true;
const card={id:'test-card',choices:['One','Two'],answerIndex:0};
const learning=load('src/app/api/learning/answer/route.ts',{
 '@/lib/account/auth':auth,'@/lib/account/billing':billing,'@/lib/account/db':{rateLimit:async()=>true},
 '@/lib/quest/learning-catalog':{publishedLearningCard:async()=>card},
 '@/lib/account/learning-access':{guestLearningId:async()=> 'test-guest',claimLearning:async()=>{legacyClaims++;throw Error('Paid quota must stay inactive');}},
 '@/lib/i18n/server-locale':{requestLocale:async()=> 'en'},'@/lib/marketing/growth-server':{recordPractice:async()=>{}}
});
for(const identity of [null,{id:'free_user'}]){user=identity;for(let n=0;n<6;n++){response=await learning.POST(new Request('https://getmonetizable.com/api/learning/answer',{method:'POST',body:JSON.stringify({cardId:card.id,answerIndex:0})}));assert.equal(response.status,200);assert.equal((await response.json()).chosen,0);}}
assert.equal(legacyClaims,0);
const policy=load('src/lib/quest/review-access.ts');
const report={reflection:{headline:'Personal reflection',detail:'Observed reasoning'},macro:{headline:'Macro',detail:'Complete analysis'},practice:{headline:'Next exercise',detail:'Check evidence.'}};
const review=load('src/app/api/prediction-review/route.ts',{
 '@/lib/account/auth':auth,'@/lib/account/billing':billing,'@/lib/quest/review-access':policy,
 '@/lib/quest/companion-coach':{reviewFollowup:async()=>{followups++;return {answer:'Personal follow-up'};}},
 '@/lib/quest/prediction-review-service':{generatePredictionReview:async()=>Response.json(report)}
});
user={id:'free_user'};response=await review.POST(new Request('https://getmonetizable.com/api/prediction-review',{method:'POST',body:'{}'}));let data=await response.json();assert.equal(response.status,200);assert.equal(data.access,'pro');assert.equal(data.macro.detail,'Complete analysis');
response=await review.POST(new Request('https://getmonetizable.com/api/prediction-review',{method:'POST',body:'{"question":"next"}'}));assert.equal(response.status,200);assert.equal((await response.json()).answer,'Personal follow-up');assert.equal(followups,1);
user=null;response=await review.POST(new Request('https://getmonetizable.com/api/prediction-review',{method:'POST',body:'{}'}));assert.equal(response.status,401);
const reports=load('src/app/api/agent-reports/route.ts',{
 '@/lib/quest/public-source':{getPublicFeed:async()=>({reports:{reports:[{kind:'daily',body:'Complete brief',summary:'Full summary'}],schedule:{}}})},
 '@/lib/account/billing':billing,'@/lib/account/db':{database:()=>db},'@/lib/quest/agent-report':{},'node:crypto':crypto
});
response=await reports.GET();assert.equal((await response.json()).reports[0].body,'Complete brief');
console.log('Passed: guest and signed-in free access, existing billing management, zero Stripe checkout calls, six card answers beyond old quotas, complete AI response and mentor follow-up, private-review authentication, and full daily briefs.');
