import {currentUser,sameOrigin} from '@/lib/account/auth';
import {generatePredictionReview} from '@/lib/quest/prediction-review-service';
export const maxDuration=90;
export async function POST(request:Request){
 const headers={'Cache-Control':'private,no-store'};
 if(!sameOrigin(request))return Response.json({error:'FORBIDDEN'},{status:403,headers});
 const user=await currentUser();if(!user)return Response.json({error:'AUTH'},{status:401,headers});
 try{const raw=await request.text();if(raw.length>5000)return Response.json({error:'SIZE'},{status:413,headers});
 return generatePredictionReview(user.id,JSON.parse(raw||'{}'));}catch{return Response.json({error:'INVALID'},{status:400,headers});}
}
