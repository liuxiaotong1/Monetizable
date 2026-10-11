import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { authAdmin, APP_URL, sameOrigin } from "@/lib/account/auth";
import { rateLimit } from "@/lib/account/db";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  try {
    const body = await request.json(),
      email = String(body.email || "")
        .trim()
        .toLowerCase();
    if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) || email.length > 254)
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      hash = (s: string) => createHash("sha256").update(s).digest("hex");
    if (
      !(await rateLimit("email:" + hash(email), 3, 900)) ||
      !(await rateLimit("ip:" + hash(ip), 15, 3600))
    )
      return NextResponse.json(
        { error: "Please wait before requesting another link." },
        { status: 429 },
      );
    const client = authAdmin(),
      key = process.env.RESEND_API_KEY,
      from = process.env.OPPORTUNITY_EMAIL_FROM;
    if (!client || !key || !from)
      return NextResponse.json(
        {
          error:
            "Email sign-in is temporarily unavailable. Please try again later.",
        },
        { status: 503 },
      );
    const { data, error } = await client.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (error || !data.properties?.hashed_token) throw Error("link");
    const token = data.properties.hashed_token,
      type = data.properties.verification_type;
    const url = new URL("/auth/confirm", APP_URL);
    url.searchParams.set("token_hash", token);
    url.searchParams.set("type", type);
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your Monetizable sign-in link",
        html: `<div style="font-family:Arial;max-width:520px;padding:32px;background:#101522;color:#edf2f8;border-radius:20px"><img src="https://getmonetizable.com/brand/monetizable-bull-blue-violet.svg" width="72" height="72" alt="Monetizable"/><h1>Welcome, market explorer.</h1><p>Sign in to Monetizable to keep your judgments and learning progress with your account.</p><a href="${url.toString()}" style="display:inline-block;padding:16px 24px;background:linear-gradient(120deg,#63a8ff,#b18bfa);color:#101522;border-radius:14px;text-decoration:none;font-weight:700">Continue your quest</a><p style="color:#94a3b8;font-size:13px">This link is single-use. If you did not request it, ignore this email. We will never ask you to send us the link.</p></div>`,
      }),
    });
    if (!sent.ok) throw Error("delivery");
    return NextResponse.json({
      ok: true,
      message:
        "Check your inbox for a secure sign-in link. No password needed.",
    });
  } catch {
    return NextResponse.json(
      { error: "We could not send your sign-in link. Please try again later." },
      { status: 503 },
    );
  }
}
