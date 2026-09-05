import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const oneYearInSeconds = 60 * 60 * 24 * 365;

export function GET(request: NextRequest) {
  const destination = new URL("/", request.url);
  destination.searchParams.set("analytics", "excluded");

  const response = NextResponse.redirect(destination);
  response.cookies.set("monetizable_analytics_opt_out", "1", {
    path: "/",
    maxAge: oneYearInSeconds,
    sameSite: "lax",
    secure: true,
  });
  response.headers.set("Cache-Control", "no-store");

  return response;
}
