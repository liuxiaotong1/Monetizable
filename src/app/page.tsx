import Academy from '@/components/academy/academy';
import {educationMetadata} from '@/lib/marketing/education';
import {BillingProvider} from "@/components/account/billing-access";
import WorkspaceEntry from "@/components/quest/workspace-entry";
import AccountShell from "@/components/account/account-shell";
import PublicLanding from '@/components/marketing/public-landing';
import {currentUser,isAdmin} from "@/lib/account/auth";
import {sessionFor} from '@/lib/quest/domain';
import {applicationSchema,organizationSchema} from '@/lib/marketing/positioning';
export const dynamic="force-dynamic";
type HomeQuery = { view?: string; welcome?: string; market?: string; entry?: string; onboarding?: string };

function learningHome(query: HomeQuery) {
 return !query.view && !query.welcome && !query.market && !query.entry && !query.onboarding;
}

export async function generateMetadata({searchParams}:{searchParams:Promise<HomeQuery>}) {
 return learningHome(await searchParams) ? educationMetadata('/') : {};
}

export default async function Page({searchParams}:{searchParams:Promise<HomeQuery>}){
 const user=await currentUser(),admin=isAdmin(user),params=await searchParams,publicHome=!user&&(!params.view||params.view==='today');
 if(learningHome(params)) return <Academy signedIn={!!user} legacyHref={user ? '/?view=today' : '/?market=1#first-prediction'}/>;
 const schema=<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@graph':[organizationSchema(),applicationSchema()]}).replace(/</g,'\\u003c')}}/>;
 if(publicHome){const now=new Date();return <>{schema}<PublicLanding initialState={{now:now.toISOString(),session:sessionFor(now),bars:[]}}/></>}
 return <>{schema}<BillingProvider><AccountShell user={user?{id:user.id,email:user.email,admin}:null}><WorkspaceEntry signedIn={!!user}/></AccountShell></BillingProvider></>;
}
