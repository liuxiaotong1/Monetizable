import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { revokeGoogleToken } from "@/lib/opportunity-agent/gmail";
import { gmailConnectionForUser, updateGmailConnection } from "@/lib/opportunity-agent/storage";

export async function POST() {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const connection = await gmailConnectionForUser(user.id);
  if (connection) { try { await revokeGoogleToken(connection.encrypted_refresh_token); } catch {} await updateGmailConnection(user.id, { status: "revoked", encrypted_access_token: null, encrypted_refresh_token: "revoked" }); }
  return NextResponse.json({ ok: true });
}
