import {loginDestination} from "@/lib/account/redirect";
import { NextResponse } from "next/server";
import { authClient, isAdmin, sameOrigin } from "@/lib/account/auth";
import type { EmailOtpType } from "@supabase/supabase-js";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  try {
    const { token_hash, type, next } = await request.json();
    if (
      !["magiclink", "signup", "email"].includes(type) ||
      typeof token_hash !== "string" ||
      !/^[a-zA-Z0-9_-]{32,200}$/.test(token_hash)
    )
      return NextResponse.json(
        { error: "Invalid or expired sign-in link." },
        { status: 400 },
      );
    const client = await authClient();
    if (!client) throw Error();
    const { data, error } = await client.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    });
    if (error || !data.user)
      return NextResponse.json(
        {
          error:
            "This link has expired or has already been used. Request a new one.",
        },
        { status: 400 },
      );
    return NextResponse.json({
      ok: true,
      next: isAdmin(data.user)&&loginDestination(next)==='/'?'/admin':loginDestination(next),
    });
  } catch {
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable." },
      { status: 503 },
    );
  }
}
