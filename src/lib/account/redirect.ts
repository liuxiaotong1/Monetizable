export function loginDestination(value: string | null | undefined) {
  // Keep post-login navigation inside the app, including encoded/backslash URLs.
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/';
  try {
    const url = new URL(value, 'https://getmonetizable.com');
    return url.origin === 'https://getmonetizable.com' ? url.pathname + url.search : '/';
  } catch { return '/'; }
}
