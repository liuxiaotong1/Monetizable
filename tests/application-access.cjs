const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
let user = {id:'owner'}, allowed = 'allowed', calls = 0;
let match = {market_opportunities:{source_url:'https://example.com/apply',opportunity_signatures:{contact_method:'application_link'}}};
const mocks = {
  'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}},
  '@/lib/auth':{currentUser:async()=>user},
  '@/lib/opportunity-agent/storage':{matchForUser:async(owner)=>{assert.equal(owner,'owner');return match;}},
  '@/lib/storage':{supabaseRest:async(path,options)=>{assert.equal(path,'rpc/consume_application_click');assert.equal(JSON.parse(options.body).p_user,'owner');calls++;return allowed;}},
};
const original=Module._load;
Module._load=function(name,parent,main){return mocks[name]??original.call(this,name,parent,main);};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
async function main(){
  const {POST}=require('../src/app/api/agent/matches/[id]/application/route.ts');
  const run=()=>POST(new Request('https://example.com/api/application',{method:'POST',body:JSON.stringify({requestId:crypto.randomUUID()})}),{params:Promise.resolve({id:crypto.randomUUID()})});
  assert.deepEqual(await (await run()).json(),{url:'https://example.com/apply'});
  allowed='payment_required';const denied=await run();assert.equal(denied.status,402);assert.equal((await denied.json()).url,'/subscribe');
  user=null;assert.equal((await run()).status,401);assert.equal(calls,2);
  user={id:'owner'};match=null;assert.equal((await run()).status,404);assert.equal(calls,2);
  match={market_opportunities:{source_url:'javascript:alert(1)',opportunity_signatures:{contact_method:'application_link'}}};assert.equal((await run()).status,404);assert.equal(calls,2);
  assert.ok(!fs.readFileSync('src/components/subscription-gate.tsx','utf8').toLowerCase().includes('no free trial'));
  console.log('PASS: application access, paywall redirect, authentication, ownership, safe URLs, removed trial copy.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
