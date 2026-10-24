"use client";
import {LocalizeTree} from '@/components/i18n/locale-provider';
import { Analytics } from "@vercel/analytics/next";
import {useEffect,useState} from 'react';
import {internalBrowser,sendGrowth} from '@/lib/marketing/growth-client';
import {useLocale} from '@/components/i18n/locale-provider';
export default function AnalyticsTracker({internal=false}:{internal?:boolean}) {
  const locale=useLocale(),[consent,setConsent]=useState<string>(),[settings,setSettings]=useState(false);
  const copy={en:{text:'Help us understand which guides and AI search referrals lead to useful practice. Optional analytics connects your visit, practice, registration and subscription using a first-party identifier.',allow:'Allow analytics',deny:'Essential only',settings:'Analytics settings'},fr:{text:'Aidez-nous à comprendre quels guides et quelles sources IA mènent à une pratique utile. Ces statistiques facultatives relient votre visite, vos exercices, votre inscription et votre abonnement grâce à un identifiant interne.',allow:'Autoriser les statistiques',deny:'Essentiels uniquement',settings:'Réglages des statistiques'},zh:{text:'帮助我们了解哪些指南和 AI 搜索来源带来了有价值的练习。可选统计通过站内标识关联访问、试玩、注册与订阅。',allow:'允许统计',deny:'仅必要功能',settings:'统计偏好'}}[locale];
  async function choose(value:'granted'|'denied'){
    try{localStorage.setItem('monetizable-analytics-consent',value);}catch{}
    setConsent(value);setSettings(false);
    if(value==='granted')void sendGrowth('visit',internal);
    else await fetch('/api/growth',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({consent:'denied'})}).catch(()=>{});
  }
  useEffect(()=>{
    let saved:string|null=null;try{saved=localStorage.getItem('monetizable-analytics-consent');}catch{}
    setConsent(saved||'pending');
    if(internal||internalBrowser()){void sendGrowth('visit',true);return;}
    if(saved==='granted')void sendGrowth('visit',false);
    if(internal||internalBrowser())return;
    const click=(event:MouseEvent)=>{
      if(!event.isTrusted||!(event.target instanceof Element))return;
      const target=event.target.closest<HTMLElement>('[data-growth-event],a[href]');if(!target)return;
      const name=target.dataset.growthEvent;
      if(name==='try_start')void sendGrowth('try_start');
      else if(target instanceof HTMLAnchorElement&&target.origin===location.origin&&target.pathname==='/auth')void sendGrowth('signup_start');
    };
    document.addEventListener('click',click,true);return()=>document.removeEventListener('click',click,true);
  },[internal]);
  const excluded=internal||internalBrowser();
  return <LocalizeTree>{(<>
    {!excluded&&consent==='granted'&&
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        if (internal || internalBrowser() ||
          url.pathname.startsWith("/auth/confirm") ||
          url.pathname.startsWith("/admin")
        )
          return null;
        return { ...event, url: url.origin + url.pathname };
      }}
    />}
    {!excluded&&consent&&(consent==='pending'||settings)?<aside className="analytics-consent" aria-label={copy.settings}><p>{copy.text} <a href="/privacy">{locale==='zh'?'隐私说明':'Privacy'}</a></p><div><button onClick={()=>void choose('denied')}>{copy.deny}</button><button onClick={()=>void choose('granted')}>{copy.allow}</button></div></aside>:!excluded&&consent?<button className="analytics-settings" onClick={()=>setSettings(true)}>{copy.settings}</button>:null}
  </>)}</LocalizeTree>;
}
