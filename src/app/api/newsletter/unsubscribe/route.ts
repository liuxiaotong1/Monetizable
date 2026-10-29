import { NextResponse } from "next/server";
import { unsubscribePage, unsubscribeResultPage } from "@/lib/newsletter/pages";
import { validToken, type NewsletterLocale } from "@/lib/newsletter/policy";
import { localeForToken, NewsletterStorageError, unsubscribeToken } from "@/lib/newsletter/store";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

function html(body: string, status = 200) {
  return new Response(body, { status, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!validToken(token)) return html(unsubscribeResultPage("en"));
  try {
    const locale = await localeForToken("unsubscribe", token);
    return html(unsubscribePage(token, locale));
  } catch (error) {
    if (error instanceof NewsletterStorageError) return html(unsubscribeResultPage("en"), 503);
    return html(unsubscribeResultPage("en"), 503);
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("token");
  let oneClick = false;
  const type = request.headers.get("content-type") || "";
  try {
    if (type.includes("application/json")) {
      const body = await request.json() as { token?: unknown };
      if (!token && typeof body.token === "string") token = body.token;
    } else if (type.includes("form")) {
      const form = await request.formData();
      const value = form.get("token");
      if (!token && typeof value === "string") token = value;
      oneClick = form.get("List-Unsubscribe") === "One-Click";
    }
  } catch { /* Query token can still authorize the request. */ }
  if (!validToken(token)) {
    if (oneClick) return new NextResponse(null, { status: 200, headers });
    return html(unsubscribeResultPage("en"), 400);
  }
  try {
    const locale = await unsubscribeToken(token);
    if (oneClick) return new NextResponse(null, { status: 200, headers });
    return html(unsubscribeResultPage(locale));
  } catch (error) {
    const locale: NewsletterLocale = "en";
    if (oneClick) return new NextResponse(null, { status: error instanceof NewsletterStorageError ? 503 : 500, headers });
    return html(unsubscribeResultPage(locale), 503);
  }
}
