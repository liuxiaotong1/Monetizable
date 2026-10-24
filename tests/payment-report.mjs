import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const mod={exports:{}};
const source=ts.transpileModule(fs.readFileSync('src/lib/account/admin.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let response;
const deps={'server-only':{},'./db':{},'./money':{stripeAmount:(a)=>a/100}};
new Function('require','module','exports','fetch',source)(name=>deps[name],mod,mod.exports,async()=>response);
const old=process.env.STRIPE_SECRET_KEY;
try{
  delete process.env.STRIPE_SECRET_KEY;
  assert.equal((await mod.exports.paymentMetrics()).status,'unavailable');
  process.env.STRIPE_SECRET_KEY='rk_test_fixture';
  for(const [status,reason] of [[401,'authentication_failed'],[403,'permission_denied'],[429,'rate_limited'],[500,'stripe_api_error']]){
    response={ok:false,status};
    const result=await mod.exports.paymentMetrics();
    assert.equal(result.status,'unavailable');assert.equal(result.reason,reason);assert.equal(result.httpStatus,status);
    assert(!JSON.stringify(result).includes('rk_test_fixture'));
  }
  response={ok:true,json:async()=>({data:[],has_more:false})};
  assert.equal((await mod.exports.paymentMetrics()).status,'ready');
}finally{if(old===undefined)delete process.env.STRIPE_SECRET_KEY;else process.env.STRIPE_SECRET_KEY=old;}
console.log('Passed: empty verified Stripe response differs from API/auth/permission failures; no secrets exposed.');
