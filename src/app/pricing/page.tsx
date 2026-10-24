import Pricing from '@/components/account/pricing';
import {BillingProvider} from '@/components/account/billing-access';
export const metadata={title:'Free & Pro Trading Practice Plans | Monetizable',description:'Compare Monetizable Free and Pro: daily trading quests, saved prediction history, personalised discipline practice and knowledge cards.',alternates:{canonical:'https://getmonetizable.com/pricing'}};
export default function PricingPage(){return <BillingProvider><Pricing/></BillingProvider>;}
