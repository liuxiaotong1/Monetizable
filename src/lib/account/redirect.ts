export function loginDestination(value: string | null | undefined) {
  // Keep post-login navigation inside the app, including encoded/backslash URLs.
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/';
  try {
    const url = new URL(value, 'https://getmonetizable.com');
    return url.origin === 'https://getmonetizable.com' ? url.pathname + url.search : '/';
  } catch { return '/'; }
}

// Auth providers can send failures to the site root before our callback runs.
// Return only a fixed error label, never reflect provider descriptions or codes.
export function oauthRecoveryPath(pathname: string, params: URLSearchParams, next?: string) {
  if (pathname !== '/' || !params.has('error') || !params.has('error_code')) return null;
  const target = new URL('/auth', 'https://getmonetizable.com');
  target.searchParams.set('error', 'google_signin');
  target.searchParams.set('next', loginDestination(next));
  return target.pathname + target.search;
}
