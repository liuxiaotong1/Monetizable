import { NextResponse } from "next/server";
import { database } from "@/lib/account/db";
import { ensureWebPushStore } from "@/lib/push/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function nyClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}
function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
function nthWeekday(year: number, month: number, weekday: number, nth: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  return new Date(Date.UTC(year, month - 1, 1 + ((weekday - first.getUTCDay() + 7) % 7) + (nth - 1) * 7));
}
function lastWeekday(year: number, month: number, weekday: number) {
  const last = new Date(Date.UTC(year, month, 0));
  return new Date(Date.UTC(year, month - 1, last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7)));
}
function observed(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() - 1);
  if (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  return isoDate(date);
}
function easterSunday(year: number) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}
function marketHolidays(year: number) {
  const holidays = new Set<string>();
  for (const y of [year - 1, year, year + 1]) {
    holidays.add(observed(y, 1, 1));
    holidays.add(nthWeekday(y, 1, 1, 3).toISOString().slice(0, 10));
    holidays.add(nthWeekday(y, 2, 1, 3).toISOString().slice(0, 10));
    const goodFriday = easterSunday(y);
    goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
    holidays.add(isoDate(goodFriday));
    holidays.add(lastWeekday(y, 5, 1).toISOString().slice(0, 10));
    holidays.add(observed(y, 6, 19));
    holidays.add(observed(y, 7, 4));
    holidays.add(nthWeekday(y, 9, 1, 1).toISOString().slice(0, 10));
    holidays.add(nthWeekday(y, 11, 4, 4).toISOString().slice(0, 10));
    holidays.add(observed(y, 12, 25));
  }
  return holidays;
}
function isMarketDay(date: string, weekday: string) {
  if (weekday === "Sat" || weekday === "Sun") return false;
  return !marketHolidays(Number(date.slice(0, 4))).has(date);
}
const messages = {
  en: { title: "Your market quest is ready", body: "The Nasdaq session opens in one hour. Check QQQ, review today's events, and lock in your plan." },
  fr: { title: "Votre quête des marchés est prête", body: "La séance Nasdaq ouvre dans une heure. Consultez QQQ, les événements du jour et votre plan." },
  zh: { title: "盘前冒险时间到了", body: "距离纳斯达克开盘还有一小时。查看 QQQ 和今日事件，封存你的判断。" }
};

export async function POST(request: Request) {
  const supplied = request.headers.get("authorization");
  const allowed = [process.env.QUEST_REPORT_TOKEN, process.env.CRON_SECRET].filter(Boolean).some((secret) => supplied === "Bearer " + secret);
  if (!allowed) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const now = new Date();
  const clock = nyClock(now);
  const date = clock.year + "-" + clock.month + "-" + clock.day;
  const hour = Number(clock.hour);
  const minute = Number(clock.minute);
  if (hour !== 8 || minute < 30 || minute > 39) {
    return NextResponse.json({ ok: true, status: "outside-reminder-window" });
  }
  if (!isMarketDay(date, clock.weekday)) {
    return NextResponse.json({ ok: true, status: "market-closed" });
  }
  const vapidPublicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "Push signing is not configured." }, { status: 503 });
  }

  try {
    await ensureWebPushStore();
    const { rows } = await database().query(
      "SELECT id, endpoint, p256dh, auth, locale FROM public.web_push_subscriptions WHERE last_sent_on IS DISTINCT FROM $1::date AND last_attempt_on IS DISTINCT FROM $1::date ORDER BY id LIMIT 500",
      [date]
    );
    // @ts-ignore web-push is installed as a server runtime dependency.
    const loaded = await import("web-push");
    const webpush = (loaded.default ?? loaded) as {
      setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
      sendNotification: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string, options: { TTL: number }) => Promise<unknown>;
    };
    webpush.setVapidDetails(
      process.env.WEB_PUSH_VAPID_SUBJECT || "https://getmonetizable.com",
      vapidPublicKey,
      vapidPrivateKey
    );
    let sent = 0, expired = 0, failed = 0;
    for (const row of rows) {
      const claim = await database().query(
        "UPDATE public.web_push_subscriptions SET last_attempt_on = $2::date WHERE id = $1 AND last_sent_on IS DISTINCT FROM $2::date AND last_attempt_on IS DISTINCT FROM $2::date RETURNING id",
        [row.id, date]
      );
      if (!claim.rows.length) continue;
      const locale: keyof typeof messages = row.locale === "fr" ? "fr" : row.locale === "zh" ? "zh" : "en";
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify({ ...messages[locale], href: "/?view=today", id: "premarket-" + date }),
          { TTL: 3600 }
        );
        await database().query("UPDATE public.web_push_subscriptions SET last_sent_on = $2::date WHERE id = $1", [row.id, date]);
        sent += 1;
      } catch (error) {
        const status = Number((error as { statusCode?: number })?.statusCode || 0);
        if (status === 404 || status === 410) {
          await database().query("DELETE FROM public.web_push_subscriptions WHERE id = $1", [row.id]);
          expired += 1;
        } else {
          await database().query("UPDATE public.web_push_subscriptions SET last_attempt_on = NULL WHERE id = $1 AND last_sent_on IS DISTINCT FROM $2::date", [row.id, date]);
          failed += 1;
        }
      }
    }
    return NextResponse.json({ ok: true, status: "sent", sent, expired, failed });
  } catch {
    return NextResponse.json({ error: "The pre-market reminder could not be sent." }, { status: 500 });
  }
}
