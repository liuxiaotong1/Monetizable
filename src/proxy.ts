import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { oauthRecoveryPath } from "@/lib/account/redirect";
import { supabasePublicKey, supabasePublicUrl } from "@/lib/account/supabase-env";
import { detectLocale, LOCALE_COOKIE } from "@/lib/i18n/locale";

function signedIn(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => cookie.name.includes("auth-token"));
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (/\.(?:svg|png|jpe?g|gif|webp|ico|glb|gz|css|js|map|txt|xml|webmanifest|woff2?)$/i.test(path)) return NextResponse.next();
  if (request.headers.get("next-router-prefetch") === "1" || request.headers.get("purpose") === "prefetch") return NextResponse.next();
  const recovery = oauthRecoveryPath(path, request.nextUrl.searchParams, request.cookies.get("quest_login_next")?.value);
  if (recovery) {
    const retry = NextResponse.redirect(new URL(recovery, request.url));
    retry.headers.set("Cache-Control", "private, no-store");
    return retry;
  }
  const view = request.nextUrl.searchParams.get("view");
  if (path === "/" && !signedIn(request) && (!view || view === "today")) {
    const locale = detectLocale({
      explicit: request.cookies.get(LOCALE_COOKIE)?.value,
      acceptLanguage: request.headers.get("accept-language") || "",
      country: request.headers.get("x-vercel-ip-country") || "",
    });
    const url = request.nextUrl.clone();
    url.pathname = `/welcome/${locale}`;
    return NextResponse.rewrite(url);
  }
  let response = NextResponse.next({ request });
  const url = supabasePublicUrl(),
    key = supabasePublicKey();
  if (!url || !key) return response;
  // Anonymous document and bot traffic has no session to refresh.
  if (!signedIn(request)) return response;
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
