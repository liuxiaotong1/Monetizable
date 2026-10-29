import { confirmPage, confirmResultPage } from "@/lib/newsletter/pages";
import { validToken, type NewsletterLocale } from "@/lib/newsletter/policy";
import { confirmToken, localeForToken, NewsletterStorageError } from "@/lib/newsletter/store";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

function html(body: string, status = 200) {
  return new Response(body, { status, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
}

async function readToken(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("token");
  if (request.method === "GET") return token;
  const type = request.headers.get("content-type") || "";
  try {
    if (type.includes("application/json")) {
      const body = await request.json() as { token?: unknown };
      if (!token && typeof body.token === "string") token = body.token;
    } else if (type.includes("form")) {
      const form = await request.formData();
      const value = form.get("token");
      if (!token && typeof value === "string") token = value;
    }
  } catch { /* An unreadable body still leaves the query token. */ }
  return token;
}

export async function GET(request: Request) {
  const token = await readToken(request);
  if (!validToken(token)) return html(confirmResultPage("en", false), 400);
  try {
    const locale = await localeForToken("confirm", token);
    return html(confirmPage(token, locale));
  } catch (error) {
    if (error instanceof NewsletterStorageError) return html(confirmResultPage("en", false), 503);
    return html(confirmResultPage("en", false), 503);
  }
}

export async function POST(request: Request) {
  const token = await readToken(request);
  if (!validToken(token)) return html(confirmResultPage("en", false), 400);
  try {
    const result = await confirmToken(token);
    return html(confirmResultPage(result.locale, result.ok));
  } catch (error) {
    const locale: NewsletterLocale = "en";
    if (error instanceof NewsletterStorageError) return html(confirmResultPage(locale, false), 503);
    return html(confirmResultPage(locale, false), 503);
  }
}
