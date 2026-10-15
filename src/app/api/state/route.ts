import {getPublicFeed} from '@/lib/quest/public-source';
import {localizedPublicState} from '@/lib/quest/public-locale';
import {requestLocale} from '@/lib/i18n/server-locale';
import {billingStatus} from '@/lib/account/billing';
import {currentUser,isAdmin} from '@/lib/account/auth';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function GET(){
 const user=await currentUser(),feed=await getPublicFeed();
 const state=localizedPublicState(feed.state,await requestLocale(isAdmin(user)));
 let premium=false;try{premium=(await billingStatus()).premium;}catch{}
 if(!premium)state.cards=state.cards.map(card=>({...card,answerIndex:-1,answerExplanation:'',explanation:'',analogy:'',example:'',sources:[]}));
 return Response.json(state,{headers:{'Cache-Control':'private,no-store'}});
}
