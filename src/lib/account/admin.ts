import "server-only";
import { database } from "./db";
export async function adminMetrics() {
  const [daily, totals, profiles] = await Promise.all([
    database().query(
      "SELECT d::date::text AS date,COALESCE(v.visitors,0)::int AS visitors,COALESCE(v.views,0)::int AS views,COALESCE(p.signups,0)::int AS signups FROM generate_series(current_date-29,current_date,interval '1 day') d LEFT JOIN (SELECT day,count(DISTINCT visitor) visitors,sum(views) views FROM quest_visits GROUP BY day) v ON v.day=d::date LEFT JOIN (SELECT joined_at::date AS day,count(*) signups FROM quest_profiles GROUP BY day) p ON p.day=d::date ORDER BY d",
    ),
    database().query(
      "SELECT count(DISTINCT visitor)::int visitors,COALESCE(sum(views),0)::int views FROM quest_visits WHERE day>=current_date-29",
    ),
    database().query(
      "SELECT count(*)::int accounts,count(*) FILTER(WHERE last_seen_at>now()-interval'7 days')::int active FROM quest_profiles",
    ),
  ]);
  return {
    daily: daily.rows,
    ...totals.rows[0],
    ...profiles.rows[0],
    timezone: "UTC",
    updatedAt: new Date().toISOString(),
  };
}
export async function paymentMetrics() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key)
    return {
      status: "unavailable",
      message: "未连接 Stripe",
      payments: [],
      currencies: {},
      hasMore: false,
    };
  try {
    const response = await fetch(
      "https://api.stripe.com/v1/charges?limit=100",
      {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw Error();
    const value = await response.json();
    const currencies: Record<string, number> = {};
    for (const charge of value.data)
      if (charge.paid && charge.status === "succeeded")
        currencies[charge.currency] =
          (currencies[charge.currency] || 0) +
          (charge.amount - charge.amount_refunded) / 100;
    return {
      status: "ready",
      scope:
        "Stripe 账户最近 100 笔交易，含旧 Monetizable；尚未配置 QQQ Quest 收费产品",
      hasMore: !!value.has_more,
      currencies,
      payments: value.data.map(
        (c: {
          id: string;
          amount: number;
          amount_refunded: number;
          currency: string;
          created: number;
          status: string;
          paid: boolean;
          livemode: boolean;
          receipt_url?: string;
        }) => ({
          id: c.id,
          amount: c.amount / 100,
          refunded: c.amount_refunded / 100,
          currency: c.currency.toUpperCase(),
          at: new Date(c.created * 1000).toISOString(),
          status: c.status,
          paid: c.paid,
          live: c.livemode,
          receipt: c.receipt_url,
        }),
      ),
    };
  } catch {
    return {
      status: "unavailable",
      message: "Stripe 暂时无法读取；未显示模拟收入",
      payments: [],
      currencies: {},
      hasMore: false,
    };
  }
}
