import 'server-only';
import {cookies} from 'next/headers';
import {randomUUID} from 'node:crypto';
import {database} from '@/lib/account/db';
import {isAdmin} from '@/lib/account/policy';
import {growthCookie,internalCookie,sourceOf,publicPath,mergeAttribution,billingStage,type Attribution,type Touch} from './attribution';

type User = {id:string;email?:string;email_confirmed_at?:string;created_at?:string};
type DB = Pick<ReturnType<typeof database>, 'query'>;
const uuid = /^[a-f0-9-]{36}$/i;
async function read<T>(key:string, db:DB = database()):Promise<T|undefined> {return (await db.query('SELECT body FROM quest_shared_data WHERE key=$1',[key])).rows[0]?.body;}
async function write(key:string, body:unknown, db:DB = database(), once=false) {
  await db.query(`INSERT INTO quest_shared_data(key,body) VALUES($1,$2::jsonb) ON CONFLICT(key) ${once?'DO NOTHING':'DO UPDATE SET body=EXCLUDED.body,updated_at=now()'}`,[key,JSON.stringify(body)]);
}
export async function growthContext(userId?:string, db:DB=database()):Promise<Attribution|undefined> {
  if(userId) return read<Attribution>('growth:user:'+userId,db);
  const jar=await cookies();if(jar.get(internalCookie)?.value==='1'||jar.get('quest-analytics-consent')?.value!=='granted')return;
  const visitor=jar.get(growthCookie)?.value;
  return visitor&&uuid.test(visitor)?read<Attribution>('growth:visitor:'+visitor,db):undefined;
}
export async function recordStage(event:string, context:Attribution|undefined, id:string, db:DB=database(), extra:Record<string,unknown>={}) {
  if(!context||context.internal)return;
  await write(`growth:event:${event}:${id}`,{event,...context,...extra,at:new Date().toISOString()},db,true);
}
export async function captureGrowth(input:{path?:unknown;referrerHost?:unknown;utmSource?:unknown;internal?:unknown;event?:unknown;consent?:unknown},user:User|null) {
  const jar=await cookies();let visitor=jar.get(growthCookie)?.value;
  const excluded=input.internal===true||jar.get(internalCookie)?.value==='1'||isAdmin(user)||!!user?.email?.endsWith('@testing.constants.io');
  if(!excluded&&input.consent!=='granted'){
    jar.set('quest-analytics-consent','denied',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:365*86400});
    if(visitor&&uuid.test(visitor))await write('growth:visitor:'+visitor,{internal:true});
    if(user)await write('growth:user:'+user.id,{internal:true});
    jar.delete(growthCookie);return {excluded:true};
  }
  if(!excluded)jar.set('quest-analytics-consent','granted',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:365*86400});
  if(!visitor||!uuid.test(visitor)) {visitor=randomUUID();jar.set(growthCookie,visitor,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:90*86400});}
  if(excluded){jar.set(internalCookie,'1',{httpOnly:false,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:365*86400});await write('growth:visitor:'+visitor,{internal:true});return {excluded:true};}
  const touch:Touch={...sourceOf(input.referrerHost,input.utmSource),path:publicPath(input.path),at:new Date().toISOString()};
  const previous=await read<Attribution>('growth:visitor:'+visitor);
  if(previous?.internal){jar.set(internalCookie,'1',{httpOnly:false,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:365*86400});return {excluded:true};}
  const context={...mergeAttribution(previous,touch),visitor};
  await write('growth:visitor:'+visitor,context);
  if(user) await associateGrowthUser(user,context);
  const event=typeof input.event==='string'&&['try_start','signup_start'].includes(input.event)?input.event:'visit';
  await recordStage(event,{...context,...(user?{userId:user.id}:{})},event==='visit'?`${visitor}:${new Date().toISOString().slice(0,10)}:${touch.path.replaceAll('/','_')}`:visitor);
  return {excluded:false,source:context.first.source,evidence:context.first.evidence};
}
export async function associateGrowthUser(user:User, given?:Attribution) {
  try {
    const context=given||await growthContext();if(!context)return;
    if(isAdmin(user)||user.email?.endsWith('@testing.constants.io')) {if(context.visitor)await write('growth:visitor:'+context.visitor,{...context,internal:true});return;}
    const previous=await read<Attribution>('growth:user:'+user.id);
    const linked={...context,...(previous?.first?{first:previous.first}:{}),userId:user.id};
    await write('growth:user:'+user.id,linked);
    const created=Date.parse(user.created_at||'');
    if(user.email_confirmed_at&&created<=Date.now()&&created>=Date.parse(linked.first.at)-15*60_000)await recordStage('signup_verified',linked,user.id);
  }catch{console.warn('Growth account attribution pending');}
}
export async function recordCheckout(userId:string, sessionId:string) {
  try {const context=await growthContext(userId);if(!context||context.internal)return;await write('growth:checkout:'+sessionId,context,undefined,true);await write('growth:checkout-user:'+userId,{...context,checkoutAt:new Date().toISOString()});await recordStage('checkout_started',context,sessionId);}catch{console.warn('Growth checkout attribution pending');}
}
export async function recordPractice(userId?:string){
  try{const context=await growthContext(userId);if(context)await recordStage('practice_completed',context,userId||context.visitor!);}catch{console.warn('Growth practice attribution pending');}
}
/** Called only after signature and environment verification, inside the webhook transaction. */
export async function recordBilling(event:{type:string;data:{object:unknown}},subscriptionId:string|undefined,db:DB) {
  if(!subscriptionId)return;
  const obj=event.data.object as {id:string;customer?:string|{id:string};amount_paid?:number;status?:string;currency?:string};
  const stage=billingStage(event.type,obj);if(!stage)return;
  const {rows}=await db.query('SELECT user_id,customer_id,status FROM quest_subscriptions WHERE subscription_id=$1',[subscriptionId]);
  const sub=rows[0];const customer=typeof obj.customer==='string'?obj.customer:obj.customer?.id;
  if(!sub||!customer||customer!==sub.customer_id)return;
  if((await read<Attribution>('growth:user:'+sub.user_id,db))?.internal)return;
  let context=await read<Attribution>('growth:subscription:'+subscriptionId,db);
  if(!context&&stage==='checkout_completed') {
    context=await read<Attribution>('growth:checkout:'+obj.id,db);
    if(context)await write('growth:subscription:'+subscriptionId,context,db,true);
  }
  if(!context){const pending=await read<Attribution&{checkoutAt?:string}>('growth:checkout-user:'+sub.user_id,db);if(pending?.checkoutAt&&Date.now()-Date.parse(pending.checkoutAt)<30*86400_000)context=pending;}
  if(!context)return; // Historic subscriptions are not relabelled as newly acquired users.
  if(stage==='paid') {await write('growth:subscription:'+subscriptionId,context,db,true);await recordStage('paid',context,sub.user_id,db,{amountMinor:obj.amount_paid,currency:obj.currency,verification:'stripe_invoice_paid'});}
  else {await recordStage('checkout_completed',context,obj.id,db);if(sub.status==='trialing')await recordStage('trial_started',context,subscriptionId,db);}
}
export async function growthSummary() {
  const {rows}=await database().query(`SELECT e.body->'first'->>'source' AS source,e.body->>'event' AS event,count(DISTINCT COALESCE(e.body->>'userId',e.body->>'visitor'))::int AS people,count(*)::int AS events FROM quest_shared_data e LEFT JOIN quest_shared_data v ON v.key='growth:visitor:'||(e.body->>'visitor') WHERE e.key LIKE 'growth:event:%' AND e.updated_at>=now()-interval '30 days' AND COALESCE((e.body->>'internal')::boolean,false)=false AND COALESCE((v.body->>'internal')::boolean,false)=false GROUP BY 1,2 ORDER BY 1,2`);
  return {status:'ready',windowDays:30,model:'first observed touch; last evidenced touch also stored for 30 days',rows,paidDefinition:'First positive paid invoice observed for a newly tracked checkout; free trials are separate',limitations:['Referrer/allowlisted UTM identifies observed source, not an AI impression or recommendation.','Missing referrer remains direct_unknown.','Browser events are client-reported; verified registrations and paid invoices are server-side.','Historic traffic is not backfilled.']};
}
