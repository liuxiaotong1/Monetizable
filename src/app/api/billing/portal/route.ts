import { portal } from '@/lib/account/billing';
import { sameOrigin,currentUser } from '@/lib/account/auth';
import { rateLimit } from '@/lib/account/db';
export async function POST(request:Request){if(!sameOrigin(request))return Response.json({error:'Invalid request.'},{status:403});if(!await currentUser())return Response.json({error:'Sign in first.'},{status:401});try{const user=(await currentUser())!;if(!await rateLimit('billing:'+user.id,10,60))return Response.json({error:'Please wait a moment.'},{status:429});return Response.json({url:await portal()});}catch(e){return Response.json({error:e instanceof Error&&!('type' in e)?e.message:'Stripe billing is temporarily unavailable. Please retry.'},{status:409});}}
