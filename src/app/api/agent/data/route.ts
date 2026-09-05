import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { deleteCandidateProfilesForUser } from "@/lib/storage";

export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deleteCandidateProfilesForUser(user.id);
  return NextResponse.json({ ok: true });
}
