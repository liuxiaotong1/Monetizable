'use client';
import dynamic from 'next/dynamic';
import {useEffect,useState} from 'react';
import {useLocale,LanguageSwitcher} from '@/components/i18n/locale-provider';
import FirstQuestHero from '@/components/quest/first-quest-hero';
import {savedHero} from '@/components/quest/hero-preference';
import {onboardingDestination,pendingOnboardingKey} from '@/lib/account/onboarding';
import type {QuestState} from '@/lib/quest/types';
import './public-landing.css';
const HeroPicker=dynamic(()=>import('@/components/account/hero-picker'),{ssr:false});
export type LandingState=Pick<QuestState,'now'|'session'|'bars'>;
export default function PublicLanding({initialState}:{initialState:LandingState}){
 const locale=useLocale(),[state,setState]=useState(initialState),[picking,setPicking]=useState(false);
 const c=locale==='zh'?{play:'玩法',prices:'价格',login:'登录'}:locale==='fr'?{play:'Le parcours',prices:'Tarifs',login:'Connexion'}:{play:'How it works',prices:'Pricing',login:'Sign in'};
 useEffect(()=>{const controller=new AbortController();fetch('/api/landing',{signal:controller.signal}).then(r=>r.ok?r.json():null).then(d=>{if(d?.session&&Array.isArray(d.bars))setState(d)}).catch(()=>{});const start=()=>setPicking(true);addEventListener('quest-start-playing',start);return()=>{controller.abort();removeEventListener('quest-start-playing',start)}},[]);
 return <div className="public-landing"><header className="public-landing-nav"><a href="/" className="public-brand" aria-label="Monetizable"><img src="/brand/monetizable-curious-m.svg" width="32" height="32" alt=""/><span>Monetizable</span></a><nav><a href="#landing-product-demo">{c.play}</a><a href="#landing-prices">{c.prices}</a><LanguageSwitcher/><a href="/auth">{c.login}</a></nav></header><main className="public-landing-main"><FirstQuestHero state={state} publicEntry/></main>{picking&&<HeroPicker onClose={()=>setPicking(false)} onContinue={()=>{const hero=savedHero()||'supercharlie';try{localStorage.setItem(pendingOnboardingKey,hero)}catch{}location.assign('/auth?next='+encodeURIComponent(onboardingDestination(hero)))}}/>}</div>;
}
