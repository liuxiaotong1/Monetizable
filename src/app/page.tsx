import {BillingProvider} from "@/components/account/billing-access";
import QuestApp from "@/components/quest/quest-app";
import {requestLocale} from '@/lib/i18n/server-locale';
import EnglishQuest from "@/components/quest/english-quest";
import AccountShell from "@/components/account/account-shell";
import { currentUser, isAdmin } from "@/lib/account/auth";
import PublicOverview from '@/components/marketing/public-overview';
import {applicationSchema, organizationSchema} from '@/lib/marketing/positioning';
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser(),
    admin = isAdmin(user),locale=await requestLocale(admin);
  return (
    <><script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({'@context': 'https://schema.org', '@graph': [organizationSchema(), applicationSchema()]}).replace(/</g, '\\u003c')}}/><BillingProvider><AccountShell
      user={user ? { id: user.id, email: user.email, admin } : null}
    >
      {locale==='zh' ? <QuestApp /> : <EnglishQuest signedIn={!!user} />}
    </AccountShell></BillingProvider>{!user && <PublicOverview locale={locale}/>}</>
  );
}
