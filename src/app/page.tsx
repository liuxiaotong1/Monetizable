import type { Metadata } from "next";
import Academy from "@/components/academy/academy";
import {BillingProvider} from "@/components/account/billing-access";
import WorkspaceEntry from "@/components/quest/workspace-entry";
import {requestLocale} from '@/lib/i18n/server-locale';
import AccountShell from "@/components/account/account-shell";
import PublicLanding from '@/components/marketing/public-landing';
import {currentUser,isAdmin} from "@/lib/account/auth";
import {sessionFor} from '@/lib/quest/domain';
import {applicationSchema,organizationSchema} from '@/lib/marketing/positioning';
export const dynamic="force-dynamic";

type HomeQuery = { view?: string; welcome?: string; market?: string; entry?: string };
function showAcademy(query: HomeQuery) {
  return !query.view && !query.entry && query.welcome !== '1' && query.market !== '1';
}

const education = {
  en: ['Financial literacy for everyone | Monetizable', 'Learn investing, economics and everyday money through interactive charts, short quizzes and daily quests.'],
  fr: ['La finance pour tout le monde | Monetizable', 'Apprenez l’investissement, l’économie et les finances du quotidien avec des graphiques interactifs, des quiz et des quêtes.'],
  zh: ['零基础金融学习 | Monetizable', '通过互动图表、简短测验和每日任务，学习投资、经济和日常理财。'],
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<HomeQuery> }): Promise<Metadata> {
  if (!showAcademy(await searchParams)) return {};
  const [title, description] = education[await requestLocale(isAdmin(await currentUser()))];
  return {
    title, description,
    openGraph: { title, description, url: 'https://getmonetizable.com', siteName: 'Monetizable', type: 'website', images: ['/brand/social-preview.png'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/brand/social-preview.png'] },
  };
}

export default async function Page({searchParams}:{searchParams:Promise<HomeQuery>}){
 const user=await currentUser(),admin=isAdmin(user),locale=await requestLocale(admin),params=await searchParams,publicHome=!user&&(!params.view||params.view==='today');
 const academy=showAcademy(params), description=education[locale][1];
 const organization=academy?{...organizationSchema(),description}:organizationSchema();
 const application=academy?{...applicationSchema(),description,featureList:['Interactive financial charts','Beginner learning journeys','Short quizzes and daily challenges','XP and levels']}:applicationSchema();
 const schema=<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@graph':[organization,application]}).replace(/</g,'\\u003c')}}/>;
 if(academy) return <>{schema}<Academy signedIn={!!user} legacyHref={user?"/?view=today":"/?market=1#first-prediction"}/></>;
 if(publicHome){const now=new Date();return <>{schema}<PublicLanding initialState={{now:now.toISOString(),session:sessionFor(now),bars:[]}}/></>}
 return <>{schema}<BillingProvider><AccountShell user={user?{id:user.id,email:user.email,admin}:null}><WorkspaceEntry signedIn={!!user}/></AccountShell></BillingProvider></>;
}
