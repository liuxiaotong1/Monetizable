import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { legacyBlogRedirectUrl } from "@/lib/legacy-blog-redirect";
import { updateSupabaseSession } from "@/lib/supabase/server";

const blogHostname = process.env.BLOG_HOSTNAME ?? "blog.getmonetizable.com";
const englishContentPath = /^\/(?:post(?:\/|$)|blog(?:\/|$)|guides(?:\/|$)|faq(?:\/|$)|authors(?:\/|$)|methodology(?:\/|$)|editorial-policy(?:\/|$))/;

export async function proxy(request: NextRequest) {
  const destination = legacyBlogRedirectUrl(request.url, request.headers.get("host"), blogHostname);
  if (destination) return NextResponse.redirect(destination, 308);
  const requestHeaders = new Headers(request.headers);
  if (englishContentPath.test(request.nextUrl.pathname)) {
    requestHeaders.set("x-monetizable-content-language", "en");
  }
  return updateSupabaseSession(request, requestHeaders);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
