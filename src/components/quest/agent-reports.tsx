"use client";
import {PremiumGate,useBilling} from "../account/billing-access";
import {useEffect,useState, type ReactNode} from "react";
import {ChevronRight} from "lucide-react";
import type {AgentReport} from "@/lib/quest/agent-report";
import {dualTime} from "./shared";
import "./agent-reports.css";

const displayText=(text:string)=>text.replace(/trading[ -]?agent/gi,"盘前情报");
function safeLink(value:string) {try {const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password?url.href:undefined;}catch{return undefined;}}
function inline(text:string):ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^\s)]+\))/g).map((part,i)=>{
    if(part.startsWith("**")&&part.endsWith("**")) return <strong key={i}>{part.slice(2,-2)}</strong>;
    const link=part.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/); const href=link&&safeLink(link[2]);
    return href?<a key={i} href={href} target="_blank" rel="noopener noreferrer">{link![1]}</a>:part;
  });
}
// Render a small Markdown subset with React text escaping, never report HTML.
export function ReportBody({body}:{body:string}) {
  const lines=displayText(body).replace(/<heartbeat>[\s\S]*?<\/heartbeat>/g,"").split("\n"),blocks:ReactNode[]=[];
  for(let i=0;i<lines.length;i++) {
    const line=lines[i].trim(); if(!line)continue;
    if(line.startsWith("|")&&/^\|?\s*:?-{3,}/.test(lines[i+1]?.trim()||"")) {
      const cells=(value:string)=>value.replace(/^\||\|$/g,"").split("|").map(v=>v.trim());
      const head=cells(line),rows:string[][]=[];i++;
      while(lines[i+1]?.trim().startsWith("|")) rows.push(cells(lines[++i].trim()));
      blocks.push(<div className="agent-table" key={i}><table><thead><tr>{head.map((cell,j)=><th key={j}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row,j)=><tr key={j}>{row.map((cell,k)=><td key={k}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>);
    }else if(/^#{1,4}\s/.test(line))blocks.push(<h4 key={i}>{inline(line.replace(/^#{1,4}\s/,""))}</h4>);
    else if(/^[-*]\s/.test(line)||/^\d+\.\s/.test(line))blocks.push(<p className="agent-bullet" key={i}>{inline(line)}</p>);
    else blocks.push(<p key={i}>{inline(line)}</p>);
  }
  return <div className="agent-report-body">{blocks}</div>;
}
type ReportsResponse={reports:AgentReport[];schedule:{date:string;weekStart:string};dailyStatus?:string};
export default function AgentReports({demo,now}:{demo:boolean;now:string}) {
  const {access}=useBilling();
  const [data,setData]=useState<ReportsResponse>(),[error,setError]=useState(false);
  useEffect(()=>{
    if(demo)return;
    let live=true;const abort=new AbortController();
    const refresh=async()=>{try {const r=await fetch("/api/agent-reports",{cache:"no-store",signal:abort.signal});if(!r.ok)throw new Error();const value=await r.json() as ReportsResponse;if(!Array.isArray(value.reports)||!value.schedule?.date)throw new Error();if(live){setData(value);setError(false);}}catch{if(live)setError(true);}};
    void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},60000);
    window.addEventListener("focus",refresh);
    return()=>{live=false;abort.abort();clearInterval(timer);window.removeEventListener("focus",refresh);};
  },[demo,access.premium]);
  if(demo)return null;
  const weekly=data?.reports.find(r=>r.kind==="weekly"),daily=data?.reports.find(r=>r.kind==="daily");
  const isSunday=new Intl.DateTimeFormat("en-US",{timeZone:"Europe/Paris",weekday:"short"}).format(new Date(now))==="Sun";
  return <section className="agent-hub" aria-label="交易情报与一周前瞻">
    <div className="agent-hub-heading"><div><span className="eyebrow">TRADING DESK</span><h2>{isSunday?"🔮 下一周的冒险，从这里开始":"☀️ 盘前补给，准备出发"}</h2></div><span className="badge purple">巴黎时间</span></div>
    <div className="agent-report-grid">{([{kind:"weekly",report:weekly,title:"一周前瞻",icon:<span aria-hidden="true">🔮 🗺️</span>,time:"周日 19:00",fresh:weekly?.weekStart===data?.schedule.weekStart},{kind:"daily",report:daily,title:"盘前快报",icon:<span aria-hidden="true">☀️ 🎮</span>,time:"周一至周五 14:15",fresh:daily?.date===data?.schedule.date}] as const).toSorted((a,b)=>a.kind===b.kind?0:a.kind===(isSunday?"weekly":"daily")?-1:1).map(item=><div key={item.kind}>{item.kind==="daily"&&!access.premium?<PremiumGate locale="zh"><h3>☀️ 盘前快报</h3><p>行情快照 · 事件窗口 · 条件与风险 · 来源</p></PremiumGate>:<article className="panel agent-report-card" key={item.kind}>
      <div className="panel-top"><span className="brief-emoji">{item.icon}</span><span className={`badge ${item.report?item.fresh?"green":"gold":"purple"}`}>{item.report?item.fresh?"本期报告":"最近一期 · 非今日":"等待首份报告"}</span></div>
      {item.kind==="daily"&&data?.dailyStatus==="missed"&&<p className="billing-error" role="status">今日盘前未发布，当前保留历史原报告；不把开盘后的行情补写为盘前。</p>}
      <h3>{item.title}</h3><p className="agent-cadence">{item.time} · Europe/Paris</p>
      {item.report?<><p className="agent-report-summary">{displayText(item.report.summary)}</p><p className="data-caption">{item.report.date}{item.report.weekStart?` · 展望 ${item.report.weekStart} 起的一周`:""} · v{item.report.version}<br/>生成 {dualTime(item.report.generatedAt)} · {item.report.origin==="cloud-backup"?"云端补充报告":item.report.origin==="trading-agent"?"盘前原报告":"周度冒险情报"}{item.report.status==="partial"?" · 部分资料待核实":""}</p><details><summary>展开完整报告 <ChevronRight size={14}/></summary><h4>{displayText(item.report.title)}</h4><ReportBody body={item.report.body}/><div className="agent-sources">{item.report.sources.map(source=><a href={source.url} target="_blank" rel="noopener noreferrer" key={source.url}>{source.title} ↗</a>)}</div></details></>:<p className="muted">{error?"暂时无法读取，稍后自动重试。已有报告会继续保留。":item.kind==="weekly"?"周日晚上整理下周重大数据、财报、周末风险，以及 QQQ 的确认与失效条件。":"同步盘前机会 Highlight、跨资产快照、风险时间、情景与来源。"}</p>}
    </article>}</div>)}</div>
    <p className="data-caption">周一至周五正常更新；周日准备下一周。14:15 是启动时间，报告完成后同步；独立云端任务生成数据准备版，完整原报告完成后替换。休市日注明休市，巴黎与美东时差按当天换算。</p>
    {!!data?.reports.length&&<details className="agent-archive"><summary>查看最近报告记录</summary>{data.reports.filter(report=>report.kind!=="daily"||access.premium).slice(0,10).map(report=><details key={`${report.kind}:${report.date}`}><summary>{report.date} · {report.kind==="weekly"?"一周前瞻":"盘前快报"} · v{report.version}</summary><ReportBody body={report.body}/></details>)}</details>}
  </section>;
}
