import { z } from "zod";
import { marketDate, nyTimeToUtc, sessionFor, type CalendarOverride } from "./domain";
import type { Notice, Session } from "./types";

const date = z.iso.date();
const text = z.string().trim().min(1);
const publicSource = z.url().refine(value => {
  const url = new URL(value);
  const roots = ["google.com", "finance.yahoo.com", "nasdaq.com", "invesco.com", "bls.gov", "bea.gov", "federalreserve.gov", "fred.stlouisfed.org"];
  return url.protocol === "https:" && !url.username && !url.password && !url.port && roots.some(root => url.hostname === root || url.hostname.endsWith(`.${root}`));
}, "请使用已支持的公开行情或官方来源");
export const marketBriefSchema = z.object({
  date, status: z.enum(["verified", "partial", "unavailable"]), dataAsOf: z.iso.datetime({ offset: true }),
  summary: text.max(900), watchPoints: z.array(text.max(240)).max(3),
  sources: z.array(z.object({ title: text.max(100), url: publicSource }).strict()).min(1).max(8),
  quote: z.object({ date, close: z.number().finite().positive(), changePct: z.number().finite().min(-100).max(100).optional(), high: z.number().finite().positive().optional(), low: z.number().finite().positive().optional(), sourceUrl: publicSource }).strict().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.status === "verified" && !value.quote) ctx.addIssue({ code: "custom", message: "已核对状态需要上一交易日收盘", path: ["quote"] });
  if (value.status === "unavailable" && value.quote) ctx.addIssue({ code: "custom", message: "缺失状态不能提供价格", path: ["quote"] });
  if (new Set(value.sources.map(source => source.url)).size !== value.sources.length) ctx.addIssue({ code: "custom", message: "来源不能重复", path: ["sources"] });
  if (value.quote) {
    const quote = value.quote;
    if (!value.sources.some(source => source.url === quote.sourceUrl)) ctx.addIssue({ code: "custom", message: "收盘价需要对应的来源", path: ["quote", "sourceUrl"] });
    if ((quote.high === undefined) !== (quote.low === undefined) || quote.high !== undefined && quote.low !== undefined && (quote.high < quote.low || quote.close < quote.low || quote.close > quote.high)) ctx.addIssue({ code: "custom", message: "高低区间无效", path: ["quote"] });
  }
});
export type MarketBriefInput = z.infer<typeof marketBriefSchema>;
export interface MarketBrief extends MarketBriefInput { savedAt: string; version: number; digest: string }

export function validateBriefSession(brief: MarketBriefInput, session: Session, now: Date, overrides: CalendarOverride[] = []) {
  if (brief.date !== session.date) throw new Error("摘要日期必须是当前美东日期");
  if (Date.parse(brief.dataAsOf) > now.getTime() + 60_000) throw new Error("资料时间不能来自未来");
  if (brief.quote && (brief.quote.date !== session.previousDate || marketDate(new Date(brief.dataAsOf)) < brief.quote.date)) throw new Error("收盘价必须属于上一交易日");
  if (brief.quote) {
    const previousSession = sessionFor(new Date(nyTimeToUtc(session.previousDate, "12:00")), overrides);
    if (Date.parse(brief.dataAsOf) < Date.parse(previousSession.closeAt)) throw new Error("资料取得时间不能早于上一交易日收盘");
  }
}

export function dailyBriefNotice(brief: MarketBrief | undefined, session: Session, now: Date): Notice | undefined {
  if (!brief || brief.status === "unavailable" || brief.date !== session.date || !session.isTradingDay || now.toISOString() < nyTimeToUtc(session.date, "08:00") || now.toISOString() >= session.openAt) return;
  const quote = brief.quote;
  return { id: `daily:${session.date}`, title: "纳斯达克100 ETF · 今日行情早报", body: `${quote ? `${quote.date} 收盘 $${quote.close.toFixed(2)}。` : "部分行情待确认。"}${brief.summary}`.slice(0, 180), at: now.toISOString(), read: false, href: "/?view=today" };
}
