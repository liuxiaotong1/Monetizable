import {requestLocale} from '@/lib/i18n/server-locale';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authClient, APP_URL } from '@/lib/account/auth';
import { loginDestination } from '@/lib/account/redirect';
import { normalizeLocale } from '@/lib/newsletter/policy';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = loginDestination(url.searchParams.get('next'));
  const failure = () => {const url=new URL('/auth',APP_URL);url.searchParams.set('error','google_unavailable');url.searchParams.set('next',next);return NextResponse.redirect(url)};
  try {
    const client = await authClient();
    const locale=await requestLocale();
    if (!client) return failure();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: APP_URL + '/auth/callback', skipBrowserRedirect: true, queryParams: { prompt: 'select_account',hl:locale==='fr'?'fr':locale==='zh'?'zh-CN':'en' } },
    });
    if (error || !data.url) return failure();
    const jar = await cookies();
    const newsletterLocale = normalizeLocale(url.searchParams.get('locale'));
    if (url.searchParams.get('newsletter') === '1' && newsletterLocale) jar.set('newsletter_optin', newsletterLocale, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
    else jar.delete('newsletter_optin');
    jar.set('quest_login_next', next, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
    return NextResponse.redirect(data.url, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return failure(); }
}
