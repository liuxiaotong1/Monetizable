import {currentUser,sameOrigin} from '@/lib/account/auth';
import {billingStatus} from '@/lib/account/billing';
import {projectPredictionReview,mentorQuestion} from '@/lib/quest/review-access';
import {reviewFollowup} from '@/lib/quest/companion-coach';
import {generatePredictionReview} from '@/lib/quest/prediction-review-service';
export const maxDuration=60;
export async function POST(request:Request){
 const headers={'Cache-Control':'private,no-store'};
 if(!sameOrigin(request))return Response.json({error:'FORBIDDEN'},{status:403,headers});
 const user=await currentUser();if(!user)return Response.json({error:'AUTH'},{status:401,headers});
 try{const raw=await request.text();if(raw.length>5000)return Response.json({error:'SIZE'},{status:413,headers});
 const input=JSON.parse(raw||'{}'),access=await billingStatus().catch(()=>({premium:false})),question=mentorQuestion(input.question);
 if(input.question!==undefined&&!question)return Response.json({error:'INVALID'},{status:400,headers});
 if(question&&!access.premium)return Response.json({error:'PRO_REQUIRED'},{status:402,headers});
 const response=await generatePredictionReview(user.id,input);
 if(response.status!==200)return response;
 const report=await response.json();
 if(question){const locale=input.locale==='zh'||input.locale==='fr'?input.locale:'en';return Response.json(await reviewFollowup(user.id,locale,question,{...report,originalCall:{reason:input.reason,direction:input.direction,confidence:input.confidence}}),{headers});}
 return Response.json(projectPredictionReview(report,access.premium),{headers});}catch(error){const invalid=error instanceof SyntaxError;return Response.json({error:invalid?'INVALID':'AI_UNAVAILABLE'},{status:invalid?400:503,headers});}
}
