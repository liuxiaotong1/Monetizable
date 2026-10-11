const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const id = '11111111-1111-4111-8111-111111111111';
let user = {id:'owner'}, owns = true, admin = false, subscribed = false;
let result = {id, paid:false, expiresAt:'2020-01-01'};
let checkoutCalls = 0, paidWrites = 0, session = {};
const mocks = {
  'next/server': {NextResponse:{json:(body, options)=>Response.json(body, options)}},
  '@/lib/auth': {currentUser:async()=>user},
  '@/lib/admin': {isAccountAdmin:async()=>admin},
  '@/lib/config': {config:{priceCents:499,currency:'eur',appUrl:'https://example.com',stripePaymentLinkUrl:''},formatPrice:()=> '€4.99'},
  'next/navigation':{redirect:url=>{throw new Error(`REDIRECT:${url}`);},notFound:()=>{throw new Error('NOT_FOUND');}},
  '@/components/brand':{Header:()=>null},
  '@/lib/request-locale':{getRequestLocale:async()=>'en'},
  '@/lib/analytics':{trackServer:async()=>{}},
  '@/lib/analysis-token':{openAnalysis:()=>null},
  '@/lib/storage':{
    analysisBelongsToUser:async()=>owns, getAnalysis:async()=>result,
    supabaseRest:async(query)=>{assert.match(query,/status=in\.\(active,trialing\)/);return subscribed?[{id:'sub'}]:[];},
    markAnalysisPaid:async()=>{paidWrites++;result.paid=true;},claimAnalysisForUser:async()=>false,
  },
  '@/lib/stripe':{
    createCheckoutSession:async(analysisId, cents, currency)=>{assert.equal(analysisId,id);assert.equal(cents,499);assert.equal(currency,'eur');checkoutCalls++;return {url:'https://checkout.stripe.com/test'};},
    retrieveCheckoutSession:async()=>session,
  },
};
const original = Module._load;
Module._load = function(name,parent,main){if(mocks[name])return mocks[name];if(name.startsWith('@/'))name=path.resolve(__dirname,'../src',name.slice(2));return original.call(this,name,parent,main);};
require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);
const request=body=>new Request('https://example.com/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
async function main(){
  const {canBuildSkillStack}=require('../src/lib/skill-stack-access.ts');
  assert.equal(await canBuildSkillStack('owner',id),false);
  result.paid=true;assert.equal(await canBuildSkillStack('owner',id),true);
  result.paid=false;subscribed=true;assert.equal(await canBuildSkillStack('owner',id),true);
  subscribed=false;admin=true;assert.equal(await canBuildSkillStack('owner',id),true);
  owns=false;assert.equal(await canBuildSkillStack('owner',id),false);
  owns=true;admin=false;
  const checkout=require('../src/app/api/checkout/route.ts').POST;
  assert.equal((await (await checkout(request({analysisId:id}))).json()).url,'https://checkout.stripe.com/test');
  assert.equal(checkoutCalls,1);
  result.paid=true;
  assert.equal((await (await checkout(request({analysisId:id}))).json()).url,'/agent?setup=intent');
  assert.equal(checkoutCalls,1,'Paid users must not be charged again');
  owns=false;assert.equal((await checkout(request({analysisId:id}))).status,403);
  owns=true;user=null;assert.equal((await checkout(request({analysisId:id}))).status,401);user={id:'owner'};
  const verify=require('../src/app/api/checkout/verify/route.ts').POST;
  session={id:'cs_test',mode:'subscription',payment_status:'paid',metadata:{analysis_id:id}};
  assert.equal((await verify(request({sessionId:'cs_test'}))).status,402);assert.equal(paidWrites,0);
  session.mode='payment';session.payment_status='unpaid';assert.equal((await verify(request({sessionId:'cs_test'}))).status,402);
  session.payment_status='paid';
  assert.equal((await verify(request({sessionId:'cs_test'}))).status,200,'Retained account reports remain unlockable after anonymous TTL');
  assert.equal(paidWrites,1);
  const page=require('../src/app/unlock/[id]/page.tsx').default;
  const context={params:Promise.resolve({id})};
  result.paid=false;
  const html=require('react-dom/server').renderToStaticMarkup(await page(context));
  assert.match(html,/€4.99/);assert.match(html,/one-time payment/);assert.match(html,/analysis remains available to read for free/);
  result.paid=true;await assert.rejects(page(context),/REDIRECT:\/agent\?setup=intent/);
  result.paid=false;subscribed=true;await assert.rejects(page(context),/REDIRECT:\/agent\?setup=intent/);
  subscribed=false;admin=true;await assert.rejects(page(context),/REDIRECT:\/agent\?setup=intent/);
  owns=false;await assert.rejects(page(context),/NOT_FOUND/);
  for(const file of ['src/app/agent/page.tsx','src/app/api/agent/onboarding/route.ts','src/app/api/agent/radar/route.ts'])assert.match(fs.readFileSync(path.resolve(__dirname,'..',file),'utf8'),/canBuildSkillStack\(user.id,/);
  const report=fs.readFileSync(path.resolve(__dirname,'../src/components/report.tsx'),'utf8');
  assert.equal((report.match(/href=\{`\/unlock\/\$\{result.id\}`\}/g)||[]).length,2);
  console.log('skill-stack unlock: unpaid, paid, subscriber, admin, ownership, checkout, payment verification and entry guards passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
