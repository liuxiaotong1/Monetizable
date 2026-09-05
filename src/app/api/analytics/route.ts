import { NextResponse } from "next/server";
import { trackServer } from "@/lib/analytics";

export async function POST(request: Request) {
  const { event, properties } = await request.json();
  await trackServer(event, properties);
  return NextResponse.json({ ok: true });
}
