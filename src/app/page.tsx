import {BillingProvider} from "@/components/account/billing-access";
import WorkspaceEntry from "@/components/quest/workspace-entry";
import AccountShell from "@/components/account/account-shell";
import PublicLanding from '@/components/marketing/public-landing';
import {currentUser,isAdmin} from "@/lib/account/auth";
import {sessionFor} from '@/lib/quest/domain';
import {applicationSchema,organizationSchema} from '@/lib/marketing/positioning';
export const dynamic="force-dynamic";
type HomeQuery = { view?: string };

export default async function Page({searchParams}:{searchParams:Promise<HomeQuery>}){
 const user=await currentUser(),admin=isAdmin(user),params=await searchParams,publicHome=!user&&(!params.view||params.view==='today');
 const schema=<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@graph':[organizationSchema(),applicationSchema()]}).replace(/</g,'\\u003c')}}/>;
 if(publicHome){const now=new Date();return <>{schema}<PublicLanding initialState={{now:now.toISOString(),session:sessionFor(now),bars:[]}}/></>}
 return <>{schema}<BillingProvider><AccountShell user={user?{id:user.id,email:user.email,admin}:null}><WorkspaceEntry signedIn={!!user}/></AccountShell></BillingProvider></>;
}
