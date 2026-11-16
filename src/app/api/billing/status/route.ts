import { billingStatus } from '@/lib/account/billing';
export const maxDuration=10;
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, max-age=120','Vary':'Cookie'};
export async function GET(request:Request){
 const fresh=new URL(request.url).searchParams.has('fresh');
 try{return Response.json(await billingStatus({fresh}),{headers:fresh?{'Cache-Control':'private, no-store','Vary':'Cookie'}:headers});}
 catch{return Response.json({premium:false,remaining:0,status:'unavailable',configured:false},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
