import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  const client = await createServerSupabaseClient();
  if (client) await client.auth.signOut();
  return NextResponse.json({ ok: true });
}
