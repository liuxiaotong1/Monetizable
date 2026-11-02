import {database} from "@/lib/account/db";
import { NextResponse } from "next/server";
import { administrator } from "@/lib/account/auth";
import { adminMetrics, paymentMetrics, adminUsers } from "@/lib/account/admin";
export async function GET(request:Request) {
  if (!(await administrator()))
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  try {
    if(new URL(request.url).searchParams.get('check')==='closing-review'){
      const [health,schedule]=await Promise.all([
        database().query("SELECT body,updated_at FROM quest_shared_data WHERE key='closing-review-health'"),
        database().query("SELECT active,schedule FROM cron.job WHERE jobname='monetizable-after-close'")
      ]);
      return NextResponse.json({health:health.rows[0]||null,schedule:schedule.rows[0]||null},{headers:{"Cache-Control":"private,no-store"}});
    }
    const [metrics, payments, users] = await Promise.all([
      adminMetrics(),
      paymentMetrics(),
      adminUsers(),
    ]);
    return NextResponse.json(
      { metrics, payments, users },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "管理数据暂时不可用" },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
