import { z } from "zod";
import { sessionFor } from "./domain";

export const publicReportUrl = z.url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.port && !/^(localhost|127\.|10\.|192\.168\.|\[)/.test(url.hostname);
}, "请使用公开 HTTPS 来源");
export const agentReportSchema = z.object({
  kind: z.enum(["daily", "weekly"]), date: z.iso.date(), generatedAt: z.iso.datetime({offset:true}),
  title: z.string().trim().min(1).max(140), summary: z.string().trim().min(1).max(1000),
  body: z.string().trim().min(40).max(60000),
  status: z.enum(["ready", "partial"]), origin: z.enum(["trading-agent", "cloud-backup", "weekly-quest", "cloud-scheduler"]),
  sources: z.array(z.object({title:z.string().trim().min(1).max(140),url:publicReportUrl}).strict()).min(1).max(40),
}).strict();
export type AgentReportInput = z.infer<typeof agentReportSchema>;
export interface AgentReport extends AgentReportInput {version:number;savedAt:string;digest:string;weekStart?:string}
export function parisDate(now:Date) { return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).format(now); }
export function nextMonday(date:string) {
  const day = new Date(`${date}T12:00:00Z`), delta = (8-day.getUTCDay())%7 || 7;
  day.setUTCDate(day.getUTCDate()+delta); return day.toISOString().slice(0,10);
}
export function reportWeekStart(date:string) {
  const day = new Date(`${date}T12:00:00Z`);
  if (day.getUTCDay()===0) return nextMonday(date);
  day.setUTCDate(day.getUTCDate()-((day.getUTCDay()+6)%7)); return day.toISOString().slice(0,10);
}
export function isPremarketReport(input:Pick<AgentReportInput,"kind"|"generatedAt">) {
 if(input.kind!=="daily")return true;
 const generated=new Date(input.generatedAt);
 return Number.isFinite(generated.getTime()) && generated.getTime()<Date.parse(sessionFor(generated).openAt);
}
export function validateAgentReport(input:AgentReportInput,now:Date) {
  const generated = new Date(input.generatedAt);
  if (generated.getTime()>now.getTime()+60000) throw new Error("报告时间不能来自未来");
  if (parisDate(generated)!==input.date) throw new Error("报告日期必须与巴黎生成日期一致");
  if (now.getTime()-generated.getTime()>31*86400000) throw new Error("仅接受最近 31 天的报告");
  if(!isPremarketReport(input))throw new Error("盘前快报必须在美股开盘前完成；不接收盘中版，请保留实际生成时间");
  const weekday = new Date(`${input.date}T12:00:00Z`).getUTCDay();
  if (input.kind==="daily" && (weekday===0||weekday===6)) throw new Error("盘前报告仅对应周一至周五");
  if (input.kind==="weekly" && weekday!==0) throw new Error("每周前瞻对应周日");
  if (input.kind==="weekly" && !["weekly-quest","cloud-scheduler"].includes(input.origin)) throw new Error("前瞻来源类型不符");
  if (input.kind==="daily" && input.origin==="weekly-quest") throw new Error("日报来源类型不符");
}
// The original Trading Agent report takes precedence over the unattended fallback.
export function mayReplaceReport(previous:AgentReport|undefined,input:AgentReportInput) {
  if (!previous) return true;
  const primary=(origin:string)=>origin==="trading-agent"||origin==="cloud-scheduler";
  if (primary(previous.origin)&&!primary(input.origin)) return false;
  if (!primary(previous.origin)&&primary(input.origin)) return true;
  return Date.parse(input.generatedAt)>=Date.parse(previous.generatedAt);
}
export function reportScheduleContext(now:Date) {
  const date=parisDate(now);
  return {date,weekStart:reportWeekStart(date),timezone:"Europe/Paris",dailyTime:"14:15",backupTime:"14:35",weeklyTime:"周日 19:00"};
}
