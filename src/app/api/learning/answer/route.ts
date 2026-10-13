import {currentUser,isAdmin,sameOrigin} from '@/lib/account/auth';
import {billingStatus,learningWeek} from '@/lib/account/billing';
import {database,rateLimit} from '@/lib/account/db';
import {getPublicFeed} from '@/lib/quest/public-source';
import {englishState} from '@/lib/quest/english-server';
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Invalid request.'},{status:403});const user=await currentUser();if(!user)return Response.json({error:'Sign in to use your free weekly card.'},{status:401});
 try{if(!await rateLimit('learning:'+user.id,60,60))return Response.json({error:'Please wait a moment.'},{status:429});const input=await request.json();const feed=await getPublicFeed(),state=isAdmin(user)?feed.state:englishState(feed.state),card=state.cards.find(c=>c.id===input.cardId);
 if(!card||!Number.isInteger(input.answerIndex)||input.answerIndex<0||input.answerIndex>=card.choices.length)return Response.json({error:'Invalid answer.'},{status:400});
 const access=await billingStatus();let chosen=input.answerIndex;
 if(!access.premium){const {rows}=await database().query('INSERT INTO quest_learning_allowance(user_id,week,card_id,chosen) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,week) DO UPDATE SET card_id=quest_learning_allowance.card_id RETURNING card_id,chosen',[user.id,learningWeek(),card.id,chosen]);if(rows[0].card_id!==card.id)return Response.json({error:'Your free card for this week is used. Start a trial for unlimited learning.'},{status:402});chosen=rows[0].chosen;}
 return Response.json({card,chosen},{headers:{'Cache-Control':'private,no-store'}});
 }catch{return Response.json({error:'Learning access is temporarily unavailable. Please retry.'},{status:503});}
}
