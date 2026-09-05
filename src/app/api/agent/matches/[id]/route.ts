import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { updateMatchStatus } from "@/lib/opportunity-agent/storage";

const allowed = new Set(["new", "saved", "dismissed"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status } = await request.json();
  if (!allowed.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  await updateMatchStatus(user.id, id, status);
  return NextResponse.json({ ok: true });
}
