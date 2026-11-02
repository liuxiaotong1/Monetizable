'use client';
import {createContext,useContext,type ReactNode} from 'react';
import dynamic from 'next/dynamic';
import type {AppLocale} from '@/lib/i18n/locale';
const Context=createContext<AppLocale>('fr');
export function LocaleProvider({locale,children}:{locale:AppLocale;children:ReactNode}){return <Context.Provider value={locale}>{children}</Context.Provider>;}
export function useLocale(){return useContext(Context);}
export const LocalizeTree=dynamic(()=>import('./localize-tree'));
export function LanguageSwitcher({admin=false}:{admin?:boolean}){const locale=useLocale();return <label className="language-switcher"><span className="sr-only">{locale==='fr'?'Langue':locale==='zh'?'语言':'Language'}</span><select aria-label={locale==='fr'?'Langue du site':locale==='zh'?'网站语言':'Website language'} value={locale} onChange={event=>{void saveLanguage(event.target.value);}}><option value="zh">中文</option><option value="fr">Français</option><option value="en">English</option></select></label>;}
async function saveLanguage(value:string){
 if(value!=='en'&&value!=='fr'&&value!=='zh')return;
 document.cookie=`monetizable-locale=${value};path=/;max-age=31536000;SameSite=Lax${location.protocol==='https:'?';Secure':''}`;
 try{
  let endpoint:string|undefined;
  const registration=await navigator.serviceWorker?.getRegistration();
  endpoint=(await registration?.pushManager.getSubscription())?.endpoint;
  await fetch('/api/push/locale',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({locale:value,endpoint})});
 }catch{/* The cookie still changes the page. The next signed-in visit stores the account language if it was empty. */}
 location.reload();
}
