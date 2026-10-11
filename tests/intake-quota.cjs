const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
let user={id:'11111111-1111-4111-8111-111111111111'}, reservation='reserved', fail=false, calls=[];
const id='22222222-2222-4222-8222-222222222222';
const base={combinations:[{elements:['Sales','Marketing'],services:[{name:'Go-to-market consulting'}]}],opportunities:[]};
const mocks={
 'next/server':{NextResponse:{json:(data,options)=>Response.json(data,options)}},
 '@/lib/auth':{currentUser:async()=>user},
 '@/lib/config':{config:{demoMode:false,resultTtlHours:24}},
 '@/lib/ai':{analyzeProfile:async()=>{calls.push('model');if(fail)throw Error('model unavailable');return base;}},
 '@/lib/analytics':{trackServer:async()=>{}},
 '@/lib/demo':{},
 '@/lib/preview':{toPreview:r=>({analysisId:r.id})},
 '@/lib/schemas':{contextSchema:{parse:x=>x},preservedEvidenceSchema:{parse:x=>x}},
 '@/lib/profile':{ingestProfile:async()=>({profile:{}}),ProfileIngestionError:class extends Error{}},
 '@/lib/search':{recommendationNeedsLocation:()=>null,searchMarketOpportunities:async()=>({opportunities:[],status:'complete'}),deriveDemand:x=>x,derivePricing:()=>({})},
 '@/lib/role-model':{normalizeReportIntelligence:x=>x,needsReportIntelligenceRepair:()=>false,enrichCareerProspects:async x=>x},
 '@/lib/storage':{saveAnalysis:async()=>calls.push('report'),saveCandidateProfile:async()=>calls.push('profile'),getAnalysis:async()=>({...base,id})},
 '@/lib/analysis-token':{sealAnalysis:()=> 'private-recovery'},
 '@/lib/i18n':{isLocale:()=>true},
 '@/lib/capacity-graph':{ensureCapacityGraph:x=>x},
 '@/lib/profile-submission':{beginProfileSubmission:async()=>{calls.push('source');return{};},updateProfileSubmission:async(id,x)=>calls.push('source:'+x.status)},
 '@/lib/account-usage':{reserveAnalysis:async()=>{calls.push('reserve');return reservation;},finishAnalysisUsage:async(u,i,ok)=>calls.push('usage:'+ok)},
 '@/lib/opportunity-agent/storage':{candidateProfileIdForAnalysis:async()=> 'profile'},
};
const load=Module._load;Module._load=function(name,p,m){if(mocks[name])return mocks[name];if(name.startsWith('@/'))name=path.resolve(__dirname,'../src',name.slice(2));return load.call(this,name,p,m);};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
function request(consent=true){const f=new FormData();f.set('requestId',id);f.set('candidateConsent',String(consent));f.set('text','Test professional experience');return new Request('https://example.com/api/analyze',{method:'POST',body:f});}
async function main(){
 const {POST}=require('../src/app/api/analyze/route.ts');
 assert.equal((await POST(request(false))).status,400);assert.deepEqual(calls,[]);
 user=null;assert.equal((await POST(request())).status,401);assert.deepEqual(calls,['source']);
 user={id:'11111111-1111-4111-8111-111111111111'};reservation='payment_required';calls=[];
 assert.equal((await POST(request())).status,402);assert.deepEqual(calls,['source','reserve']);
 reservation='reserved';calls=[];assert.equal((await POST(request())).status,200);
 assert.ok(calls.indexOf('source')<calls.indexOf('model'));assert.ok(calls.indexOf('profile')<calls.indexOf('usage:true'));
 reservation='complete';calls=[];assert.equal((await POST(request())).status,200);assert.ok(!calls.includes('model'));
 reservation='reserved';fail=true;calls=[];const log=console.error;console.error=()=>{};
 try{assert.equal((await POST(request())).status,500);}finally{console.error=log;}
 assert.ok(calls.includes('usage:false'));assert.ok(calls.includes('source:failed'));
 const stripe=require('../src/lib/stripe.ts');process.env.STRIPE_SECRET_KEY='sk_test_not_real';let body;
 global.fetch=async(url,options)=>{body=new URLSearchParams(options.body);return Response.json({url:'https://checkout.stripe.com/test'});};
 await stripe.createSubscriptionCheckout(id,'price_test','https://example.com',0,'month');
 assert.equal(body.has('subscription_data[trial_period_days]'),false);assert.equal(body.get('mode'),'subscription');
 await assert.rejects(stripe.createSubscriptionCheckout(id,'price_test','https://example.com',2,'month'),/disabled/);
 console.log('PASS: consent, saved guest input, sign-in, quota before AI, success persistence, retry idempotency, failure refund, no Stripe trial. No real AI or payment requests.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
