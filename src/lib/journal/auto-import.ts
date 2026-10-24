import {parseCSV,suggestMapping,tradeDate,amount,type Trade,type Mapping} from './core';
export type EquityRow={date:string;equity:number;deposit:number;withdrawal:number;currency:string;account:string;reportedProfit?:number;reportedReturn?:number};
export type AutoImport={kind:'trades';trades:Trade[];warnings:string[]}|{kind:'equity';rows:EquityRow[];warnings:string[]};
export class ImportProblem extends Error{constructor(public code:string){super(code)}}
const norm=(s:string)=>s.toLowerCase().replace(/[\s_\-()（）/]/g,'');
const hash=(s:string)=>{let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
export function decodeStatement(bytes:Uint8Array){if(bytes[0]===255&&bytes[1]===254)return new TextDecoder('utf-16le').decode(bytes);if(bytes[0]===254&&bytes[1]===255)return new TextDecoder('utf-16be').decode(bytes);try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{return new TextDecoder('gb18030').decode(bytes)}}
export function autoImport(text:string,filename='statement.csv',dateChoice?:'dmy'|'mdy'):AutoImport{
 const candidates=[',',';','\t'].map(delimiter=>{try{return {delimiter,rows:parseCSV(text,delimiter)}}catch{return {delimiter,rows:[] as string[][]}}});
 const score=(rows:string[][])=>Math.max(0,...rows.slice(0,30).map(r=>{const m=suggestMapping(r);return Object.values(m).filter(n=>n>=0).length*10+r.filter(h=>/日期|date|資產|资产|equity|balance/i.test(h)).length*10+(r.length>1?1:0)}));
 const parsed=candidates.sort((a,b)=>score(b.rows)-score(a.rows))[0]?.rows;if(!parsed?.length)throw new ImportProblem('FORMAT');
 const header=parsed.slice(0,30).map((r,i)=>({i,score:score([r])})).sort((a,b)=>b.score-a.score)[0].i,headers=parsed[header],data=parsed.slice(header+1).filter(r=>r.some(Boolean));
 const find=(aliases:string[])=>headers.findIndex(h=>aliases.some(a=>norm(h).startsWith(a)));
 const dateIndex=find(['日期','交易日期','平倉日期','平仓日期','closedate','closingdate','dateclosed','date','time']);
 const equityIndex=find(['總資產','总资产','淨資產','净资产','totalequity','totalassets','netliquidation','accountvalue','equity','balance']);
 const dates=data.map(r=>r[dateIndex]||'').filter(Boolean);let format:'ymd'|'dmy'|'mdy'='ymd';
 if(dates.some(d=>/^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}/.test(d))){const dmy=dates.some(d=>Number(d.split(/[/.\-]/)[0])>12),mdy=dates.some(d=>Number(d.split(/[/.\-]/)[1])>12);if(!dmy&&!mdy&&!dateChoice)throw new ImportProblem('DATE_ORDER');format=dateChoice||(dmy?'dmy':'mdy')}
 const currencyIndex=find(['currency','ccy','币种','幣種']),currencyHint=headers.join(' ').match(/\b(USD|EUR|HKD|CNY|GBP|JPY|CAD|AUD|CHF|SGD)\b/i)?.[1]?.toUpperCase()||'USD';
 const numericSamples=data.slice(0,30).flatMap(r=>r);const decimal=numericSamples.some(v=>/^-?\d{1,3}(?:\.\d{3})*,\d{2}$/.test(v))?',':'.';
 const number=(v:string)=>amount((v||'').replace(/[$€£¥%]/g,'').replace(/\b(?:USD|EUR|HKD|CNY|GBP)\b/gi,'').trim(),decimal);
 const account='CSV-'+hash(filename.replace(/\d{6,8}/g,'').replace(/\.(csv|cvs|tsv)$/i,'')),warnings:string[]=[];
 if(dateIndex<0||!data.length)throw new ImportProblem('DATE');
 if(equityIndex>=0){const dep=find(['入金','deposit','deposits']),wd=find(['出金','withdrawal','withdrawals']),profit=find(['收益usd','收益hkd','收益','profit']),ret=find(['收益率','return','performance']);const rows:EquityRow[]=[];
  for(const r of data){const date=tradeDate(r[dateIndex]||'',format);if(!date){if(/total|合计|合計|summary/i.test(r.join(' ')))continue;throw new ImportProblem('DATE')}
   const equity=number(r[equityIndex]),deposit=dep<0?0:number(r[dep]),withdrawal=wd<0?0:Math.abs(number(r[wd])),currency=(currencyIndex<0?currencyHint:r[currencyIndex]).toUpperCase();
   if(![equity,deposit,withdrawal].every(Number.isFinite)||!/^[A-Z]{3}$/.test(currency))throw new ImportProblem('AMOUNT');
   const reportedProfit=profit<0?NaN:number(r[profit]),reportedReturn=ret<0?NaN:number(r[ret]);rows.push({date,equity,deposit,withdrawal,currency,account,...(Number.isFinite(reportedProfit)?{reportedProfit}:{}),...(Number.isFinite(reportedReturn)?{reportedReturn}:{})});
  }
  const unique=new Map<string,EquityRow>();for(const r of rows){const key=r.date+r.currency;if(unique.has(key))throw new ImportProblem('DUPLICATE');unique.set(key,r)}if(!rows.length)throw new ImportProblem('EMPTY');return {kind:'equity',rows:rows.sort((a,b)=>a.date.localeCompare(b.date)),warnings};
 }
 const m:Mapping=suggestMapping(headers);if(m.date<0)m.date=dateIndex;
 if(m.symbol<0)m.symbol=find(['stock','security','instrument','标的','標的','股票']);if(m.pnl<0)m.pnl=find(['netprofit','realizedprofit','realisedprofit','profitloss','profit/loss','損益','损益','盈亏','盈虧']);
 if(m.symbol<0||m.pnl<0)throw new ImportProblem('CLOSED_TRADES');
 const seen=new Map<string,number>(),trades:Trade[]=[];
 for(const r of data){const date=tradeDate(r[m.date]||'',format),symbol=r[m.symbol]?.trim(),net=number(r[m.pnl]),currency=(m.currency<0?currencyHint:r[m.currency]).toUpperCase();if(!date||!symbol||!Number.isFinite(net)||!/^[A-Z]{3}$/.test(currency))throw new ImportProblem('ROW');
  const identity=JSON.stringify([date,symbol,net,currency,r]),base=hash(identity),count=(seen.get(base)||0)+1;seen.set(base,count);const externalId=m.id>=0&&r[m.id]?r[m.id]:`auto-${base}-${count}`;
  trades.push({id:JSON.stringify([account,externalId]),account,externalId,date,symbol,net,currency,strategy:m.strategy<0?'':r[m.strategy]||''});
 }
 if(!trades.length)throw new ImportProblem('EMPTY');return {kind:'trades',trades,warnings};
}
export function accountMetrics(input:EquityRow[]){const rows=[...input].sort((a,b)=>a.date.localeCompare(b.date)),first=rows[0],last=rows.at(-1);let cumulative=0,peak=0,drawdown=0,positive=0,negative=0;const curve=rows.map((r,i)=>{if(i){const change=r.equity-rows[i-1].equity-r.deposit+r.withdrawal;cumulative+=change;if(change>.01)positive++;if(change<-.01)negative++}peak=Math.max(peak,cumulative);drawdown=Math.max(drawdown,peak-cumulative);return{date:r.date,equity:r.equity,pnl:cumulative}});return{count:rows.length,first,last,net:cumulative,deposits:rows.slice(1).reduce((s,r)=>s+r.deposit,0),withdrawals:rows.slice(1).reduce((s,r)=>s+r.withdrawal,0),drawdown,positive,negative,curve};}
