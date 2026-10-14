import { load } from "cheerio";
import { marketDate } from "./domain";
import type { MarketEvent } from "./types";
export interface OfficialDocument {kind:"ISM"|"TRADE"|"MINUTES"|"CLAIMS"|"CONFIDENCE";url:string;content:string;calendarContent?:string}
export interface OfficialRecord {kind:OfficialDocument["kind"];date?:string;period?:string;sector?:"services"|"manufacturing";phase?:"preliminary"|"final";actual?:number;previous?:number;revised?:number;sourceUrl:string;sourceName:string;fetchedAt:string;report?:{title:string;summary:string[];bodyUrl:string;metrics?:{kind:"headline-mom"|"core-yoy";value:number;unit:"%"}[]}}
const months=["january","february","march","april","may","june","july","august","september","october","november","december"];
function englishDate(text:string){const m=text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})/i);return m?`${m[3]}-${String(months.indexOf(m[1].toLowerCase())+1).padStart(2,"0")}-${m[2].padStart(2,"0")}`:undefined;}
export function parseOfficialDocument(doc:OfficialDocument,fetchedAt:string):OfficialRecord{
 const url=new URL(doc.url);if(url.protocol!=="https:"||url.username||url.password||doc.content.length>2_000_000)throw Error("官方文档无效");
 const $=load(doc.content);$("script,style,nav,footer").remove();const text=$('body').text().replace(/\^\{[®™]\}/g,"").replace(/[®™]/g,"").replace(/\s+/g," ");
 const base={kind:doc.kind,sourceUrl:doc.url,fetchedAt};
 if(doc.kind==="ISM"){
  if(url.hostname!=="www.ismworld.org"||!url.pathname.startsWith("/supply-management-news-and-reports/reports/ism-pmi-reports/"))throw Error("ISM 官方来源不匹配");
  const firstValue=text.search(/(?:Services|Manufacturing) PMI\s+registered/i);
  const header=[...text.matchAll(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\s+ISM\s+(Services|Manufacturing)\s+PMI\s+Report/gi)].filter(m=>firstValue<0||m.index<firstValue).at(-1);
  if(!header)throw Error("ISM 报告年月尚未验证");
  const sector=header[3].toLowerCase() as "services"|"manufacturing",period=`${header[2]}-${String(months.indexOf(header[1].toLowerCase())+1).padStart(2,"0")}`;
  const key=sector==="services"?"Services PMI":"Manufacturing PMI";
  const actual=text.match(new RegExp(`${key}\\s+registered\\s+(\\d+(?:\\.\\d+)?)\\s+percent`,"i"));
  const previous=text.match(new RegExp(`${key}\\s+registered.{0,220}?(?:compared to|from|below|above).{0,90}?(?:figure|reading)\\s+of\\s+(\\d+(?:\\.\\d+)?)\\s+percent`,"i"));
  if(!actual||!previous)throw Error("ISM 总指数或前值尚未验证");
  return {...base,period,sector,actual:Number(actual[1]),previous:Number(previous[1]),sourceName:"ISM · 官方 PMI 报告"};
 }
 if(doc.kind==="CLAIMS"){
  if(url.hostname!=="www.dol.gov"||url.pathname!=="/ui/data.pdf")throw Error("DOL 官方来源不匹配");
  const date=englishDate(text),actual=text.match(/seasonally adjusted initial claims was ([\d,]+)/i),prior=text.match(/previous week's level was revised.{0,70}?from ([\d,]+) to ([\d,]+)/i);
  if(!date||!actual||!prior||!text.includes("UNEMPLOYMENT INSURANCE WEEKLY CLAIMS"))throw Error("初请官方发布日期或季调数值尚未验证");
  return {...base,date,actual:Number(actual[1].replace(/,/g,"")),previous:Number(prior[1].replace(/,/g,"")),revised:Number(prior[2].replace(/,/g,"")),sourceName:"U.S. Department of Labor · 官方周度初请"};
 }
 if(doc.kind==="CONFIDENCE"){
  if(url.hostname!=="www.sca.isr.umich.edu"||url.pathname!=="/")throw Error("密歇根调查官方来源不匹配");
  const header=text.match(/(Preliminary|Final) Results for (January|February|March|April|May|June|July|August|September|October|November|December) (20\d{2})/i);
  const row=$('tr').filter((_,e)=>$(e).text().includes("Index of Consumer Sentiment")).first().children('td').map((_,e)=>$(e).text().trim()).get();
  const actual=Number(row[1]),previous=Number(row[2]);if(!header||!row.length||!Number.isFinite(actual)||!Number.isFinite(previous))throw Error("密歇根报告期或总指数尚未验证");
  return {...base,period:`${header[3]}-${String(months.indexOf(header[2].toLowerCase())+1).padStart(2,"0")}`,phase:header[1].toLowerCase() as "preliminary"|"final",actual,previous,sourceName:"University of Michigan · 官方消费者调查"};
 }
 if(doc.kind==="TRADE"){
  if(!["www.bea.gov","bea.gov"].includes(url.hostname)||!url.pathname.includes("/news/"))throw Error("BEA 官方来源不匹配");
  const date=englishDate($(".field--name-field-release-date").text());
  const data=text.match(/goods and services (deficit|surplus) was \$(\d+(?:\.\d+)?) billion in (\w+),.{0,100}?from \$(\d+(?:\.\d+)?) billion in (\w+)(, revised)?/i);
  if(!date||!data||!text.includes("International Trade in Goods and Services"))throw Error("贸易发布日或贸易差额尚未验证");
  const sign=data[1].toLowerCase()==="deficit"?-1:1;
  return {...base,date,actual:sign*Number(data[2]),previous:sign*Number(data[4]),revised:data[6]?sign*Number(data[4]):undefined,sourceName:"BEA / Census · 官方贸易发布"};
 }
 if(url.hostname!=="www.federalreserve.gov"||!/^\/monetarypolicy\/fomcminutes\d{8}\.htm$/.test(url.pathname))throw Error("Fed 纪要链接不匹配");
 const calendar=load(doc.calendarContent||"");const link=calendar('a').filter((_,e)=>calendar(e).attr('href')===url.pathname).first();
 const date=englishDate(link.parent().text());if(!date||!text.includes("Minutes of the Federal Open Market Committee")||text.length<3000)throw Error("纪要正文或官方公布日期尚未验证");
 const summary:string[]=[];
 if(/all members agreed to raise the target range.{0,110}3-3\/4 to 4 percent/i.test(text))summary.push("这次会议一致同意加息 0.25 个百分点，目标区间为 3.75%–4%；这是会议当时的决策，纪要公布不是再次加息。");
 if(/most participants assessed that another increase.{0,130}by year end/i.test(text))summary.push("多数与会者认为年底前可能需要再次加息；这仍取决于后续数据。");
 if(/inflation remained elevated|inflation was.{0,30}elevated/i.test(text))summary.push("讨论仍关注偏高的通胀；观察后续 CPI、就业与债券收益率如何改变政策预期。");
 if(!summary.length)summary.push("已取得本次官方纪要正文。可打开原文，重点阅读经济展望、委员讨论和政策行动章节。");
 return {...base,date,sourceName:"Federal Reserve · 官方 FOMC 纪要",report:{title:$("#article h3").first().text().trim()||"FOMC 会议纪要",summary,bodyUrl:doc.url}};
}
export function applyOfficialRecords(events:MarketEvent[],records:OfficialRecord[]):MarketEvent[]{return events.map(event=>{
 if(!Number.isFinite(Date.parse(event.at)))return event;
 const date=marketDate(new Date(event.at)),priorMonth=new Date(`${date.slice(0,7)}-01T12:00:00Z`);priorMonth.setUTCMonth(priorMonth.getUTCMonth()-1);
 const record=records.filter(r=>r.kind===event.kind&&r.fetchedAt>=event.at&&(r.date?date===r.date:r.kind==="ISM"&&r.period===priorMonth.toISOString().slice(0,7)&&r.sector===(/服务/.test(event.title)?"services":"manufacturing")||r.kind==="CONFIDENCE"&&r.period===date.slice(0,7)&&r.phase===(/初值/.test(event.title)?"preliminary":/终值/.test(event.title)?"final":undefined))).sort((a,b)=>b.fetchedAt.localeCompare(a.fetchedAt))[0];
 if(!record)return event;
 return {...event,status:"confirmed",actual:record.actual??event.actual,previous:record.previous??event.previous,revised:record.revised??event.revised,report:record.report??event.report,period:record.period??event.period,sourceUrl:record.sourceUrl,sourceName:record.sourceName,fetchedAt:record.fetchedAt};
});}
