import 'server-only';
import {MONTHLY_CENTS,ANNUAL_CENTS,TRIAL_DAYS,type PaidPlan} from './plans';
export {TRIAL_DAYS} from './plans';
import Stripe from 'stripe';
import {requestLocale} from '@/lib/i18n/server-locale';
import { randomBytes } from 'node:crypto';
import { database } from './db';
import { learningUsage } from './learning-access';
import { APP_URL, currentUser, isAdmin } from './auth';
import {recordCheckout} from '@/lib/marketing/growth-server';
export const PREMIUM_CENTS=MONTHLY_CENTS;
export function stripeClient(){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw Error('Stripe billing is not configured.');return new Stripe(key,{timeout:20000,maxNetworkRetries:1});}
export function learningWeek(now=new Date()) {const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
type BillingConfig={version?:number;annualPrice?:string;legacyPrices?:string[];price:string;webhookSecret:string;portal:string;livemode:boolean;account?:string};
export async function billingConfig():Promise<BillingConfig|undefined>{const {rows}=await database().query("SELECT body FROM quest_shared_data WHERE key IN ('billing-config-v3','billing-config-v2','billing-config-v1') ORDER BY key DESC LIMIT 1");return rows[0]?.body;}
export async function setupBilling(){
 const previous=await billingConfig();if(previous?.version===3&&previous.annualPrice)return {configured:true,livemode:previous.livemode};
 const stripe=stripeClient();
 const product=await stripe.products.create({name:'Monetizable Pro',description:'Personalized discipline practice, prediction history, Trading DNA, full market briefs and unlimited learning.'},{idempotencyKey:'monetizable-pro-product-v2'});
 const price=await stripe.prices.create({product:product.id,currency:'usd',unit_amount:MONTHLY_CENTS,recurring:{interval:'month'}},{idempotencyKey:'monetizable-pro-1799-monthly-v3'});
 const annual=await stripe.prices.create({product:product.id,currency:'usd',unit_amount:ANNUAL_CENTS,recurring:{interval:'year'}},{idempotencyKey:'monetizable-pro-11988-annual-v3'});
 if(previous&&price.livemode!==previous.livemode)throw Error('Stripe environment does not match the existing billing configuration.');
 const portal=previous?.portal?{id:previous.portal}:await stripe.billingPortal.configurations.create({business_profile:{headline:'Manage your Monetizable subscription'},features:{subscription_cancel:{enabled:true,mode:'at_period_end'},payment_method_update:{enabled:true},invoice_history:{enabled:true}},default_return_url:APP_URL+'/pricing'},{idempotencyKey:'monetizable-pro-portal-v2'});
 const webhook=previous?.webhookSecret?{secret:previous.webhookSecret}:await stripe.webhookEndpoints.create({url:APP_URL+'/api/billing/webhook',enabled_events:['checkout.session.completed','checkout.session.async_payment_succeeded','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed']},{idempotencyKey:'monetizable-pro-webhook-v2'});
 if(!webhook.secret)throw Error('Webhook configuration incomplete.');
 const body:BillingConfig={...previous,version:3,price:price.id,annualPrice:annual.id,legacyPrices:[...new Set([...(previous?.legacyPrices||[]),...[previous?.price,previous?.annualPrice].filter((id):id is string=>!!id)])],webhookSecret:webhook.secret,portal:portal.id,livemode:price.livemode};
 await database().query("INSERT INTO quest_shared_data(key,body) VALUES('billing-config-v3',$1) ON CONFLICT(key) DO UPDATE SET body=EXCLUDED.body,updated_at=now()",[JSON.stringify(body)]);
 return {configured:true,livemode:price.livemode};
}
function acceptedPrices(config:BillingConfig){return new Set([config.price,config.annualPrice,...(config.legacyPrices||[])].filter(Boolean));}
export async function billingStatus(){
 const user=await currentUser();
 if(isAdmin(user))return {premium:true,admin:true,signedIn:true,status:'admin',remaining:1,configured:(await billingConfig())?.version===3,trialUsed:false};
 const config=await billingConfig();if(!user){const claimedCards=await learningUsage();return {premium:false,admin:false,signedIn:false,status:'free',remaining:Math.max(0,2-claimedCards.length),claimedCards,configured:config?.version===3&&!!config.annualPrice,trialUsed:false};}
 const {rows}=await database().query('SELECT * FROM quest_subscriptions WHERE user_id=$1',[user.id]);const sub=rows[0];
 const premium=!!sub&&['active','trialing'].includes(sub.status)&&!!sub.access_until&&Date.parse(sub.access_until)>Date.now();
 const claimedCards=await learningUsage(user.id);
 return {premium,admin:false,signedIn:true,status:sub?.status||'free',remaining:Math.max(0,5-claimedCards.length),claimedCards,configured:config?.version===3&&!!config.annualPrice,trialUsed:!!sub?.trial_used,trialEnd:sub?.trial_end,accessUntil:sub?.access_until,cancelAtPeriodEnd:!!sub?.cancel_at_period_end};
}
export async function synchronizeSubscription(id:string){
 const stripe=stripeClient(),sub=await stripe.subscriptions.retrieve(id);
 const customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;
 const config=await billingConfig();if(!config||!sub.items.data.some(item=>acceptedPrices(config).has(item.price.id)))return;
 const {rows}=await database().query('SELECT user_id FROM quest_subscriptions WHERE customer_id=$1',[customer]);
 const userId=rows[0]?.user_id;if(!userId||sub.metadata.quest_user_id!==userId)return;
 const until=sub.status==='trialing'?sub.trial_end:Math.max(0,...sub.items.data.map(i=>i.current_period_end));
 await database().query('UPDATE quest_subscriptions SET subscription_id=$2,status=$3,trial_used=trial_used OR $4,trial_end=$5,access_until=$6,cancel_at_period_end=$7,updated_at=now() WHERE user_id=$1',[userId,sub.id,sub.status,!!sub.trial_start,sub.trial_end?new Date(sub.trial_end*1000):null,until?new Date(until*1000):null,sub.cancel_at_period_end]);
}
export async function checkout(plan:PaidPlan='monthly'){
 const user=await currentUser();if(!user)throw Error('Sign in before starting your trial.');
 const config=await billingConfig();if(!config)throw Error('Checkout is being connected. Please try again shortly.');
 const locale=await requestLocale(isAdmin(user)),fr=locale==='fr';
 const selectedPrice=plan==='annual'?config.annualPrice:config.version===3?config.price:undefined;if(!selectedPrice)throw Error('The new subscription plans are being connected. Please retry shortly.');
 const amount=plan==='annual'?'119.88':'17.99',frAmount=plan==='annual'?'119,88':'17,99',period=plan==='annual'?'year':'month',frPeriod=plan==='annual'?'an':'mois';
 const stripe=stripeClient(),db=database(),client=await db.connect();
 try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['billing:'+user.id]);
 await client.query('INSERT INTO quest_subscriptions(user_id) VALUES($1) ON CONFLICT DO NOTHING',[user.id]);
 let sub=(await client.query('SELECT * FROM quest_subscriptions WHERE user_id=$1 FOR UPDATE',[user.id])).rows[0];
 if(sub.subscription_id){const live=await stripe.subscriptions.retrieve(sub.subscription_id);if(['active','trialing','past_due','incomplete','paused'].includes(live.status))throw Error('Manage your existing subscription instead of starting another.');}
 if(!sub.customer_id){const customer=await stripe.customers.create({email:user.email,metadata:{quest_user_id:user.id}},{idempotencyKey:'quest-customer:'+user.id});await client.query('UPDATE quest_subscriptions SET customer_id=$2 WHERE user_id=$1',[user.id,customer.id]);sub={...sub,customer_id:customer.id};}
 const open=await stripe.checkout.sessions.list({customer:sub.customer_id,status:'open',limit:20});const existing=open.data.find(s=>s.metadata?.quest_user_id===user.id&&s.metadata?.quest_price===selectedPrice&&s.locale===locale);if(existing?.url){await client.query('COMMIT');await recordCheckout(user.id,existing.id);return existing.url;}
 const history=await stripe.subscriptions.list({customer:sub.customer_id,status:'all',limit:100});
 const relevant=history.data.filter(s=>s.items.data.some(i=>acceptedPrices(config).has(i.price.id)));
 if(relevant.some(s=>['active','trialing','past_due','incomplete','paused'].includes(s.status)))throw Error('Manage your existing subscription instead of starting another.');
 const used=!!sub.trial_used||relevant.some(s=>s.trial_start!==null);
 if(used)await client.query('UPDATE quest_subscriptions SET trial_used=true WHERE user_id=$1',[user.id]);
 const trial=!used;
 const session=await stripe.checkout.sessions.create({mode:'subscription',customer:sub.customer_id,client_reference_id:user.id,line_items:[{price:selectedPrice,quantity:1}],payment_method_collection:'always',subscription_data:{metadata:{quest_user_id:user.id},...(trial?{trial_period_days:TRIAL_DAYS,trial_settings:{end_behavior:{missing_payment_method:'cancel' as const}}}:{})},metadata:{quest_user_id:user.id,quest_price:selectedPrice,quest_plan:plan},success_url:APP_URL+'/?view=learn&billing=success',cancel_url:APP_URL+'/pricing?billing=canceled',custom_text:{submit:{message:fr?`${trial?'7 jours gratuits, puis ':''}${frAmount} $US par ${frPeriod}, renouvellement automatique. Annulez dans votre espace de facturation avant la prochaine échéance pour éviter le renouvellement.`:locale==='zh'?`${trial?'7 天免费试用，之后':''}每${plan==='annual'?'年':'月'}自动续费 ${amount} 美元。可在下次扣款前通过账单管理取消。`:`${trial?'7 days free, then ':''}USD $${amount} every ${period}, renews automatically. Cancel in your billing portal before the next renewal to avoid the charge.`}},integration_identifier:'monetizable_'+[...randomBytes(8)].map(byte=>String.fromCharCode(97+byte%26)).join(''),locale});
 await client.query('COMMIT');if(!session.url)throw Error('Stripe did not provide a checkout URL.');await recordCheckout(user.id,session.id);return session.url;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function portal(){const user=await currentUser();if(!user)throw Error('Sign in first.');const config=await billingConfig(),{rows}=await database().query('SELECT customer_id FROM quest_subscriptions WHERE user_id=$1',[user.id]);if(!config||!rows[0]?.customer_id)throw Error('No billing account yet.');return (await stripeClient().billingPortal.sessions.create({customer:rows[0].customer_id,configuration:config.portal,return_url:APP_URL+'/?view=learn',locale:await requestLocale(isAdmin(user))})).url;}
