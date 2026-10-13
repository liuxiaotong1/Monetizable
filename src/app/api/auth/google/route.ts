import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authClient, APP_URL } from '@/lib/account/auth';
import { loginDestination } from '@/lib/account/redirect';

export async function GET(request: Request) {
  const next = loginDestination(new URL(request.url).searchParams.get('next'));
  const failure = () => NextResponse.redirect(new URL('/auth?error=google_unavailable', APP_URL));
  try {
    const client = await authClient();
    if (!client) return failure();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: APP_URL + '/auth/callback', skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    });
    if (error || !data.url) return failure();
    (await cookies()).set('quest_login_next', next, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
    return NextResponse.redirect(data.url, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return failure(); }
}
