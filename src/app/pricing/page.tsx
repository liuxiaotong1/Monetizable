import Pricing from '@/components/account/pricing';
import {BillingProvider} from '@/components/account/billing-access';
import {OPEN_EXPERIENCE} from '@/lib/account/experience';
export const dynamic = "force-static";
export const metadata=OPEN_EXPERIENCE?{title:'Free Practice Access | Monetizable',description:'Explore daily trading quests, complete AI companion debriefs, Trading DNA and knowledge cards with free practice access.'}:{title:'Free & Pro Trading Practice Plans | Monetizable',description:'Compare Monetizable Free and Pro: daily trading quests, saved prediction history, personalised discipline practice and knowledge cards.',alternates:{canonical:'https://getmonetizable.com/pricing'}};
export default function PricingPage(){return <BillingProvider><Pricing/></BillingProvider>;}
