import { NextResponse } from "next/server";
import { authClient, sameOrigin } from "@/lib/account/auth";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const client = await authClient();
  if (client) {
    const { error } = await client.auth.signOut();
    if (error)
      return NextResponse.json(
        { error: "Could not sign out. Please try again." },
        { status: 503 },
      );
  }
  return NextResponse.json({ ok: true });
}
