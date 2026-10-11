import { NextResponse } from "next/server";
import { currentUser, isAdmin, sameOrigin } from "@/lib/account/auth";
import { database, profile } from "@/lib/account/db";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null }, { headers });
  try {
    return NextResponse.json(
      {
        user: { id: user.id, email: user.email, admin: isAdmin(user) },
        ...(await profile(user.id)),
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "Account progress is temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
export async function PUT(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    const text = await request.text();
    if (text.length > 2_000_000)
      return NextResponse.json(
        { error: "Progress file too large." },
        { status: 413 },
      );
    const { record, revision, tutorialDone } = JSON.parse(text);
    if (
      !Number.isInteger(revision) ||
      revision < 0 ||
      (record &&
        (record.version !== 1 ||
          !Array.isArray(record.judgments) ||
          !Array.isArray(record.progress) ||
          !Array.isArray(record.cards)))
    )
      return NextResponse.json({ error: "Invalid progress." }, { status: 400 });
    const { rows } = await database().query(
      "UPDATE quest_profiles SET record=COALESCE($2::jsonb,record),revision=revision+1,tutorial_done=COALESCE($3,tutorial_done),last_seen_at=now() WHERE user_id=$1 AND revision=$4 RETURNING revision",
      [
        user.id,
        record ? JSON.stringify(record) : null,
        typeof tutorialDone === "boolean" ? tutorialDone : null,
        revision,
      ],
    );
    if (!rows.length)
      return NextResponse.json(
        {
          error:
            "Progress changed on another device. Reload to merge the latest account data.",
        },
        { status: 409 },
      );
    return NextResponse.json(
      { ok: true, revision: Number(rows[0].revision) },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "Cloud save failed. Your browser copy is safe; try again." },
      { status: 503, headers },
    );
  }
}
