import { billingConfig,stripeClient,synchronizeSubscription } from '@/lib/account/billing';
import { database } from '@/lib/account/db';
import type Stripe from 'stripe';
export async function POST(request:Request){
 const signature=request.headers.get('stripe-signature');if(!signature)return new Response('Missing signature',{status:400});
 try{const config=await billingConfig();if(!config)return new Response('Not configured',{status:503});
 const event=stripeClient().webhooks.constructEvent(await request.text(),signature,config.webhookSecret);
 if(event.livemode!==config.livemode)return new Response('Wrong environment',{status:400});
 const client=await database().connect();
 try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['stripe-event:'+event.id]);if((await client.query('SELECT id FROM quest_stripe_events WHERE id=$1',[event.id])).rows.length){await client.query('COMMIT');return Response.json({received:true});}
 const obj=event.data.object as unknown as {id:string;subscription?:string|{id:string}|null;parent?:{subscription_details?:{subscription?:string|{id:string}|null}}};
 let id=event.type.startsWith('customer.subscription.')?obj.id:obj.subscription||obj.parent?.subscription_details?.subscription;
 if(typeof id==='object'&&id)id=id.id;if(typeof id==='string')await synchronizeSubscription(id);
 await client.query('INSERT INTO quest_stripe_events(id) VALUES($1)',[event.id]);await client.query('COMMIT');return Response.json({received:true});
 }catch{await client.query('ROLLBACK');return new Response('Retry event',{status:500});}finally{client.release();}
 }catch{return new Response('Invalid signature or unavailable configuration',{status:400});}
}
