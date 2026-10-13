import 'server-only';
import Stripe from 'stripe';
import { randomBytes } from 'node:crypto';
import { database } from './db';
import { APP_URL, currentUser, isAdmin } from './auth';
export const PREMIUM_CENTS=1990,TRIAL_DAYS=7;
export function stripeClient(){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw Error('Stripe billing is not configured.');return new Stripe(key,{timeout:20000,maxNetworkRetries:1});}
export function learningWeek(now=new Date()) {const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
type BillingConfig={price:string;webhookSecret:string;portal:string;livemode:boolean;account?:string};
export async function billingConfig():Promise<BillingConfig|undefined>{const {rows}=await database().query("SELECT body FROM quest_shared_data WHERE key='billing-config-v1'");return rows[0]?.body;}
export async function setupBilling(){
 const previous=await billingConfig();if(previous)return {configured:true,livemode:previous.livemode};
 const stripe=stripeClient();
 const product=await stripe.products.create({name:'Monetizable Plus',description:'Premarket briefs and unlimited investing knowledge cards.'},{idempotencyKey:'monetizable-plus-product-v1'});
 const price=await stripe.prices.create({product:product.id,currency:'usd',unit_amount:PREMIUM_CENTS,recurring:{interval:'month'}},{idempotencyKey:'monetizable-plus-1990-monthly-v1'});
 const portal=await stripe.billingPortal.configurations.create({business_profile:{headline:'Manage your Monetizable subscription'},features:{subscription_cancel:{enabled:true,mode:'at_period_end'},payment_method_update:{enabled:true},invoice_history:{enabled:true}},default_return_url:APP_URL+'/?view=learn'},{idempotencyKey:'monetizable-plus-portal-v1'});
 const webhook=await stripe.webhookEndpoints.create({url:APP_URL+'/api/billing/webhook',enabled_events:['checkout.session.completed','checkout.session.async_payment_succeeded','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed']},{idempotencyKey:'monetizable-plus-webhook-v1'});
 if(!webhook.secret)throw Error('Webhook configuration incomplete.');
 const body:BillingConfig={price:price.id,webhookSecret:webhook.secret,portal:portal.id,livemode:price.livemode};
 await database().query("INSERT INTO quest_shared_data(key,body) VALUES('billing-config-v1',$1) ON CONFLICT(key) DO NOTHING",[JSON.stringify(body)]);
 return {configured:true,livemode:price.livemode};
}
export async function billingStatus(){
 const user=await currentUser();
 if(isAdmin(user))return {premium:true,admin:true,signedIn:true,status:'admin',remaining:1,configured:!!await billingConfig(),trialUsed:false};
 const config=await billingConfig();if(!user)return {premium:false,admin:false,signedIn:false,status:'free',remaining:0,configured:!!config,trialUsed:false};
 const {rows}=await database().query('SELECT * FROM quest_subscriptions WHERE user_id=$1',[user.id]);const sub=rows[0];
 const premium=!!sub&&['active','trialing'].includes(sub.status)&&!!sub.access_until&&Date.parse(sub.access_until)>Date.now();
 const usage=await database().query('SELECT card_id FROM quest_learning_allowance WHERE user_id=$1 AND week=$2',[user.id,learningWeek()]);
 return {premium,admin:false,signedIn:true,status:sub?.status||'free',remaining:usage.rows.length?0:1,claimedCard:usage.rows[0]?.card_id,configured:!!config,trialUsed:!!sub?.trial_used,trialEnd:sub?.trial_end,accessUntil:sub?.access_until,cancelAtPeriodEnd:!!sub?.cancel_at_period_end};
}
export async function synchronizeSubscription(id:string){
 const stripe=stripeClient(),sub=await stripe.subscriptions.retrieve(id);
 const customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;
 const config=await billingConfig();if(!config||!sub.items.data.some(item=>item.price.id===config.price))return;
 const {rows}=await database().query('SELECT user_id FROM quest_subscriptions WHERE customer_id=$1',[customer]);
 const userId=rows[0]?.user_id;if(!userId||sub.metadata.quest_user_id!==userId)return;
 const until=sub.status==='trialing'?sub.trial_end:Math.max(0,...sub.items.data.map(i=>i.current_period_end));
 await database().query('UPDATE quest_subscriptions SET subscription_id=$2,status=$3,trial_used=trial_used OR $4,trial_end=$5,access_until=$6,cancel_at_period_end=$7,updated_at=now() WHERE user_id=$1',[userId,sub.id,sub.status,!!sub.trial_start,sub.trial_end?new Date(sub.trial_end*1000):null,until?new Date(until*1000):null,sub.cancel_at_period_end]);
}
export async function checkout(){
 const user=await currentUser();if(!user)throw Error('Sign in before starting your trial.');
 const config=await billingConfig();if(!config)throw Error('Checkout is being connected. Please try again shortly.');
 const stripe=stripeClient(),db=database(),client=await db.connect();
 try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['billing:'+user.id]);
 await client.query('INSERT INTO quest_subscriptions(user_id) VALUES($1) ON CONFLICT DO NOTHING',[user.id]);
 let sub=(await client.query('SELECT * FROM quest_subscriptions WHERE user_id=$1 FOR UPDATE',[user.id])).rows[0];
 if(sub.subscription_id){const live=await stripe.subscriptions.retrieve(sub.subscription_id);if(['active','trialing','past_due','incomplete','paused'].includes(live.status))throw Error('Manage your existing subscription instead of starting another.');}
 if(!sub.customer_id){const customer=await stripe.customers.create({email:user.email,metadata:{quest_user_id:user.id}},{idempotencyKey:'quest-customer:'+user.id});await client.query('UPDATE quest_subscriptions SET customer_id=$2 WHERE user_id=$1',[user.id,customer.id]);sub={...sub,customer_id:customer.id};}
 const open=await stripe.checkout.sessions.list({customer:sub.customer_id,status:'open',limit:20});const existing=open.data.find(s=>s.metadata?.quest_user_id===user.id&&s.metadata?.quest_price===config.price);if(existing?.url){await client.query('COMMIT');return existing.url;}
 const history=await stripe.subscriptions.list({customer:sub.customer_id,status:'all',limit:100});
 const relevant=history.data.filter(s=>s.items.data.some(i=>i.price.id===config.price));
 if(relevant.some(s=>['active','trialing','past_due','incomplete','paused'].includes(s.status)))throw Error('Manage your existing subscription instead of starting another.');
 const used=!!sub.trial_used||relevant.some(s=>s.trial_start!==null);
 if(used)await client.query('UPDATE quest_subscriptions SET trial_used=true WHERE user_id=$1',[user.id]);
 const trial=!used;
 const session=await stripe.checkout.sessions.create({mode:'subscription',customer:sub.customer_id,client_reference_id:user.id,line_items:[{price:config.price,quantity:1}],payment_method_collection:'always',subscription_data:{metadata:{quest_user_id:user.id},...(trial?{trial_period_days:TRIAL_DAYS,trial_settings:{end_behavior:{missing_payment_method:'cancel' as const}}}:{})},metadata:{quest_user_id:user.id,quest_price:config.price},success_url:APP_URL+'/?view=learn&billing=success',cancel_url:APP_URL+'/?view=learn&billing=canceled',custom_text:{submit:{message:trial?'7 days free, then USD $19.90 every month automatically. Cancel before your trial ends to avoid a charge.':'USD $19.90 every month automatically. Cancel in your billing portal.'}},integration_identifier:'monetizable_'+[...randomBytes(8)].map(byte=>String.fromCharCode(97+byte%26)).join(''),locale:'en'});
 await client.query('COMMIT');if(!session.url)throw Error('Stripe did not provide a checkout URL.');return session.url;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function portal(){const user=await currentUser();if(!user)throw Error('Sign in first.');const config=await billingConfig(),{rows}=await database().query('SELECT customer_id FROM quest_subscriptions WHERE user_id=$1',[user.id]);if(!config||!rows[0]?.customer_id)throw Error('No billing account yet.');return (await stripeClient().billingPortal.sessions.create({customer:rows[0].customer_id,configuration:config.portal,return_url:APP_URL+'/?view=learn'})).url;}
