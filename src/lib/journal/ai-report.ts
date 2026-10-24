import 'server-only';
import {metrics,type Journal} from './core';
import {accountMetrics} from './auto-import';
export type AIReport={summary:string;strengths:string[];risks:string[];nextSteps:string[];limits:string;generatedAt:string};
export function analysisInput(journal:Journal){
 const groups=[...new Set((journal.equityRows||[]).map(r=>JSON.stringify([r.account,r.currency])))];
 const accounts=groups.map((key,index)=>{const rows=(journal.equityRows||[]).filter(r=>JSON.stringify([r.account,r.currency])===key),m=accountMetrics(rows);return{account:index+1,currency:m.last?.currency,start:m.first?.date,end:m.last?.date,records:m.count,recordsIncludeWeekendsAndHolidays:true,latestEquity:m.last?.equity,cashFlowAdjustedChange:m.net,depositsAfterOpeningSnapshot:m.deposits,withdrawalsAfterOpeningSnapshot:m.withdrawals,maximumCashflowAdjustedPnLDecline:m.drawdown,positiveDays:m.positive,negativeDays:m.negative,reportedReturnPercent:m.last?.reportedReturn,dataType:'daily account equity, may include unrealized P&L; not individual trades'}});
 const currencies=[...new Set(journal.trades.map(t=>t.currency))];const trades=currencies.map(currency=>{const rows=journal.trades.filter(t=>t.currency===currency),reviewed=rows.filter(t=>journal.reviews[t.id]);const checks=reviewed.reduce((s,t)=>s+(journal.days[t.date]?.rules.length||0),0),followed=reviewed.reduce((s,t)=>s+journal.reviews[t.id].followed.length,0);return{currency,...metrics(rows),documentedRuleChecks:checks,documentedFollowedChecks:followed,reviewedTrades:reviewed.length,months:[...new Set(rows.map(t=>t.date.slice(0,7)))].sort().slice(-24).map(month=>({month,...metrics(rows.filter(t=>t.date.startsWith(month)))}))}});
 return {accounts,trades};
}
const strings={type:'array',items:{type:'string'}};
export function parseAIReport(raw:unknown):Omit<AIReport,'generatedAt'>{
 if(!raw||typeof raw!=='object')throw Error('AI_FORMAT');const v=raw as Record<string,unknown>;
 for(const key of ['summary','limits'])if(typeof v[key]!=='string'||!(v[key] as string).trim()||(v[key] as string).length>4000)throw Error('AI_FORMAT');
 for(const key of ['strengths','risks','nextSteps'])if(!Array.isArray(v[key])||(v[key] as unknown[]).length>6||!(v[key] as unknown[]).every(s=>typeof s==='string'&&s.length<=1800))throw Error('AI_FORMAT');
 return {summary:v.summary as string,limits:v.limits as string,strengths:v.strengths as string[],risks:v.risks as string[],nextSteps:v.nextSteps as string[]};
}
export async function generateJournalReport(input:ReturnType<typeof analysisInput>,locale:string,fetcher:typeof fetch=fetch):Promise<AIReport>{
 const key=process.env.OPENAI_API_KEY;if(!key)throw Error('AI_NOT_CONFIGURED');
 const schema={type:'object',properties:{summary:{type:'string'},strengths:strings,risks:strings,nextSteps:strings,limits:{type:'string'}},required:['summary','strengths','risks','nextSteps','limits'],additionalProperties:false};
 const response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(55000),body:JSON.stringify({model:process.env.OPENAI_ANALYSIS_MODEL||'gpt-4o-mini',store:false,max_output_tokens:2400,instructions:`You are a careful trading-journal learning coach. Write entirely in ${locale==='zh'?'Simplified Chinese':locale==='fr'?'French':'English'}. Use only the supplied verified numeric aggregates. Do not invent performance, a trading system, risk tolerance, emotional causes, or adherence to unrecorded rules. Account records include weekends and holidays; never describe the number of records as trading days. Account equity may contain unrealized P&L and is NOT trade history: never infer trade win rate, profit factor or rule adherence from equity snapshots or positive days. Never mix currencies or accounts. For equity-only accounts, strengths may describe data coverage and observed balance changes ONLY. Never call trading skill, profitability ability, risk management, discipline, recovery ability, or a strategy effective/strong/successful based on the account curve. A positive asset change is not proof of any of those qualities. Do not infer position sizing, stop-loss use, leverage, consecutive trading losses, or causes of drawdown. Describe positive/negative ACCOUNT DAYS, never winning/losing trades. Suggest recording actual closed trades and defining measurable rules rather than prescribing tighter stops or smaller positions without context. Net asset change is adjusted for daily deposits/withdrawals after the opening snapshot, not an exact time-weighted return. Reported return is the broker's field, not your calculation. Give 2-3 concrete insights and 2-3 practical process improvements grounded in the numbers. If sample is limited say so. No buy/sell picks, guaranteed profit, or promises. Output a concise JSON report matching schema.`,input:JSON.stringify(input),text:{format:{type:'json_schema',name:'trading_journal_report',strict:true,schema}}})});
 if(!response.ok)throw Error(response.status===429?'AI_BUSY':response.status===401?'AI_AUTH':'AI_UNAVAILABLE');const data=await response.json();if(data.status&&data.status!=='completed')throw Error('AI_INCOMPLETE');
 const output=(data.output||[]).flatMap((item:{content?:{type:string;text?:string}[]})=>item.content||[]).filter((item:{type:string})=>item.type==='output_text').map((item:{text:string})=>item.text).join('');
 return {...parseAIReport(JSON.parse(output)),generatedAt:new Date().toISOString()};
}

export function normalizeObservationDays(report:AIReport,input:ReturnType<typeof analysisInput>):AIReport{
 if(input.trades.length||!input.accounts.length)return report;
 const fix=(s:string)=>s.replace(/(\d+)\s*个?交易日/g,'$1 条账户日记录').replace(/(\d+) trading days/gi,'$1 account observations').replace(/(\d+) jours de trading/gi,'$1 relevés quotidiens');
 return {...report,summary:fix(report.summary),strengths:report.strengths.map(fix),risks:report.risks.map(fix),nextSteps:report.nextSteps.map(fix),limits:fix(report.limits)};
}
