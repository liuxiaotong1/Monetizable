export type AppLocale='fr'|'en'|'zh';
export const LOCALE_COOKIE='monetizable-locale';
export function resolveLocale(value:unknown,admin=false):AppLocale{return value==='fr'||value==='en'?value:value==='zh'?'zh':admin?'zh':'en';}
export function clientLocale(){if(typeof document==='undefined')return 'fr-FR';const lang=document.documentElement.lang;return lang.startsWith('zh')?'zh-CN':lang==='en'?'en-US':'fr-FR';}
export function intlLocale(locale:AppLocale){return locale==='zh'?'zh-CN':locale==='en'?'en-US':'fr-FR';}
export function formatUsd(amount:number,locale:AppLocale){return new Intl.NumberFormat(intlLocale(locale),{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(amount);}
/** Calendar dates stored as YYYY-MM-DD, shown in the active language without shifting the New York session day. */
export function formatMarketDate(iso:string,locale:AppLocale){const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());if(!match)return iso;const date=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]),16));return new Intl.DateTimeFormat(intlLocale(locale),{day:'numeric',month:'long',year:'numeric',timeZone:'America/New_York'}).format(date);}

/** Manual choice wins; browser language supports travellers; edge country is a fallback, not a precise location. */
export function detectLocale({explicit,admin=false,acceptLanguage='',country=''}:{explicit?:string;admin?:boolean;acceptLanguage?:string;country?:string}):AppLocale{
 if(explicit==='en'||explicit==='fr'||explicit==='zh')return explicit;
 if(admin)return 'zh';
 const languages=acceptLanguage.split(',').map((raw,index)=>{const [tag,...parameters]=raw.trim().split(';');const q=parameters.find(p=>p.trim().startsWith('q='));return {tag:tag.toLowerCase().split('-')[0],quality:q?Number(q.trim().slice(2)):1,index};}).filter(p=>Number.isFinite(p.quality)&&p.quality>0&&['en','fr','zh'].includes(p.tag)).sort((a,b)=>b.quality-a.quality||a.index-b.index);
 if(languages[0])return languages[0].tag as AppLocale;
 if(['CN','TW','HK','MO'].includes(country.toUpperCase()))return 'zh';
 if(['FR','MC','GF','GP','MQ','RE','PF','NC','WF','BL','MF'].includes(country.toUpperCase()))return 'fr';
 return 'en';
}
