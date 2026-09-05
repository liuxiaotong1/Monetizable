import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export async function POST() {
  const user = await currentUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in is required" }, { status: 401 });
  return NextResponse.json({ error: "Review and approve each visible email draft separately" }, { status: 405 });
}
