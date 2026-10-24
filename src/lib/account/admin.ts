import "server-only";
import { database } from "./db";
import { stripeAmount } from "./money";
export async function adminMetrics() {
  const [daily, totals, profiles, today] = await Promise.all([
    database().query(
      "SELECT d::date::text AS date,COALESCE(v.visitors,0)::int AS visitors,COALESCE(v.views,0)::int AS views,COALESCE(p.signups,0)::int AS signups FROM generate_series(current_date-29,current_date,interval '1 day') d LEFT JOIN (SELECT day,count(DISTINCT visitor) visitors,sum(views) views FROM quest_visits GROUP BY day) v ON v.day=d::date LEFT JOIN (SELECT created_at::date AS day,count(*) signups FROM auth.users GROUP BY day) p ON p.day=d::date ORDER BY d",
    ),
    database().query(
      "SELECT count(DISTINCT visitor)::int visitors,COALESCE(sum(views),0)::int views FROM quest_visits WHERE day>=current_date-29",
    ),
    database().query(
      "SELECT count(*) FILTER(WHERE p.last_seen_at>=((now() AT TIME ZONE 'Europe/Paris')::date::timestamp AT TIME ZONE 'Europe/Paris'))::int today_active,count(*)::int accounts,count(*) FILTER(WHERE p.last_seen_at>now()-interval'7 days')::int active FROM auth.users u LEFT JOIN quest_profiles p ON p.user_id=u.id",
    ),
    database().query(
      "SELECT count(DISTINCT visitor)::int AS today_visitors,(now() AT TIME ZONE 'Europe/Paris')::date::text AS today_date FROM quest_visits WHERE last_at>=((now() AT TIME ZONE 'Europe/Paris')::date::timestamp AT TIME ZONE 'Europe/Paris') AND last_at<(((now() AT TIME ZONE 'Europe/Paris')::date+1)::timestamp AT TIME ZONE 'Europe/Paris')",
    ),
  ]);
  return {
    daily: daily.rows,
    ...totals.rows[0],
    ...profiles.rows[0],
    todayVisitors: today.rows[0].today_visitors,
    todayActive: profiles.rows[0].today_active,
    todayDate: today.rows[0].today_date,
    todayTimezone: "Europe/Paris",
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
    if (!response.ok) {
      const reason = response.status === 403 ? 'permission_denied' : response.status === 401 ? 'authentication_failed' : response.status === 429 ? 'rate_limited' : 'stripe_api_error';
      return {
        status: 'unavailable', reason, httpStatus: response.status,
        message: response.status === 403 ? 'Stripe 拒绝读取交易（403）：请检查生产 API key 的 Charges 读取权限；未将失败计为零收入。' : response.status === 401 ? 'Stripe 身份验证失败（401）：请检查生产环境密钥配置；未将失败计为零收入。' : `Stripe 交易读取失败（HTTP ${response.status}）；未将失败计为零收入。`,
        payments: [], currencies: {}, hasMore: false,
      };
    }
    const value = await response.json();
    const currencies: Record<string, number> = {};
    for (const charge of value.data)
      if (charge.paid && charge.status === "succeeded")
        currencies[charge.currency] =
          (currencies[charge.currency] || 0) +
          stripeAmount(charge.amount - charge.amount_refunded, charge.currency);
    return {
      status: "ready",
      scope:
        "Stripe 账户最近 100 笔交易，可能包含历史交易；按币种分别展示",
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
          amount: stripeAmount(c.amount, c.currency),
          refunded: stripeAmount(c.amount_refunded, c.currency),
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

/** Only returned by the administrator-protected endpoint. No secrets or arbitrary metadata. */
export async function adminUsers(){
 const {rows}=await database().query(`SELECT u.id,u.email,left(COALESCE(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',''),100) AS name,u.created_at AS registered_at,u.last_sign_in_at,u.email_confirmed_at IS NOT NULL AS verified,COALESCE(u.raw_app_meta_data->>'provider','email') AS provider,p.last_seen_at,(p.last_seen_at>=((now() AT TIME ZONE 'Europe/Paris')::date::timestamp AT TIME ZONE 'Europe/Paris')) AS active_today,p.user_id IS NOT NULL AS has_profile,COALESCE(s.status,'none') AS subscription FROM auth.users u LEFT JOIN quest_profiles p ON p.user_id=u.id LEFT JOIN quest_subscriptions s ON s.user_id=u.id ORDER BY p.last_seen_at DESC NULLS LAST,u.created_at DESC LIMIT 101`);
 const ref=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
 return {items:rows.slice(0,100),hasMore:rows.length>100,supabaseUrl:`https://supabase.com/dashboard/project/${encodeURIComponent(ref)}/auth/users`,storage:'Supabase Auth + Postgres'};
}
