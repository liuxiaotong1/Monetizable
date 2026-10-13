import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authClient, APP_URL, isAdmin } from '@/lib/account/auth';
import { loginDestination } from '@/lib/account/redirect';

export async function GET(request: Request) {
  const url = new URL(request.url), jar = await cookies();
  const next = loginDestination(jar.get('quest_login_next')?.value);
  jar.delete('quest_login_next');
  const code = url.searchParams.get('code');
  if (code && !url.searchParams.has('error')) {
    try {
      const client = await authClient();
      if (client) {
        const { data, error } = await client.auth.exchangeCodeForSession(code);
        if (!error && data.user) return NextResponse.redirect(new URL(isAdmin(data.user) && next === '/' ? '/admin' : next, APP_URL), { headers: { 'Cache-Control': 'private, no-store' } });
      }
    } catch { /* Fail closed; never trust an email from callback parameters. */ }
  }
  return NextResponse.redirect(new URL('/auth?error=google_signin', APP_URL));
}
