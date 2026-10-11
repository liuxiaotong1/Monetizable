import type { Direction, QuestCommand, QuestState } from "@/lib/quest/types";
export type RunCommand = (command: QuestCommand) => Promise<QuestState | false>;
export interface ViewProps { state: QuestState; run: RunCommand; busy: boolean; refreshData?: () => Promise<void>; navigate: (view: "today" | "events" | "learn") => void }
export const directionNames: Record<Direction,string> = { bullish: "偏多", neutral: "震荡", bearish: "偏空" };
export const categoryNames = { earnings: "热门股财报", options: "期权学习", history: "金融史", technical: "技术面", events: "数据判断" };
export function dollars(n: number) { return `$${n.toFixed(2)}`; }
export function dateLabel(date: string) { return new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric",weekday:"long",timeZone:"America/New_York"}).format(new Date(`${date}T12:00:00Z`)); }
export function dualTime(at: string) { const d=new Date(at); if(!Number.isFinite(d.getTime()))return "日期待确认"; return `${new Intl.DateTimeFormat("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"America/New_York"}).format(d)} ET / ${new Intl.DateTimeFormat("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Europe/Paris"}).format(d)} 巴黎`; }
export function SectionHeading({ index, title, subtitle, action }: { index?: string; title: string; subtitle?: string; action?: React.ReactNode }) { return <div className="section-heading"><div>{index&&<span className="section-number">{index}</span>}<h2>{title}</h2>{subtitle&&<span className="section-subtitle">{subtitle}</span>}</div>{action}</div>; }
export function SourceLink({ href, children }: { href: string; children: React.ReactNode }) { return <a className="source-link" href={href} target="_blank" rel="noreferrer">{children} ↗</a>; }

export function answeredOn(at: string | undefined, date: string) { return !!at && new Intl.DateTimeFormat("sv-SE", { timeZone: "America/New_York" }).format(new Date(at)) === date; }
