'use client';
import {createContext,useContext,Children,isValidElement,cloneElement,type ReactNode,type ReactElement} from 'react';
import type {AppLocale} from '@/lib/i18n/locale';
import {translateString} from '@/lib/i18n/translate';
const Context=createContext<AppLocale>('fr');
export function LocaleProvider({locale,children}:{locale:AppLocale;children:ReactNode}){return <Context.Provider value={locale}>{children}</Context.Provider>;}
export function useLocale(){return useContext(Context);}
/** Translate React text and display attributes without touching DOM nodes,
 * input values, event handlers, identifiers, or persisted user records. */
export function LocalizeTree({children}:{children:ReactNode}){
 const locale=useLocale();if(locale==='en')return <>{children}</>;
 function walk(node:ReactNode):ReactNode{
  if(typeof node==='string')return translateString(node,locale);
  if(Array.isArray(node))return Children.map(node,walk);
  if(!isValidElement(node))return node;
  const element=node as ReactElement<Record<string,unknown>>,props=element.props;
  if(props.translate==='no'||props['data-user-content']||element.type==='textarea'||element.type==='script'||element.type==='style')return node;
  const next:Record<string,unknown>={};for(const key of ['title','aria-label','placeholder','alt'])if(typeof props[key]==='string')next[key]=translateString(props[key] as string,locale);
  if('children' in props)next.children=walk(props.children as ReactNode);
  return cloneElement(element,next);
 }
 return <>{walk(children)}</>;
}
export function LanguageSwitcher({admin=false}:{admin?:boolean}){const locale=useLocale();return <label className="language-switcher"><span className="sr-only">{locale==='fr'?'Langue':locale==='zh'?'语言':'Language'}</span><select aria-label={locale==='fr'?'Langue du site':locale==='zh'?'网站语言':'Website language'} value={locale} onChange={event=>{const value=event.target.value;document.cookie=`monetizable-locale=${value};path=/;max-age=31536000;SameSite=Lax${location.protocol==='https:'?';Secure':''}`;location.reload();}}><option value="zh">中文</option><option value="fr">Français</option><option value="en">English</option></select></label>;}
