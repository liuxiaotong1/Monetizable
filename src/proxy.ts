import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { oauthRecoveryPath } from "@/lib/account/redirect";
export async function proxy(request: NextRequest) {
  const recovery = oauthRecoveryPath(request.nextUrl.pathname, request.nextUrl.searchParams, request.cookies.get('quest_login_next')?.value);
  if (recovery) {
    const retry = NextResponse.redirect(new URL(recovery, request.url));
    retry.headers.set('Cache-Control', 'private, no-store');
    return retry;
  }
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach((v) => request.cookies.set(v.name, v.value));
        response = NextResponse.next({ request });
        values.forEach((v) => response.cookies.set(v.name, v.value, v.options));
      },
    },
  });
  await client.auth.getUser();
  return response;
}
export const config = {
  matcher: [
    "/",
    "/admin",
    "/auth/:path*",
    "/api/profile",
    "/api/admin/:path*",
    "/api/auth/:path*",
  ],
};
