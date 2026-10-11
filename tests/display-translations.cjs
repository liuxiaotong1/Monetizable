const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(file){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>name==='server-only'?{}:require(name),mod,mod.exports);return mod.exports;}
async function main(){
  const {getDisplayTranslations}=load('src/lib/display-translations.ts');
  process.env.OPENAI_API_KEY='test-only';let calls=0,submitted;
  global.fetch=async(url,options)=>{calls++;const body=JSON.parse(options.body);submitted=JSON.parse(body.messages[1].content);return Response.json({choices:[{message:{content:JSON.stringify(Object.fromEntries(Object.keys(submitted).map(key=>[key,'FR: '+submitted[key]])))}}]});};
  const report={id:'private-id',profile:{rawEvidence:'PRIVATE CV',name:'Jane Doe'},combinations:[{elements:['Research','Marketing'],services:[{name:'Market research',searchQueries:['private search'],description:'Understand buyers'}],careerProspect:{name:'Jane Smith',roleModelTitle:'Researcher',profileUrl:'https://example.com'}}],positioning:{sentence:'Serve buyers',outreachAngle:'Suggested outreach'},opportunities:[{id:'op-id',title:'Project',url:'https://example.com',listingEvidence:'RAW SOURCE',fitReason:'Relevant experience'}]};
  report.input={subject:'Approved subject',body:'Exact approved draft'};
  const before=JSON.stringify(report);const [a,b]=await Promise.all([getDisplayTranslations(report,'fr'),getDisplayTranslations(report,'fr')]);
  assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(a.Research,'FR: Research');assert.equal(a['Suggested outreach'],'FR: Suggested outreach');assert.equal(a['Market research'],'FR: Market research');assert.equal(JSON.stringify(report),before);
  const sent=JSON.stringify(submitted);for(const excluded of ['PRIVATE CV','Jane Doe','Jane Smith','private-id','private search','RAW SOURCE','Exact approved draft','https://'])assert.ok(!sent.includes(excluded));
  await getDisplayTranslations(report,'fr');assert.equal(calls,1);
  await getDisplayTranslations(report,'en');assert.equal(calls,2,'Target languages must have separate caches');
  const stripe=load('src/lib/stripe.ts');process.env.STRIPE_SECRET_KEY='test-only';let params;
  global.fetch=async(url,options)=>{params=new URLSearchParams(options.body);return Response.json({url:'https://checkout.stripe.com/test'});};
  await stripe.createCheckoutSession('id',100,'usd','https://example.com','fr');assert.equal(params.get('locale'),'fr');
  await stripe.createSubscriptionCheckout('id','price_test','https://example.com',0,'month','fr');assert.equal(params.get('locale'),'fr');assert.equal(params.get('line_items[0][price]'),'price_test');
  await stripe.createCustomerPortalSession('cus_test','https://example.com','en');assert.equal(params.get('locale'),'en');
  assert.equal(new URL(stripe.createPaymentLinkCheckout('id','https://buy.stripe.com/test','fr').url).searchParams.get('locale'),'fr');
  console.log('PASS: presentation-only report translations, private field exclusion, request deduplication, language-isolated caches and payment locale propagation.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
