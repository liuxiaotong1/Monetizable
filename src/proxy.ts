import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { oauthRecoveryPath } from "@/lib/account/redirect";
import { supabasePublicKey, supabasePublicUrl } from "@/lib/account/supabase-env";
export async function proxy(request: NextRequest) {
  const recovery = oauthRecoveryPath(request.nextUrl.pathname, request.nextUrl.searchParams, request.cookies.get('quest_login_next')?.value);
  if (recovery) {
    const retry = NextResponse.redirect(new URL(recovery, request.url));
    retry.headers.set('Cache-Control', 'private, no-store');
    return retry;
  }
  let response = NextResponse.next({ request });
  const url = supabasePublicUrl(),
    key = supabasePublicKey();
  if (!url || !key) return response;
  // Anonymous document and bot traffic has no session to refresh.
  if (!request.cookies.getAll().some((cookie) => cookie.name.includes("auth-token"))) return response;
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
    "/api/push/:path*",
    "/api/newsletter/subscription",
    "/api/admin/:path*",
    "/api/auth/:path*",
  ],
};
