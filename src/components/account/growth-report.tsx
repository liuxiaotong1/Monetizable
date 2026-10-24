'use client';
import {useEffect,useState} from 'react';
type Report={status:string;rows?:{source:string;event:string;people:number;events:number}[];limitations?:string[]};
const stages=[['visit','访问'],['try_start','主动试玩'],['practice_completed','完成真实练习'],['signup_start','注册/登录入口'],['signup_verified','新注册已验证'],['checkout_started','打开结账'],['trial_started','免费试用'],['paid','首次实际付款']];
export default function GrowthReport(){
  const [report,setReport]=useState<Report>();
  useEffect(()=>{let live=true;fetch('/api/growth',{cache:'no-store'}).then(async r=>r.ok?r.json():{status:'unavailable'}).then(d=>{if(live)setReport(d)}).catch(()=>{if(live)setReport({status:'unavailable'})});return()=>{live=false}},[]);
  const sources=[...new Set(report?.rows?.map(row=>row.source)||[])];
  return <section className="admin-panel" lang="zh-CN"><h2>AI 搜索来源 → 试玩 → 注册 → 付费</h2><p>最近 30 天 · 首次可观察来源归因 · 仅统计已同意分析的用户 · 管理员、本机标记与测试账号排除。</p>
    {!report?<p>正在读取…</p>:report.status!=='ready'?<p>unavailable：暂时无法读取真实漏斗数据。</p>:!sources.length?<p>追踪已接通，尚无符合条件的记录。历史流量未回填。</p>:<div style={{overflowX:'auto'}}><table><thead><tr><th>来源</th>{stages.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead><tbody>{sources.map(source=><tr key={source}><th>{source}</th>{stages.map(([key])=><td key={key}>{report.rows?.find(row=>row.source===source&&row.event===key)?.people||0}</td>)}</tr>)}</tbody></table></div>}
    <p>试玩点击属于浏览器报告；完成练习、验证注册与付款由服务器记录。自动演示不计试玩。免费试用与 0 元账单不计付费。direct_unknown 表示来源缺失，不推断成 AI。来源标签也不等于 AI 推荐或曝光。</p>
  </section>;
}
