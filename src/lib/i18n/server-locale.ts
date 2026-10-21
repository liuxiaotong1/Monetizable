import 'server-only';
import {cookies,headers} from 'next/headers';
import {detectLocale,LOCALE_COOKIE} from './locale';
export async function requestLocale(admin=false){const [jar,requestHeaders]=await Promise.all([cookies(),headers()]);return detectLocale({explicit:jar.get(LOCALE_COOKIE)?.value,admin,acceptLanguage:requestHeaders.get('accept-language')||'',country:requestHeaders.get('x-vercel-ip-country')||''});}
