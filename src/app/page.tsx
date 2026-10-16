import {BillingProvider} from "@/components/account/billing-access";
import QuestApp from "@/components/quest/quest-app";
import {requestLocale} from '@/lib/i18n/server-locale';
import EnglishQuest from "@/components/quest/english-quest";
import AccountShell from "@/components/account/account-shell";
import { currentUser, isAdmin } from "@/lib/account/auth";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser(),
    admin = isAdmin(user),locale=await requestLocale(admin);
  return (
    <BillingProvider><AccountShell
      user={user ? { id: user.id, email: user.email, admin } : null}
    >
      {locale==='zh' ? <QuestApp /> : <EnglishQuest signedIn={!!user} />}
    </AccountShell></BillingProvider>
  );
}
