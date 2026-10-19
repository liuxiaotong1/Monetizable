import {currentUser,isAdmin,sameOrigin} from '@/lib/account/auth';
import {billingStatus} from '@/lib/account/billing';
import {rateLimit} from '@/lib/account/db';
import {publishedLearningCard} from '@/lib/quest/learning-catalog';
import {claimLearning,guestLearningId} from '@/lib/account/learning-access';
import {requestLocale} from '@/lib/i18n/server-locale';
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Invalid request.'},{status:403});const user=await currentUser();
 try{if(!await rateLimit('learning:'+(user?.id||await guestLearningId(true)),60,60))return Response.json({error:'Please wait a moment.'},{status:429});const input=await request.json();if(typeof input.cardId!=='string'||input.cardId.length>240)return Response.json({error:'Invalid card.'},{status:400});const card=await publishedLearningCard(input.cardId,await requestLocale(isAdmin(user)));
 if(!card||!Number.isInteger(input.answerIndex)||input.answerIndex<0||input.answerIndex>=card.choices.length)return Response.json({error:'Invalid answer.'},{status:400});
 const access=await billingStatus();let chosen=input.answerIndex;
 if(!access.premium){const result=await claimLearning(card.id,chosen,user?.id);if(!result.allowed)return Response.json({error:user?'Your five free cards for today are used. Subscribe for unlimited learning.':'Sign in or register to unlock cards 3–5 today.'},{status:user?402:401});chosen=result.chosen;}
 return Response.json({card,chosen},{headers:{'Cache-Control':'private,no-store'}});
 }catch{return Response.json({error:'Learning access is temporarily unavailable. Please retry.'},{status:503});}
}
