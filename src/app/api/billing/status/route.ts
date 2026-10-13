import { billingStatus } from '@/lib/account/billing';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json(await billingStatus(),{headers:{'Cache-Control':'private,no-store'}});}catch{return Response.json({premium:false,remaining:0,status:'unavailable',configured:false},{status:503});}}
