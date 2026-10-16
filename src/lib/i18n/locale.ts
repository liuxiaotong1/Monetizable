export type AppLocale='fr'|'en'|'zh';
export const LOCALE_COOKIE='monetizable-locale';
export function resolveLocale(value:unknown,admin=false):AppLocale{return value==='fr'||value==='en'?value:value==='zh'?'zh':admin?'zh':'fr';}
export function clientLocale(){if(typeof document==='undefined')return 'fr-FR';const lang=document.documentElement.lang;return lang.startsWith('zh')?'zh-CN':lang==='en'?'en-US':'fr-FR';}
export function intlLocale(locale:AppLocale){return locale==='zh'?'zh-CN':locale==='en'?'en-US':'fr-FR';}
export function formatUsd(amount:number,locale:AppLocale){return new Intl.NumberFormat(intlLocale(locale),{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(amount);}
/** Calendar dates stored as YYYY-MM-DD, shown in the active language without shifting the New York session day. */
export function formatMarketDate(iso:string,locale:AppLocale){const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());if(!match)return iso;const date=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]),16));return new Intl.DateTimeFormat(intlLocale(locale),{day:'numeric',month:'long',year:'numeric',timeZone:'America/New_York'}).format(date);}
