import {getPublicFeed} from '@/lib/quest/public-source';
import {englishState} from '@/lib/quest/english-server';
import {billingStatus} from '@/lib/account/billing';
import {currentUser,isAdmin} from '@/lib/account/auth';
export const dynamic='force-dynamic';
export async function GET(){
 const user=await currentUser(),feed=await getPublicFeed();
 const state=isAdmin(user)?feed.state:englishState(feed.state);
 let premium=false;try{premium=(await billingStatus()).premium;}catch{}
 if(!premium)state.cards=state.cards.map(card=>({...card,answerIndex:-1,answerExplanation:'',explanation:'',analogy:'',example:'',sources:[]}));
 return Response.json(state,{headers:{'Cache-Control':'private,no-store'}});
}
