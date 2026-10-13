import { setupBilling } from '@/lib/account/billing';
import { administrator,sameOrigin } from '@/lib/account/auth';
export async function POST(request:Request){const setupToken=process.env.QUEST_SETUP_TOKEN;const internal=!!setupToken&&request.headers.get('authorization')===`Bearer ${setupToken}`;if(!internal&&(!sameOrigin(request)||!await administrator()))return Response.json({error:'Not authorized'},{status:403});try{return Response.json(await setupBilling());}catch{return Response.json({error:'Stripe configuration failed. Check the connected account and server key.'},{status:503});}}
