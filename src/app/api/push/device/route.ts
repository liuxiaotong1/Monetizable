import { NextResponse } from "next/server";
import { currentUser, sameOrigin } from "@/lib/account/auth";
import { database } from "@/lib/account/db";
import { ensureWebPushStore } from "@/lib/push/store";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403, headers });
  const user = await currentUser();
  if (!user) return NextResponse.json({ signedIn: false, accountSubscribed: false, deviceSubscribed: false }, { headers });
  try {
    const raw = await request.text();
    if (raw.length > 12_000) return NextResponse.json({ error: "Invalid request." }, { status: 413, headers });
    const body = raw ? JSON.parse(raw) as { endpoint?: unknown } : {};
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    await ensureWebPushStore();
    const { rows } = await database().query(
      "SELECT endpoint FROM public.web_push_subscriptions WHERE user_id = $1",
      [user.id],
    );
    const saved = rows.some((row) => row.endpoint === endpoint);
    return NextResponse.json({
      signedIn: true,
      accountSubscribed: rows.length > 0,
      deviceSubscribed: endpoint.length > 0 && saved,
    }, { headers });
  } catch {
    return NextResponse.json({ error: "Reminder settings are temporarily unavailable." }, { status: 503, headers });
  }
}
