import {load} from 'cheerio';
import type {MarketEvent} from './types';
import {marketDate} from './domain';
import {parseOfficialDocument,applyOfficialRecords} from './official-backfill';
const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
export function releaseDate(text:string){const m=text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})/i);return m?`${m[3]}-${String(months.indexOf(m[1].toLowerCase())+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`:undefined;}
export function documentText(content:string){const $=load(content);$('script,style,nav,footer').remove();return $('body').text().replace(/\s+/g,' ').replace(/[−–]/g,'-').replace(/’/g,"'");}
export function parseStatisticalRelease(event:MarketEvent,content:string,url:string,now:string):MarketEvent {
 const text=documentText(content),date=marketDate(new Date(event.at)),host=new URL(url).hostname;
 const dated=event.kind==='BEIGE_BOOK'?releaseDate(text.match(/Last Update:\s*(.+)$/i)?.[1]||''):releaseDate(text);
 if(!['www.bls.gov','www.dol.gov','www.census.gov','www.bea.gov','bea.gov','www.federalreserve.gov'].includes(host)||dated!==date||Date.parse(now)<Date.parse(event.at))throw Error('官方发布日期与目标事件不匹配');
 const base={...event,status:'confirmed' as const,sourceUrl:url,sourceName:host.includes('dol')?(event.kind==='CLAIMS'?'U.S. Department of Labor · 官方初请':'BLS · 劳工部官方存档'):host.includes('bls')?'BLS · 官方公布':host.includes('bea')?'BEA · 官方公布':host.includes('census')?'U.S. Census · 官方公布':'Federal Reserve · 官方公布',fetchedAt:now};
 const number=(r:RegExp)=>{const m=text.match(r);return m?Number(m[1].replace(/,/g,'')):undefined;};
 if(event.kind==='CLAIMS'&&/UNEMPLOYMENT INSURANCE WEEKLY CLAIMS/i.test(text)){
  const actual=number(/seasonally adjusted initial claims was ([\d,]+)/i),prior=text.match(/previous week's level was revised.{0,80}?from ([\d,]+) to ([\d,]+)/i),unrevised=number(/previous week's unrevised level of ([\d,]+)/i);if(actual===undefined)throw Error('季调初请人数尚未核实');return {...base,actual,previous:prior?Number(prior[1].replace(/,/g,'')):unrevised??event.previous,revised:prior?Number(prior[2].replace(/,/g,'')):undefined};
 }
 if(event.kind==='CPI'){
  if(!/CONSUMER PRICE INDEX/i.test(text))throw Error('不是 CPI 报告');
  const actual=number(/all items index (?:rose|increased) ([\d.]+) percent (?:for|over) the (?:last )?12 months/i);
  const previous=number(/all items index (?:rose|increased) [\d.]+ percent for the 12 months.{0,90}?(?:increase than the|than the) ([\d.]+)-percent/i);
  const mom=number(/CPI-U\) (?:increased|rose) ([\d.]+) percent on a seasonally adjusted basis/i);
  const core=number(/all items less food and energy index (?:rose|increased) ([\d.]+) percent over the year/i);
  if(actual===undefined)throw Error('总体 CPI 同比尚未验证');
  const period=text.match(/CONSUMER PRICE INDEX\s*-\s*(\w+)\s+(20\d{2})/i),month=period&&months.indexOf(period[1].toLowerCase());
  return {...base,actual,previous:previous??event.previous,period:period&&month!==-1?`${period[2]}-${String(month!+1).padStart(2,'0')}`:event.period,report:{title:'CPI · 官方公布摘要',summary:[`总体 CPI 同比 ${actual}%；${previous===undefined?'前值尚待官方核对。':`前值 ${previous}%。`}`,...(mom===undefined?[]:[`总体 CPI 季调环比 ${mom}%。同比和环比不可直接混用。`]),...(core===undefined?[]:[`核心 CPI 同比 ${core}%，排除食品与能源。`])],bodyUrl:url}};
 }
 let actual:number|undefined;
 if(event.kind==='NFP'&&/THE EMPLOYMENT SITUATION/i.test(text))actual=number(/Total nonfarm payroll employment (?:increased|rose|changed little|declined|fell|decreased).{0,40}?([+-]?[\d,]+)/i); // direction validated below
 if(event.kind==='NFP'&&actual!==undefined){const declining=/Total nonfarm payroll employment (?:declined|fell|decreased)/i.test(text);actual=actual/1000*(declining?-1:1);}
 if(event.kind==='PPI'&&/PRODUCER PRICE INDEX/i.test(text))actual=number(/(?:final demand|final-demand) (?:index |prices )?(?:rose|increased|advanced) ([\d.]+) percent (?:for|over) the 12 months/i)??number(/(?:final demand|final-demand).{0,80}?([\d.]+) percent (?:for|over) the 12 months/i);
 if(event.kind==='JOLTS'&&/JOB OPENINGS AND LABOR TURNOVER/i.test(text)){actual=number(/(?:number of job openings|Job openings).{0,100}?(?:at |to )([\d.]+) million/i);if(actual!==undefined)actual*=1000;}
 if(event.kind==='RETAIL'&&/ADVANCE MONTHLY SALES FOR RETAIL/i.test(text)){const m=text.match(/(?:up|down) ([\d.]+) percent.{0,65}?(?:previous month|from \w+)/i);if(m)actual=Number(m[1])*(m[0].startsWith('down')?-1:1);}
 if(event.kind==='PCE'&&/Personal Income and Outlays/i.test(text))actual=number(/(?:From the same month one year ago|from one year ago).{0,180}?PCE price index increased ([\d.]+) percent/i);
 if(event.kind==='GDP'&&/gross domestic product/i.test(text)){const m=text.match(/Real gross domestic product.{0,85}?(increased|decreased) at an annual rate of ([\d.]+) percent/i);if(m)actual=Number(m[2])*(m[1].toLowerCase()==='decreased'?-1:1);}
 if(event.kind==='FOMC'){const m=text.match(/(?:target range for the federal funds rate).{0,120}?(\d+)(?:-(\d)\/(\d))? to (\d+)(?:-(\d)\/(\d))? percent/i);if(m)actual=Number(m[4])+(m[5]?Number(m[5])/Number(m[6]):0);}
 if(event.kind==='BEIGE_BOOK'&&/Beige Book/i.test(text)&&text.length>3000)return {...base,report:{title:'Beige Book · 官方报告已公布',summary:['已核对官方发布日期及正文。阅读各地区经济活动、就业与价格章节；这份定性报告没有单一公布值。'],bodyUrl:url}};
 if(actual===undefined||!Number.isFinite(actual))throw Error('本次指标口径或数值未通过核对');
 return {...base,actual};
}
export async function officialContent(url:string):Promise<string>{
 const u=new URL(url);if(u.protocol!=='https:'||!['www.bls.gov','www.dol.gov','www.census.gov','www.bea.gov','bea.gov','apps.bea.gov','www.federalreserve.gov','www.ismworld.org','www.sca.isr.umich.edu'].includes(u.hostname))throw Error('官方来源不在允许列表');
 const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(7000),redirect:'error',headers:{'User-Agent':'Monetizable/1.0 public economic research'}});if(!r.ok)throw Error(`官方来源 HTTP ${r.status}`);
 const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>6_000_000)throw Error('官方文档超过大小限制');
 if(url.endsWith('.pdf')){if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('官方 PDF 格式不匹配');const {extractText}=await import('unpdf');const {text}=await extractText(bytes,{mergePages:true});return `<body>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</body>`;}
 return new TextDecoder().decode(bytes);
}
export async function fetchOfficialRelease(event:MarketEvent,now:Date):Promise<MarketEvent>{
 const date=marketDate(new Date(event.at)),stamp=date.slice(5,7)+date.slice(8,10)+date.slice(0,4),nowISO=now.toISOString();
 const bls:Record<string,string>={CPI:'cpi',NFP:'empsit',PPI:'ppi',JOLTS:'jolts'};
 if(bls[event.kind]){
  const prefix=bls[event.kind];let error:unknown;
  for(const url of [`https://www.bls.gov/news.release/archives/${prefix}_${stamp}.htm`,`https://www.dol.gov/newsroom/economicdata/${prefix}_${stamp}.pdf`])try{return parseStatisticalRelease(event,await officialContent(url),url,nowISO);}catch(e){error=e;}
  throw error;
 }
 if(event.kind==='RETAIL'){const url='https://www.census.gov/retail/marts/www/marts_current.pdf';return parseStatisticalRelease(event,await officialContent(url),url,nowISO);}
 if(event.kind==='BEIGE_BOOK'){const url=`https://www.federalreserve.gov/monetarypolicy/beigebook${date.replaceAll('-','')}.htm`;return parseStatisticalRelease(event,await officialContent(url),url,nowISO);}
 if(['PCE','GDP','TRADE'].includes(event.kind)){
  const rss=load(await officialContent('https://apps.bea.gov/rss/rss.xml'),{xml:true});
  const match=event.kind==='PCE'?/Personal Income and Outlays/i:event.kind==='GDP'?/GDP|Gross Domestic Product/i:/International Trade in Goods and Services/i;
  const item=rss('item').filter((_,el)=>match.test(rss(el).find('title').text())&&marketDate(new Date(rss(el).find('pubDate').text()))===date).first();let url=item.find('link').text();if(!url&&event.kind!=='GDP'){const period=new Date(date.slice(0,7)+'-01T12:00:00Z');period.setUTCMonth(period.getUTCMonth()-(event.kind==='TRADE'?2:1));url=`https://www.bea.gov/news/${date.slice(0,4)}/${event.kind==='TRADE'?'us-international-trade-goods-and-services':'personal-income-and-outlays'}-${months[period.getUTCMonth()]}-${period.getUTCFullYear()}`;}if(!url)throw Error('BEA 官方 RSS 尚未出现匹配日期的报告');
  const content=await officialContent(url);
  if(event.kind==='TRADE'){const record=parseOfficialDocument({kind:'TRADE',url,content},nowISO);return applyOfficialRecords([event],[record])[0];}
  return parseStatisticalRelease(event,content,url,nowISO);
 }
 if(event.kind==='FOMC'){
  const url=`https://www.federalreserve.gov/newsevents/pressreleases/monetary${date.replaceAll('-','')}a.htm`;return parseStatisticalRelease(event,await officialContent(url),url,nowISO);
 }
 if(event.kind==='CLAIMS'){const url=`https://www.dol.gov/newsroom/releases/eta/eta${date.replaceAll('-','')}`;try{return parseStatisticalRelease(event,await officialContent(url),url,nowISO);}catch{/* The current official PDF is an independent fallback; its release date must still match. */}}
 if(event.kind==='ISM'||event.kind==='CONFIDENCE'||event.kind==='CLAIMS'||event.kind==='MINUTES'){
  const prior=new Date(date.slice(0,7)+'-01T12:00:00Z');prior.setUTCMonth(prior.getUTCMonth()-1);
  const url=event.kind==='CLAIMS'?'https://www.dol.gov/ui/data.pdf':event.kind==='CONFIDENCE'?'https://www.sca.isr.umich.edu/':event.kind==='ISM'?`https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/${/服务/.test(event.title)?'services':'pmi'}/${months[prior.getUTCMonth()]}/`:event.sourceUrl;
  const record=parseOfficialDocument({kind:event.kind,url,content:await officialContent(url),...(event.kind==='MINUTES'?{calendarContent:await officialContent('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm')}:{})},nowISO);
  const result=applyOfficialRecords([event],[record])[0];if(result.status!=='confirmed')throw Error('官方报告期与目标事件不匹配');return result;
 }
 throw Error('此事件需要公司 IR 官方来源，未配置自动数值接口');
}
