import { NextResponse } from "next/server";
import { cronAuthorized, vapidConfig } from "@/lib/push/vapid";
import { claimDispatchPass, idleDispatch, subscriptionsNeedDispatch } from "@/lib/push/needed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const keys = vapidConfig();
  if (!keys.publicKey || !keys.privateKey) {
    return NextResponse.json({ ok: false, error: "Push signing is not configured." }, { status: 503 });
  }
  try {
    if (!(await subscriptionsNeedDispatch())) return NextResponse.json(idleDispatch);
    if (!(await claimDispatchPass())) return NextResponse.json(idleDispatch);
    const { dispatchPush } = await import("@/lib/push/dispatch");
    const result = await dispatchPush();
    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ error: "Reminders could not be sent." }, { status: 500 });
  }
}

export function GET(request: Request) { return run(request); }
export function POST(request: Request) { return run(request); }
