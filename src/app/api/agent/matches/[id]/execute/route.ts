import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { matchForUser } from "@/lib/opportunity-agent/storage";

export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in is required" }, { status: 401 });
  const { id } = await params;
  const match = await matchForUser(user.id, id);
  if (!match) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  return NextResponse.json({ error: "Review the email draft before approving delivery" }, { status: 409 });
}
