import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authClient, APP_URL, isAdmin } from '@/lib/account/auth';
import { loginDestination } from '@/lib/account/redirect';
import {associateGrowthUser} from '@/lib/marketing/growth-server';
import {requestOptIn} from '@/lib/newsletter/opt-in';
import {normalizeLocale} from '@/lib/newsletter/policy';
import {attachNewsletterAccount} from '@/lib/newsletter/store';

export async function GET(request: Request) {
  const url = new URL(request.url), jar = await cookies();
  const next = loginDestination(jar.get('quest_login_next')?.value);
  const newsletterLocale = normalizeLocale(jar.get('newsletter_optin')?.value);
  jar.delete('quest_login_next');
  jar.delete('newsletter_optin');
  const code = url.searchParams.get('code');
  if (code && !url.searchParams.has('error')) {
    try {
      const client = await authClient();
      if (client) {
        const { data, error } = await client.auth.exchangeCodeForSession(code);
        if (!error && data.user) {
          await associateGrowthUser(data.user);
          const email = data.user.email?.trim().toLowerCase();
          if (email) {
            try { await attachNewsletterAccount(data.user.id, email); } catch { /* Linking a row does not create consent. */ }
            if (newsletterLocale) {
              try { await requestOptIn({ email, userId: data.user.id, locale: newsletterLocale, source: 'signup' }); } catch { /* Sign-in still completes when confirmation email is unavailable. */ }
            }
          }
          return NextResponse.redirect(new URL(isAdmin(data.user) && next === '/' ? '/admin' : next, APP_URL), { headers: { 'Cache-Control': 'private, no-store' } });
        }
      }
    } catch { /* Fail closed; never trust an email from callback parameters. */ }
  }
  const failure=new URL('/auth',APP_URL);failure.searchParams.set('error','google_signin');failure.searchParams.set('next',next);return NextResponse.redirect(failure);
}
