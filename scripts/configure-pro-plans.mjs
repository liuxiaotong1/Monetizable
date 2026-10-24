/** Idempotent production provisioning. Uses only the existing deployment's server credentials. */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),cache=new Map();
if(process.env.VERCEL_ENV!=='production'){console.log('Pro billing provisioning skipped outside production.');process.exit(0);}
if(!process.env.STRIPE_SECRET_KEY||!process.env.POSTGRES_URL)throw Error('Existing production billing credentials are unavailable. No new billing configuration activated.');
function serverModule(filename){const absolute=path.resolve(filename);if(cache.has(absolute))return cache.get(absolute).exports;const module={exports:{}};cache.set(absolute,module);const source=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('require','module','exports',source)(name=>{
 if(name==='server-only')return{}; // This script runs exclusively in the server build process.
 if(name==='./auth')return {APP_URL:'https://getmonetizable.com',currentUser:()=>{throw Error('Provisioning never creates a user session');},isAdmin:()=>false};
 if(name==='./learning-access'||name==='@/lib/i18n/server-locale')return{}; // Not used by setupBilling.
 if(name.startsWith('.'))return serverModule(path.resolve(path.dirname(absolute),name+'.ts'));
 return require(name);
},module,module.exports);return module.exports;}
let db;
try{
 db=serverModule('src/lib/account/db.ts').database();
 const result=await serverModule('src/lib/account/billing.ts').setupBilling();
 if(!result.livemode)throw Error('Expected live Stripe billing; test configuration was not activated for production.');
 const {rows}=await db.query("SELECT body FROM quest_shared_data WHERE key='billing-config-v3'");const config=rows[0]?.body;
 const stripe=serverModule('src/lib/account/billing.ts').stripeClient();
 const prices=await Promise.all([stripe.prices.retrieve(config.price),stripe.prices.retrieve(config.annualPrice)]);
 if(prices[0].unit_amount!==1799||prices[0].recurring?.interval!=='month'||prices[1].unit_amount!==11988||prices[1].recurring?.interval!=='year'||prices.some(p=>!p.active||!p.livemode||p.currency!=='usd'))throw Error('Stripe prices do not match the published Pro plans.');
 console.log(JSON.stringify({proBilling:'verified',livemode:true,monthly:{amount:1799,currency:'usd',interval:'month'},annual:{amount:11988,currency:'usd',interval:'year'},trialDays:7,legacySubscriptions:'preserved'}));
}catch(error){console.error('Pro billing verification failed:',String(error.message||'Unavailable').replaceAll(process.env.STRIPE_SECRET_KEY,'[redacted]').replace(/[rs]k_(live|test)_[A-Za-z0-9_]+/g,'[redacted]'));process.exitCode=1;}finally{if(db)await db.end();}
