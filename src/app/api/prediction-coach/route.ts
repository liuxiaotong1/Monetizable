import {currentUser,sameOrigin} from '@/lib/account/auth';
import {billingStatus} from '@/lib/account/billing';
import {database} from '@/lib/account/db';
import {sessionFor} from '@/lib/quest/domain';
import {reasonFeedback} from '@/lib/quest/companion-coach';
import {projectReasonFeedback} from '@/lib/quest/review-access';
import type {Judgment,Forecast} from '@/lib/quest/types';
export const maxDuration=60;
export async function POST(request:Request){
 const headers={'Cache-Control':'private,no-store'};
 if(!sameOrigin(request))return Response.json({error:'FORBIDDEN'},{status:403,headers});
 const user=await currentUser();if(!user)return Response.json({error:'AUTH'},{status:401,headers});
 try{
  const raw=await request.text();if(raw.length>1000)return Response.json({error:'SIZE'},{status:413,headers});
  const input=JSON.parse(raw),locale=input.locale==='zh'||input.locale==='fr'?input.locale:'en';
  if(typeof input.judgmentId!=='string'||input.judgmentId.length>200)return Response.json({error:'INVALID'},{status:400,headers});
  const row=(await database().query('SELECT record FROM quest_profiles WHERE user_id=$1',[user.id])).rows[0];
  const judgment=(row?.record?.judgments as Judgment[]|undefined)?.find(j=>j.id===input.judgmentId),forecast=(row?.record?.forecasts as Forecast[]|undefined)?.find(f=>f.id===judgment?.forecastId);
  if(!judgment||!forecast)return Response.json({error:'PENDING_SYNC'},{status:409,headers});
  const session=sessionFor(new Date(judgment.date+'T12:00:00Z'));
  if(!judgment.eligible||!session.isTradingDay||!judgment.reason.trim()||!Number.isFinite(Date.parse(judgment.lockedAt))||Date.parse(judgment.lockedAt)>=Date.parse(session.openAt)||Date.parse(judgment.lockedAt)>Date.now()||!Number.isFinite(Date.parse(forecast.createdAt))||Date.parse(forecast.createdAt)>=Date.parse(session.openAt))return Response.json({error:'INELIGIBLE'},{status:400,headers});
  const [report,access]=await Promise.all([reasonFeedback(user.id,judgment,locale),billingStatus().catch(()=>({premium:false}))]);
  return Response.json(projectReasonFeedback(report,access.premium),{headers});
 }catch(error){const code=error instanceof Error?error.message:'';return Response.json({error:code==='AI_BUSY'?'AI_BUSY':'AI_UNAVAILABLE'},{status:code==='AI_BUSY'?429:503,headers});}
}
