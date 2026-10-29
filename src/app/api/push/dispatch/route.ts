import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/push/vapid";
import { dispatchPush } from "@/lib/push/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const result = await dispatchPush();
    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ error: "Reminders could not be sent." }, { status: 500 });
  }
}

export function GET(request: Request) { return run(request); }
export function POST(request: Request) { return run(request); }
