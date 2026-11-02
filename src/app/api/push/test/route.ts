import { NextResponse } from "next/server";
import { currentUser } from "@/lib/account/auth";
import { rateLimit } from "@/lib/account/db";
import { sameOrigin } from "@/lib/account/policy";
import { cronAuthorized } from "@/lib/push/vapid";
import { sendTestPush } from "@/lib/push/dispatch";
import type { PushCategory } from "@/lib/push/copy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const categories = new Set<PushCategory>(["premarket", "review", "knowledge", "event"]);

export async function POST(request: Request) {
  const user = await currentUser();
  const token = cronAuthorized(request);
  if (!user && !token) return NextResponse.json({ error: "Sign in to send a test reminder.", code: "auth" }, { status: 401 });
  if (user && !token && !sameOrigin(request)) return NextResponse.json({ error: "Invalid request.", code: "origin" }, { status: 403 });
  try {
    const body = await request.json() as { category?: string; phase?: string; userId?: string; endpoint?: string };
    const category = body.category;
    if (!category || !categories.has(category as PushCategory)) {
      return NextResponse.json({ error: "Choose premarket, review, knowledge, or event.", code: "category" }, { status: 400 });
    }
    const phase = body.phase === "soon" ? "soon" : body.phase === "eve" ? "eve" : undefined;
    const requestedUser = typeof body.userId === "string" ? body.userId : "";
    if (requestedUser && user && requestedUser !== user.id && !token) {
      return NextResponse.json({ error: "Forbidden.", code: "forbidden" }, { status: 403 });
    }
    const userId = token && requestedUser ? requestedUser : user?.id;
    if (!userId) return NextResponse.json({ error: "Sign in to send a test reminder.", code: "auth" }, { status: 401 });
    if (!token) {
      const allowed = await rateLimit("push-test:" + userId, 3, 60 * 60);
      if (!allowed) return NextResponse.json({ error: "A test reminder was just sent. You can send another in a little while.", code: "later" }, { status: 429 });
    }
    const endpoint = typeof body.endpoint === "string" && body.endpoint.length > 0 && body.endpoint.length <= 2048 ? body.endpoint : undefined;
    const result = await sendTestPush(userId, category as PushCategory, category === "event" ? phase || "eve" : undefined, endpoint);
    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ error: "The test reminder could not be sent.", code: "failed" }, { status: 500 });
  }
}
