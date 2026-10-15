export type AppLocale='fr'|'en'|'zh';
export const LOCALE_COOKIE='monetizable-locale';
export function resolveLocale(value:unknown,admin=false):AppLocale{return value==='fr'||value==='en'?value:value==='zh'&&admin?'zh':admin?'zh':'fr';}
export function clientLocale(){if(typeof document==='undefined')return 'fr-FR';const lang=document.documentElement.lang;return lang.startsWith('zh')?'zh-CN':lang==='en'?'en-US':'fr-FR';}
