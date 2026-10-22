"use client";
import {LocalizeTree} from '@/components/i18n/locale-provider';
import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import type { QuestState, Review } from "@/lib/quest/types";
import { weeklyTracking } from "@/lib/quest/weekly-tracking";
import { directionNames, dualTime } from "./shared";
const labels={correct:"方向命中",incorrect:"方向未中",pending:"待核对",unscored:"不计评分",missing:"未记录",upcoming:"未开始",open:"待判断",holiday:"休市"};
const confidence={low:"低",medium:"中",high:"高"};
export default function WeeklyTracking({state,onReview}:{state:QuestState;onReview:(review:Review)=>void}){
 const [selected,setSelected]=useState<string>();
 const weeks=state.trackingWeeks||weeklyTracking(state,state.judgment?[state.judgment]:[]);
 const index=Math.max(0,weeks.findIndex(w=>w.start===selected)),week=weeks[index];
 if(!week)return null;
 return <LocalizeTree>{<section className="panel weekly-tracking" aria-label="每周判断追踪"><div className="panel-top"><span className="eyebrow">JUDGMENT JOURNAL</span><CalendarDays size={18}/></div><h3>每周判断追踪</h3><div className="tracking-nav"><button aria-label="查看上一周判断" disabled={index>=weeks.length-1} onClick={()=>setSelected(weeks[index+1].start)}><ChevronLeft size={18}/></button><strong>{week.start.slice(5)} — {week.end.slice(5)}<small>{week.start.slice(0,4)} · 美东交易周{state.mode==="demo"?" · 示例":""}</small></strong><button aria-label="查看下一周判断" disabled={index===0} onClick={()=>setSelected(weeks[index-1].start)}><ChevronRight size={18}/></button></div>{index>0&&<button className="text-button" onClick={()=>setSelected(undefined)}>返回本周</button>}
 <div className="tracking-metrics"><div><strong>{week.recorded}</strong><span>已记录</span></div><div><strong>{week.correct}</strong><span>方向命中 · {week.scored} 次已核对</span></div><div><strong>{week.completed}</strong><span>已复盘</span></div></div>
 <div className="tracking-days">{week.days.map((day,i)=><details key={day.date} className={`tracking-day ${day.status}`}><summary><span className="tracking-day-label">周{["一","二","三","四","五"][i]}<small>{day.date.slice(5)}</small></span><strong>{day.judgment?directionNames[day.judgment.direction]:"—"}</strong><span className="tracking-status">{labels[day.status]}</span></summary><div className="tracking-detail">{day.judgment?<><p><b>原始理由</b>{day.judgment.reason}</p><small>{confidence[day.judgment.confidence]}信心 · {dualTime(day.judgment.lockedAt)} 封存</small></>:<p>{day.status==="holiday"?"美股休市，不纳入判断统计。":day.status==="missing"?"没有封存记录，不计为判断错误。":day.status==="upcoming"?"此交易日尚未开始。":"可在上方填写今日盘前判断。"}</p>}{day.review?<><p><b>实际结果</b>{directionNames[day.review.actualDirection]} · {day.review.returnPct>0?"+":""}{day.review.returnPct.toFixed(2)}% · 收盘 ${day.review.actual.close.toFixed(2)}</p><p>区间{day.review.rangeCovered?"覆盖":"未完全覆盖"} · {day.review.completedAt?"复盘已完成":"待写复盘教训"}</p>{day.review.lesson&&<p><b>你的教训</b>{day.review.lesson}</p>}<button className="text-button" onClick={()=>onReview(day.review!)}>查看战报与笔记 <ChevronRight size={14}/></button></>:day.judgment&&<p>收盘数据确认后自动核对，原始判断保持封存。</p>}</div></details>)}</div>
 <div className="tracking-summary"><h4>{index===0?"本周动态总结":"本周总结"}</h4><p>{week.summary}</p>{!!week.keywords.length&&<><small>理由关键词 · 按出现天数统计</small><div className="tracking-keywords">{week.keywords.map(k=><span key={k.label}>{k.label} ×{k.count}</span>)}</div></>}<small>准确率统一在上方按月统计；这里保留每周的判断与复盘记录。关键词只整理原文，不判断涨跌原因。</small></div>
 </section>}</LocalizeTree>;
}
