import { NextResponse } from "next/server";
import { administrator } from "@/lib/account/auth";
import { adminMetrics, paymentMetrics } from "@/lib/account/admin";
export async function GET() {
  if (!(await administrator()))
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  try {
    const [metrics, payments] = await Promise.all([
      adminMetrics(),
      paymentMetrics(),
    ]);
    return NextResponse.json(
      { metrics, payments },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "管理数据暂时不可用" },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
