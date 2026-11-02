import {cronAuthorized} from '@/lib/push/vapid';
import {warmClosingReviews} from '@/lib/quest/closing-reviews';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function GET(request:Request){
 const headers={'Cache-Control':'private,no-store'};
 if(!cronAuthorized(request))return Response.json({error:'AUTH'},{status:401,headers});
 try{const result=await warmClosingReviews();return Response.json(result,{status:result.status==='ai-unavailable'?503:200,headers});}
 catch{return Response.json({status:'error'},{status:503,headers});}
}
