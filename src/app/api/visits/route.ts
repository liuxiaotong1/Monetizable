import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { sameOrigin,currentUser } from "@/lib/account/auth";
import { database } from "@/lib/account/db";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  try {
    const { path } = await request.json();
    if (!["today", "events", "learn", "auth", "brand-proposals"].includes(path))
      return NextResponse.json({ error: "Invalid path." }, { status: 400 });
    const jar = await cookies(),
      stored = jar.get("quest-visitor")?.value,
      visitor =
        stored && /^[a-f0-9-]{36}$/.test(stored) ? stored : randomUUID();
    await database().query(
      "INSERT INTO quest_visits(visitor,path) VALUES($1,$2) ON CONFLICT(day,visitor,path) DO UPDATE SET views=quest_visits.views+1,last_at=now()",
      [visitor, path],
    );
    const user=await currentUser();
    if(user)await database().query("INSERT INTO quest_profiles(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET last_seen_at=now()",[user.id]);
    const res = NextResponse.json({ ok: true });
    res.cookies.set("quest-visitor", visitor, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400 * 90,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json(
      { error: "Metrics temporarily unavailable." },
      { status: 503 },
    );
  }
}
