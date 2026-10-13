import {BillingProvider} from "@/components/account/billing-access";
import QuestApp from "@/components/quest/quest-app";
import EnglishQuest from "@/components/quest/english-quest";
import AccountShell from "@/components/account/account-shell";
import { currentUser, isAdmin } from "@/lib/account/auth";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser(),
    admin = isAdmin(user);
  return (
    <BillingProvider><AccountShell
      user={user ? { id: user.id, email: user.email, admin } : null}
    >
      {admin ? <QuestApp /> : <EnglishQuest signedIn={!!user} />}
    </AccountShell></BillingProvider>
  );
}
