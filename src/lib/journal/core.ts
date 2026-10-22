/** A row is one CLOSED trade, never an individual execution/fill. Amounts are in its native currency. */
export type Trade={id:string;account:string;externalId:string;date:string;symbol:string;net:number;currency:string;strategy:string};
export type Review={strategy:string;followed:string[];mistakes:string[];note:string;reviewedAt:string};
export type Day={date:string;system:string;rules:string[];mood:string;direction:string;note:string;image?:string;createdAt:string;finishedAt?:string};
export type Journal={revision:number;trades:Trade[];reviews:Record<string,Review>;days:Record<string,Day>};
export const emptyJournal=():Journal=>({revision:0,trades:[],reviews:{},days:{}});
export type Mapping={id:number;date:number;symbol:number;pnl:number;fees:number;currency:number;strategy:number};
export type ImportOptions={month:string;account:string;currency:string;dateFormat:'ymd'|'dmy'|'mdy';decimal:'.'|',';pnlMode:'net'|'gross';mapping:Mapping};
export function parseCSV(text:string,delimiter=','):string[][]{
 if(text.length>2_000_000)throw Error('SIZE');
 text=text.replace(/^\uFEFF/,'');
 const rows:string[][]=[];let row:string[]=[],value='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=c;}
  else if(c==='"'&&!value&&!closed)quoted=true;
  else if(c===delimiter){row.push(value.trim());value='';closed=false;}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value.trim());if(row.some(Boolean))rows.push(row);row=[];value='';closed=false;}
  else{if(closed&&c.trim())throw Error('CSV');value+=c;}
 }
 if(quoted)throw Error('CSV');row.push(value.trim());if(row.some(Boolean))rows.push(row);
 if(rows.length>5001||rows.some(r=>r.length>100))throw Error('SIZE');return rows;
}
export function validDate(v:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const n=new Date(v+'T00:00:00Z');return Number.isFinite(n.getTime())&&n.toISOString().slice(0,10)===v;}
export function tradeDate(v:string,format:ImportOptions['dateFormat']){
 const parts=v.trim().split(/[T ]/)[0].split(/[-/.]/);if(parts.length!==3)return '';
 const [y,m,d]=format==='ymd'?parts:format==='dmy'?[parts[2],parts[1],parts[0]]:[parts[2],parts[0],parts[1]];
 const result=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;return validDate(result)?result:'';
}
export function amount(v:string,decimal:'.'|','){
 let s=v.trim().replace(/[\s\u00a0]/g,'');const neg=s.startsWith('(')&&s.endsWith(')');if(neg)s=s.slice(1,-1);
 const pattern=decimal==='.'?/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/:/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/;
 if(!pattern.test(s))return NaN;
 const n=Number(s.replace(decimal==='.'?/,/g:/\./g,'').replace(decimal,'.'))*(neg?-1:1);
 return Number.isFinite(n)&&Math.abs(n)<=1e10?n:NaN;
}
export function normalizeRows(rows:string[][],o:ImportOptions):{trades:Trade[];errors:{row:number;code:string}[]}{
 const trades:Trade[]=[],errors:{row:number;code:string}[]=[];const seen=new Set<string>();
 rows.forEach((r,i)=>{
  const get=(k:keyof Mapping)=>o.mapping[k]>=0?r[o.mapping[k]]?.trim()||'':'';
  const date=tradeDate(get('date'),o.dateFormat),externalId=get('id'),symbol=get('symbol'),currency=(get('currency')||o.currency).toUpperCase();
  const pnl=amount(get('pnl'),o.decimal),fees=o.pnlMode==='gross'?amount(get('fees')||'0',o.decimal):0;
  let code='';if(!externalId||externalId.length>120)code='ID';else if(!date)code='DATE';else if(date.slice(0,7)!==o.month)code='MONTH';else if(!symbol||symbol.length>80)code='SYMBOL';else if(!/^[A-Z]{3}$/.test(currency))code='CURRENCY';else if(!Number.isFinite(pnl)||!Number.isFinite(fees)||fees<0)code='AMOUNT';
  const id=JSON.stringify([o.account.trim(),externalId]);if(seen.has(id))code='DUPLICATE';seen.add(id);
  if(code)errors.push({row:i+2,code});else trades.push({id,account:o.account.trim(),externalId,date,symbol,net:Math.round((pnl-fees)*1e8)/1e8,currency,strategy:get('strategy').slice(0,100)});
 });return {trades,errors};
}
export function metrics(trades:Trade[]){
 const wins=trades.filter(t=>t.net>0),losses=trades.filter(t=>t.net<0);const sum=(a:Trade[])=>a.reduce((s,t)=>s+t.net,0),profit=sum(wins),loss=-sum(losses);
 return {count:trades.length,wins:wins.length,losses:losses.length,breakeven:trades.length-wins.length-losses.length,winRate:trades.length?100*wins.length/trades.length:null,net:sum(trades),profitFactor:loss?profit/loss:null,expectancy:trades.length?sum(trades)/trades.length:null,averageWin:wins.length?profit/wins.length:null,averageLoss:losses.length?-loss/losses.length:null};
}
export function equity(trades:Trade[]){const days=new Map<string,number>();for(const t of trades)days.set(t.date,(days.get(t.date)||0)+t.net);let total=0;return [...days].sort(([a],[b])=>a.localeCompare(b)).map(([date,n])=>({date,value:total+=n}));}
export const ruleIds=['plan','risk','stop','limit','overnight','events'] as const;
export const mistakeIds=['impulse','oversize','exit','revenge','none'] as const;
export class JournalError extends Error{}
const check=(ok:unknown,code='INVALID')=>{if(!ok)throw new JournalError(code);};
const text=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;
/** Server validates and derives all IDs; clients cannot overwrite the journal wholesale. */
export function mutateJournal(j:Journal,action:any,now=new Date().toISOString()):Journal{
 check(action&&action.revision===j.revision,'CONFLICT');const next:Journal=structuredClone(j);
 if(action.type==='import'){
  check(Array.isArray(action.trades)&&action.trades.length>0&&action.trades.length<=5000);
  const known=new Map(next.trades.map(t=>[t.id,t]));let added=0;
  for(const raw of action.trades){
   check(raw&&text(raw.account,80)&&raw.account.trim()&&text(raw.externalId,120)&&raw.externalId.trim()&&text(raw.symbol,80)&&raw.symbol.trim()&&validDate(raw.date)&&typeof raw.net==='number'&&Number.isFinite(raw.net)&&Math.abs(raw.net)<=1e10&&/^[A-Z]{3}$/.test(raw.currency)&&text(raw.strategy,100));
   const t:Trade={id:JSON.stringify([raw.account,raw.externalId]),account:raw.account,externalId:raw.externalId,date:raw.date,symbol:raw.symbol,net:raw.net,currency:raw.currency,strategy:raw.strategy};
   const old=known.get(t.id);if(old){check(JSON.stringify(old)===JSON.stringify(t),'DUPLICATE_CONFLICT');continue;}
   check(!next.days[t.date]?.finishedAt,'DAY_LOCKED');known.set(t.id,t);next.trades.push(t);added++;
  }
  check(next.trades.length<=25000,'CAPACITY');check(added>0,'NO_NEW_TRADES');
 }else if(action.type==='plan'){
  const p=action.day;check(p&&validDate(p.date)&&text(p.system,500)&&p.system.trim().length>=3&&Array.isArray(p.rules)&&p.rules.length>0&&p.rules.every((r:unknown)=>ruleIds.includes(r as any))&&['calm','focused','anxious','tired'].includes(p.mood)&&['bullish','neutral','bearish','wait'].includes(p.direction)&&text(p.note,2000));
  const old=next.days[p.date];check(!old?.finishedAt,'DAY_LOCKED');
  // Rules are snapshotted once: editing after importing trades would rewrite the standard being assessed.
  check(!old||!next.trades.some(t=>t.date===p.date),'PLAN_LOCKED');
  check(!p.image||(typeof p.image==='string'&&p.image.length<=220000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(p.image)));
  next.days[p.date]={date:p.date,system:p.system,rules:[...new Set<string>(p.rules)],mood:p.mood,direction:p.direction,note:p.note,image:p.image||undefined,createdAt:old?.createdAt||now};
 }else if(action.type==='note'){
  const d=next.days[action.date];check(d,'PLAN_REQUIRED');check(!d.finishedAt,'DAY_LOCKED');check(text(action.note,2000));check(!action.image||(typeof action.image==='string'&&action.image.length<=220000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(action.image)));d.note=action.note;d.image=action.image||undefined;
 }else if(action.type==='review'){
  const t=next.trades.find(t=>t.id===action.id);check(t,'TRADE_REQUIRED');const d=next.days[t!.date];check(d,'PLAN_REQUIRED');check(!d.finishedAt,'DAY_LOCKED');const r=action.review;
  check(r&&text(r.strategy,100)&&r.strategy.trim()&&text(r.note,1000)&&Array.isArray(r.followed)&&r.followed.every((v:unknown)=>d.rules.includes(v as string))&&Array.isArray(r.mistakes)&&r.mistakes.length>0&&r.mistakes.every((v:unknown)=>mistakeIds.includes(v as any))&&!(r.mistakes.includes('none')&&r.mistakes.length>1));
  next.reviews[t!.id]={strategy:r.strategy,followed:[...new Set<string>(r.followed)],mistakes:[...new Set<string>(r.mistakes)],note:r.note,reviewedAt:now};
 }else if(action.type==='finish'){
  const d=next.days[action.date];check(d,'PLAN_REQUIRED');check(!d.finishedAt,'DAY_LOCKED');const trades=next.trades.filter(t=>t.date===action.date);check(trades.length?trades.every(t=>next.reviews[t.id]):action.noTrades===true,'REVIEW_REQUIRED');d.finishedAt=now;
 }else if(action.type==='reopen'){
  const d=next.days[action.date];check(d,'PLAN_REQUIRED');delete d.finishedAt;
 }else check(false);
 next.revision++;check(JSON.stringify(next).length<=6_000_000,'CAPACITY');return next;
}

export function suggestMapping(headers:string[]):Mapping{
 const aliases:Record<keyof Mapping,string[]>={id:['tradeid','positionid','交易编号','成交编号','id'],date:['closedate','closingdate','dateclosed','date','平仓日期'],symbol:['symbol','ticker','instrument','标的代码','代码'],pnl:['realizedpnl','realisedpnl','realizedp&l','netpnl','netp&l','profitloss','pnl','已实现盈亏','净盈亏'],fees:['fees','commission','commissions','手续费'],currency:['currency','ccy','币种'],strategy:['strategy','setup','策略']};
 const normalize=(s:string)=>s.toLowerCase().replace(/[\s_\-]/g,'');return Object.fromEntries(Object.entries(aliases).map(([key,names])=>[key,headers.findIndex(h=>names.includes(normalize(h)))])) as Mapping;
}
