"use client";
import {LocalizeTree} from '@/components/i18n/locale-provider';
import { useEffect, useState } from "react";
import { LineChart } from "@/components/quest/charts";
import {
  BarChart3,
  Users,
  CreditCard,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
interface Dashboard {
  users: {supabaseUrl:string;hasMore:boolean;storage:string;items:{id:string;email:string;name:string;registered_at:string;last_sign_in_at?:string;last_seen_at?:string;active_today?:boolean;verified:boolean;provider:string;has_profile:boolean;subscription:string}[]};
  metrics: {
    todayVisitors: number;
    todayActive:number;
    todayDate: string;
    visitors: number;
    views: number;
    accounts: number;
    active: number;
    updatedAt: string;
    daily: { date: string; visitors: number; views: number; signups: number }[];
  };
  payments: {
    status: string;
    scope?: string;
    message?: string;
    hasMore: boolean;
    currencies: Record<string, number>;
    payments: {
      id: string;
      amount: number;
      refunded: number;
      currency: string;
      at: string;
      status: string;
      live: boolean;
      receipt?: string;
    }[];
  };
}
export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard>(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin", { cache: "no-store" }),
        d = await r.json();
      if (!r.ok) throw Error(d.error || "无法读取");
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "连接失败");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const metric = data?.metrics;
  return <LocalizeTree>{(
    <main className="admin-shell" lang="zh-CN">
      <header className="admin-top">
        <a className="brand" href="/">
          <img src="/brand/monetizable-curious-m.svg" width="38" height="38" alt="" />
          Monetizable
        </a>
        <div>
          <span className="admin-badge">
            <ShieldCheck size={15} />
            管理员专属
          </span>
          <a href="/">返回冒险 →</a>
        </div>
      </header>
      <div className="admin-title">
        <div>
          <span className="eyebrow">YOUR MISSION CONTROL</span>
          <h1>让有趣，长成一门生意。</h1>
          <p>付款、访问与增长，在一个地方看清楚。</p>
        </div>
        <button className="secondary" onClick={load} disabled={loading}>
          <RefreshCw size={16} />
          {loading ? "正在更新" : "刷新数据"}
        </button>
      </div>
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
      <section className="admin-grid">
        {[
          { label: "今日活跃账户 · 巴黎", value: metric?.todayActive, icon: Users },
          { label: "今日访客 · 巴黎", value: metric?.todayVisitors, icon: Users },
          { label: "近 30 天访客", value: metric?.visitors, icon: Users },
          { label: "近 30 天浏览量", value: metric?.views, icon: BarChart3 },
          { label: "Supabase 注册账户", value: metric?.accounts, icon: Users },
          { label: "近 7 天活跃账号", value: metric?.active, icon: Users },
        ].map((m) => (
          <article className="admin-stat" key={m.label}>
            <m.icon size={21} />
            <span>{m.label}</span>
            <strong>{m.value?.toLocaleString() ?? "—"}</strong>
          </article>
        ))}
      </section>
      <p className="muted small-text">今日活跃账户：巴黎当天有站内访问的登录账户，按账户去重；不等于匿名访客。今日访客：{metric?.todayDate || "今天"} · 巴黎 00:00 起按匿名浏览器去重，同一浏览器访问多个页面只计一次。</p>
      <section className="admin-panel admin-users">
        <div className="admin-users-heading"><div><span className="eyebrow">EXPLORER DIRECTORY</span><h2>用户信息 · Supabase</h2></div>{data?.users?.supabaseUrl&&<a className="secondary" href={data.users.supabaseUrl} target="_blank" rel="noopener noreferrer">打开 Supabase 用户管理 ↗</a>}</div>
        <p className="muted small-text">注册、登录身份保存在 Supabase Auth；学习进度、自选股、判断与订阅记录保存在同一 Supabase 项目的数据库中。名单包含尚未验证邮箱或尚未进入网站的账户；仅管理员可见。</p>
        <div className="admin-user-list">{data?.users?.items.map(user=><details key={user.id}><summary><strong data-clarity-mask="true">{user.name||user.email||'未填写邮箱'}</strong>{user.name&&<span data-clarity-mask="true">{user.email}</span>}<span>{user.active_today?'🟢 今日活跃 · ':''}{user.verified?'已验证':'待验证'} · {user.subscription==='none'?'免费':user.subscription}</span></summary><dl><dt>用户 ID</dt><dd data-clarity-mask="true">{user.id}</dd><dt>邮箱</dt><dd data-clarity-mask="true">{user.email||'—'}</dd><dt>注册时间</dt><dd>{new Date(user.registered_at).toLocaleString('zh-CN',{timeZone:'Europe/Paris'})} 巴黎</dd><dt>最近站内活动</dt><dd>{user.last_seen_at?new Date(user.last_seen_at).toLocaleString('zh-CN',{timeZone:'Europe/Paris'}):'暂无记录'}</dd><dt>Supabase</dt><dd><a href={data.users.supabaseUrl+'?search='+encodeURIComponent(user.email||user.id)} target="_blank" rel="noopener noreferrer">查询此账户 ↗</a></dd><dt>最近登录</dt><dd>{user.last_sign_in_at?new Date(user.last_sign_in_at).toLocaleString('zh-CN',{timeZone:'Europe/Paris'}):'尚未登录'}</dd><dt>登录方式</dt><dd>{user.provider}</dd><dt>网站档案</dt><dd>{user.has_profile?'已建立并同步':'尚未进入网站'}</dd></dl></details>)}</div>{data?.users?.hasMore&&<p className="muted">此处按最近活动显示 100 个账户；完整名单请打开 Supabase。</p>}
      </section>
      <section className="admin-panels">
        <article className="admin-panel">
          <span className="eyebrow">GROWTH / LAST 30 DAYS</span>
          <h2>访问增长曲线</h2>
          {metric ? (
            <LineChart
              values={metric.daily.map((d) => ({
                date: d.date,
                value: d.visitors,
              }))}
              height={210}
            />
          ) : (
            <p>等待真实数据…</p>
          )}
          <p className="muted small-text">
            站内匿名浏览器访客计数 · UTC 日界线 ·
            可能包含机器人及测试流量，不等同于 Vercel 的去重访客口径。
          </p>
        </article>
        <article className="admin-panel">
          <span className="eyebrow">NEW EXPLORERS</span>
          <h2>注册增长曲线</h2>
          {metric ? (
            <LineChart
              values={metric.daily.map((d) => ({
                date: d.date,
                value: d.signups,
              }))}
              color="#b8a5f6"
              height={210}
            />
          ) : (
            <p>等待真实数据…</p>
          )}
          <p className="muted small-text">
            按 Supabase Auth 注册日期统计，包含尚未验证邮箱的账户。
          </p>
        </article>
      </section>
      <section className="admin-panel analytics-connect">
        <div>
          <span className="eyebrow">VERCEL WEB ANALYTICS</span>
          <h2>访客来源、国家与设备</h2>
          <p>
            网站已接入 Vercel 官方
            Analytics。完整访客及浏览量报表在项目后台查看；这里的实时曲线使用独立站内统计。
          </p>
        </div>
        <a
          className="secondary"
          href="https://vercel.com/liuxiaotong1s-projects/monetizable/analytics"
          target="_blank"
          rel="noreferrer"
        >
          打开 Vercel Analytics <ArrowUpRight size={17} />
        </a>
      </section>
      <section className="admin-panel">
        <span className="eyebrow">PAYMENTS / STRIPE</span>
        <h2>
          <CreditCard size={22} /> 付款概览
        </h2>
        <p className="muted">
          {data?.payments.scope ||
            data?.payments.message ||
            "等待 Stripe 数据…"}
        </p>
        <div className="admin-revenue">
          {Object.entries(data?.payments.currencies || {}).map(
            ([currency, amount]) => (
              <div key={currency}>
                <span>{currency.toUpperCase()} · 最近交易净额</span>
                <strong>
                  {new Intl.NumberFormat("zh-CN", {
                    style: "currency",
                    currency,
                  }).format(amount)}
                </strong>
              </div>
            ),
          )}
        </div>
        {data?.payments.status === "ready" &&
          !data.payments.payments.length && (
            <p>暂未取得付款记录。没有用模拟数据代替真实收入。</p>
          )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>交易时间</th>
                <th>金额</th>
                <th>退款</th>
                <th>状态</th>
                <th>环境</th>
                <th>凭证</th>
              </tr>
            </thead>
            <tbody>
              {data?.payments.payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    {new Date(p.at).toLocaleString("zh-CN", {
                      timeZone: "Europe/Paris",
                    })}
                  </td>
                  <td>
                    {p.currency} {p.amount.toFixed(2)}
                  </td>
                  <td>{p.refunded.toFixed(2)}</td>
                  <td>
                    {(
                      {
                        succeeded: "成功",
                        failed: "失败",
                        pending: "处理中",
                      } as Record<string, string>
                    )[p.status] || "待确认"}
                  </td>
                  <td>{p.live ? "真实" : "测试"}</td>
                  <td>
                    {p.receipt ? (
                      <a href={p.receipt} target="_blank" rel="noreferrer">
                        收据 ↗
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.payments.hasMore && (
          <p className="muted">
            当前仅展示最近 100 笔；完整记录请查看 Stripe。
          </p>
        )}
        <a
          className="source-link"
          href="https://dashboard.stripe.com/payments"
          target="_blank"
          rel="noreferrer"
        >
          打开 Stripe 完整记录 ↗
        </a>
      </section>
      <footer className="muted small-text">
        只读管理后台 · 仅已验证的 liuxiaotong268@gmail.com 可访问 ·{" "}
        {metric
          ? `更新于 ${new Date(metric.updatedAt).toLocaleString("zh-CN")}`
          : "正在连接"}
      </footer>
    </main>
  )}</LocalizeTree>;
}
