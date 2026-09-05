import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAUTH_STATE_COOKIE } from "@/lib/auth-flow";
import { currentUser } from "@/lib/auth";
import { gmailAuthorizationUrl } from "@/lib/opportunity-agent/gmail";
import { subscriptionForUser } from "@/lib/opportunity-agent/storage";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await subscriptionForUser(user.id)) return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  const destination = gmailAuthorizationUrl(user.id);
  (await cookies()).set(OAUTH_STATE_COOKIE, new URL(destination).searchParams.get("state")!, { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", maxAge: 10 * 60, path: "/" });
  return NextResponse.redirect(destination);
}
