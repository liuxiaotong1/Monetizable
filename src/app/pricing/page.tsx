import Pricing from '@/components/account/pricing';
import {BillingProvider} from '@/components/account/billing-access';
export const metadata={title:'Free & Pro · Monetizable'};
export default function PricingPage(){return <BillingProvider><Pricing/></BillingProvider>;}
