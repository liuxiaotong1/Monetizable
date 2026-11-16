import {getLocalizedPublicState} from '@/lib/quest/public-source';
import {requestLocale} from '@/lib/i18n/server-locale';
import {billingStatus} from '@/lib/account/billing';
import {currentUser,isAdmin} from '@/lib/account/auth';
export const maxDuration=15;
export const dynamic='force-dynamic';
// Personalized (locale, signed-in card answers). Browser-only cache; never a shared CDN entry.
const headers={'Cache-Control':'private, max-age=60','Vary':'Cookie'};
export async function GET(){
 const user=await currentUser();
 const locale=await requestLocale(isAdmin(user));
 const [state,premium]=await Promise.all([
  getLocalizedPublicState(locale),
  billingStatus().then(status=>status.premium).catch(()=>false),
 ]);
 const body=premium?state:{...state,cards:state.cards.map(card=>({...card,answerIndex:-1,answerExplanation:'',explanation:'',analogy:'',example:'',sources:[]}))};
 return Response.json(body,{headers});
}
