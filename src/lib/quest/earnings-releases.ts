import {load} from 'cheerio';
import {marketDate,addDays} from './domain';
import type {MarketEvent} from './types';
export interface EarningsReport {period:string;releasedOn:string;verifiedAt:string;sourceUrl:string;revenueUsd?:number;netIncomeUsd?:number;gaapDilutedEps?:number;operatingMarginPct?:number}
// Dated, primary-source backfill checked 2026-10-24. Never rolled into another quarter.
export const verifiedEarningsReports:Record<string,EarningsReport>={
 'META:2026-10-21':{period:'2026-Q3',releasedOn:'2026-10-21',verifiedAt:'2026-10-24T00:00:00.000Z',sourceUrl:'https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Third-Quarter-2026-Results/',revenueUsd:64601000000,netIncomeUsd:9860000000,gaapDilutedEps:3.83,operatingMarginPct:20},
 'TSLA:2026-10-21':{period:'2026-Q3',releasedOn:'2026-10-21',verifiedAt:'2026-10-24T00:00:00.000Z',sourceUrl:'https://ir.tesla.com/_flysystem/s3/sec/000162828026066738/tsla-20261021-gen.pdf',revenueUsd:28046000000,netIncomeUsd:787000000,gaapDilutedEps:.22},
 'SPCX:2026-10-20':{period:'2026-Q3',releasedOn:'2026-10-20',verifiedAt:'2026-10-24T00:00:00.000Z',sourceUrl:'https://www.sec.gov/Archives/edgar/data/1181412/000162828026066482/spaceexplorationtechnologi.htm',revenueUsd:14600000000,netIncomeUsd:4400000000},
 'NFLX:2026-10-20':{period:'2026-Q3',releasedOn:'2026-10-20',verifiedAt:'2026-10-24T00:00:00.000Z',sourceUrl:'https://www.sec.gov/Archives/edgar/data/1065280/000106528026000290/ex991_q326.htm',revenueUsd:12874000000,netIncomeUsd:3664000000,gaapDilutedEps:.87,operatingMarginPct:34.6},
};
const issuerHosts:Record<string,string[]>={META:['investor.atmeta.com'],TSLA:['ir.tesla.com'],SPCX:['ir.spacex.com'],NFLX:['ir.netflix.net']};
const knownCiks:Record<string,string>={META:'1326801',TSLA:'1318605',SPCX:'1181412',NFLX:'1065280'};
export function applyEarningsReport(event:MarketEvent,report:EarningsReport,now:Date):MarketEvent {
 if(event.kind!=='EARNINGS'||marketDate(new Date(event.at))!==report.releasedOn||Date.parse(event.at)>+now||Date.parse(report.verifiedAt)>+now)throw Error('财报发布日期或核实时间与目标事件不匹配');
 const source=new URL(report.sourceUrl);if(source.protocol!=='https:'||!(source.hostname==='www.sec.gov'&&source.pathname.startsWith(knownCiks[event.symbol||'']?`/Archives/edgar/data/${knownCiks[event.symbol||'']}/`:'/Archives/edgar/data/')||(issuerHosts[event.symbol||'']||[]).includes(source.hostname)))throw Error('公司财报来源与标的不匹配');
 return {...event,status:'confirmed',earningsReport:report,sourceUrl:report.sourceUrl,sourceName:source.hostname==='www.sec.gov'?'SEC EDGAR · 公司财报':'Company Investor Relations · 财报结果',fetchedAt:report.verifiedAt,period:report.period,report:{title:`${event.symbol} · ${report.period} 财报已发布`,bodyUrl:report.sourceUrl,summary:[`${report.period} 公司财报已发布，发布日 ${report.releasedOn}。`]},actual:undefined};
}
export function parseEarningsNotice(event:MarketEvent,html:string,url:string,now:Date):MarketEvent {
 const $=load(html);$('script,style,nav,footer').remove();const text=$('body').text().replace(/\s+/g,' ').trim();
 if(/to (?:announce|post)|will (?:announce|post)/i.test($('h1').first().text()))throw Error('这是财报预告，不是已发布结果');
 const issuer=event.symbol==='META'?/Meta Platforms/i:event.symbol==='TSLA'?/Tesla/i:event.symbol==='SPCX'?/SpaceX|Space Exploration/i:event.symbol==='NFLX'?/Netflix/i:new RegExp(`\\b${event.symbol}\\b`,'i');
 if(!issuer.test(text)||!/financial results|quarter.{0,30}results|Results of Operations/i.test(text))throw Error('未找到对应公司的财报结果');
 const date=marketDate(new Date(event.at)),months=['January','February','March','April','May','June','July','August','September','October','November','December'],d=new Date(date+'T12:00:00Z');
 const published=new RegExp(`${months[d.getUTCMonth()]}\\s+${d.getUTCDate()},?\\s+${d.getUTCFullYear()}`,'i');
 if(!published.test(text)||!/has (?:released|posted)|today (?:reported|announced)|announced its financial results|reports.{0,40}quarter.{0,20}results/i.test(text))throw Error('官方正文未确认目标日的财报已发布');
 const fiscal=text.match(/(first|second|third|fourth) quarter (20\d{2})/i),period=fiscal?`${fiscal[2]}-Q${['first','second','third','fourth'].indexOf(fiscal[1].toLowerCase())+1}`:date;
 return applyEarningsReport(event,{period,releasedOn:date,verifiedAt:now.toISOString(),sourceUrl:url},now);
}
async function officialBody(url:string){const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||!['www.sec.gov','data.sec.gov','investor.atmeta.com','ir.tesla.com','ir.spacex.com','ir.netflix.net'].includes(u.hostname))throw Error('非允许的公司官方来源');const r=await fetch(url,{cache:'no-store',redirect:'error',headers:{'User-Agent':'Monetizable public financial education contact@getmonetizable.com','Accept':'application/json,text/html'},signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error(`财报官方源 HTTP ${r.status}`);const body=await r.text();if(body.length>5_000_000)throw Error('财报正文超过大小限制');return body;}
let tickerCache:Promise<Record<string,{cik_str:number;ticker:string}>>|undefined;
export async function fetchEarningsRelease(event:MarketEvent,now:Date,read=officialBody):Promise<MarketEvent>{
 if(!event.symbol||Date.parse(event.at)>+now)throw Error('财报尚未到公布时间');
 const date=marketDate(new Date(event.at)),snapshot=verifiedEarningsReports[`${event.symbol}:${date}`];
 if(snapshot&&Date.parse(snapshot.verifiedAt)<=+now)return applyEarningsReport(event,snapshot,now);
 const urls:string[]=[];
 try{const source=new URL(event.sourceUrl);if((issuerHosts[event.symbol]||[]).includes(source.hostname))urls.push(source.href);}catch{}
 const cik=knownCiks[event.symbol]||await (async()=>{try{tickerCache??=read('https://www.sec.gov/files/company_tickers.json').then(JSON.parse).catch(e=>{tickerCache=undefined;throw e});return String(Object.values(await tickerCache).find(v=>v.ticker===event.symbol)?.cik_str||'');}catch{return '';}})();
 if(cik)try{const raw=JSON.parse(await read(`https://data.sec.gov/submissions/CIK${cik.padStart(10,'0')}.json`)),recent=raw.filings?.recent;
  if(recent)for(let i=0;i<recent.form.length;i++)if(recent.form[i]==='8-K'&&recent.reportDate[i]===date&&recent.filingDate[i]>=date&&recent.filingDate[i]<=addDays(date,3)&&(!recent.items?.[i]||String(recent.items[i]).includes('2.02'))){urls.unshift(`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${String(recent.accessionNumber[i]).replaceAll('-','')}/${recent.primaryDocument[i]}`);break;}
 }catch{/* A known company IR result can still be checked independently. */}
 let error:unknown=Error('尚未取得目标日的公司财报正文');
 for(const url of [...new Set(urls)].slice(0,2))try{return parseEarningsNotice(event,await read(url),url,now);}catch(e){error=e;}
 throw error;
}
