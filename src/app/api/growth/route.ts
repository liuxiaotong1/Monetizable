import {createHash} from 'node:crypto';
import {currentUser,administrator,sameOrigin} from '@/lib/account/auth';
import {rateLimit} from '@/lib/account/db';
import {captureGrowth,growthSummary} from '@/lib/marketing/growth-server';
export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:'Invalid origin'},{status:403});
  try{const text=await request.text();if(text.length>2048)return Response.json({error:'Too large'},{status:413});
    const ip=request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
    if(!await rateLimit('growth:'+createHash('sha256').update(ip).digest('hex'),120,60))return Response.json({error:'Rate limited'},{status:429});
    const input=JSON.parse(text);if(!input||typeof input!=='object')return Response.json({error:'Invalid input'},{status:400});
    const result=await captureGrowth(input,await currentUser());
    return Response.json(result,{headers:{'Cache-Control':'private,no-store'}});
  }catch{return Response.json({error:'Tracking unavailable'},{status:503,headers:{'Cache-Control':'private,no-store'}});}
}
export async function GET(){
  if(!await administrator())return Response.json({error:'Forbidden'},{status:403});
  try{return Response.json(await growthSummary(),{headers:{'Cache-Control':'private,no-store'}});}catch{return Response.json({status:'unavailable'},{status:503});}
}
