'use client';
import {useLocale} from '@/components/i18n/locale-provider';
import {eventWeek} from '@/lib/quest/event-view';
import {marketDate} from '@/lib/quest/domain';
import {earningsTimingLabel,majorEarningsSymbols} from '@/lib/quest/earnings-calendar';
import type {MarketEvent} from '@/lib/quest/types';
export default function EarningsWatch({events,now,today=false}:{events:MarketEvent[];now:string;today?:boolean}){
 const locale=useLocale(),week=eventWeek(now),date=marketDate(new Date(now));
 const items=events.filter(e=>e.kind==='EARNINGS'&&e.symbol&&majorEarningsSymbols.has(e.symbol)&&e.status!=='unconfirmed'&&(today?marketDate(new Date(e.at))===date:marketDate(new Date(e.at))>=week.start&&marketDate(new Date(e.at))<week.end)).sort((a,b)=>a.at.localeCompare(b.at));
 if(!items.length)return null;
 const c={en:{title:today?'Today’s large-cap earnings':'This week’s market-moving earnings',call:'Earnings call',past:'Release window passed · read the announcement',official:'Company-confirmed date',calendar:'Calendar date · check company notice'},fr:{title:today?'Résultats des grandes capitalisations aujourd’hui':'Les résultats majeurs de la semaine',call:'Conférence de résultats',past:'Créneau passé · consulter le communiqué',official:'Date confirmée par la société',calendar:'Calendrier · vérifier le communiqué'},zh:{title:today?'今日大盘公司财报':'本周大盘权重财报',call:'财报电话会议',past:'已到发布窗口 · 查看公司公告',official:'公司公告确认日期',calendar:'日历日期 · 请核对公司公告'}}[locale];
 const intl=locale==='zh'?'zh-CN':locale==='fr'?'fr-FR':'en-US';
 return <section className={`earnings-watch ${today?'is-compact':'en-card panel'}`} aria-label={c.title}><h3>🏢 {c.title}</h3><div className="earnings-watch-grid">{items.map(e=><a href={e.sourceUrl} target="_blank" rel="noreferrer" key={e.id}><strong>{e.symbol} <span>↗</span></strong><span>{new Date(e.at).toLocaleDateString(intl,{timeZone:'America/New_York',month:'short',day:'numeric',weekday:'short'})} · {earningsTimingLabel(e,locale)}</span><small>{e.calendarVerified?c.official:c.calendar}{e.earningsCallAt?` · ${c.call} ${new Date(e.earningsCallAt).toLocaleTimeString(intl,{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false})} ET`:''}</small>{Date.parse(e.at)<Date.parse(now)&&<small>{c.past}</small>}</a>)}</div></section>;
}
