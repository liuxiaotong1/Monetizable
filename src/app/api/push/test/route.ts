import { NextResponse } from "next/server";
import { administrator, currentUser } from "@/lib/account/auth";
import { cronAuthorized } from "@/lib/push/vapid";
import { sendTestPush } from "@/lib/push/dispatch";
import type { PushCategory } from "@/lib/push/copy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const categories = new Set<PushCategory>(["premarket", "review", "knowledge", "event"]);

export async function POST(request: Request) {
  const user = await currentUser();
  const admin = await administrator();
  const token = cronAuthorized(request);
  if (!admin && !token) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    const body = await request.json() as { category?: string; phase?: string; userId?: string };
    const category = body.category;
    if (!category || !categories.has(category as PushCategory)) {
      return NextResponse.json({ error: "Choose premarket, review, knowledge, or event." }, { status: 400 });
    }
    const phase = body.phase === "soon" ? "soon" : body.phase === "eve" ? "eve" : undefined;
    const userId = admin ? user?.id : body.userId;
    if (!userId) return NextResponse.json({ error: "Sign in, or pass your own userId with the scheduler token." }, { status: 400 });
    const result = await sendTestPush(userId, category as PushCategory, category === "event" ? phase || "eve" : undefined);
    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ error: "The test reminder could not be sent." }, { status: 500 });
  }
}
