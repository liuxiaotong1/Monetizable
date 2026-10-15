import 'server-only';
import {cookies} from 'next/headers';
import {resolveLocale,LOCALE_COOKIE} from './locale';
export async function requestLocale(admin=false){return resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value,admin);}
