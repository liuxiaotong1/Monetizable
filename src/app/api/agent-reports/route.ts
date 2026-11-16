import {getPublicFeed} from '@/lib/quest/public-source';
import {billingStatus} from '@/lib/account/billing';
import {database} from '@/lib/account/db';
import {sessionFor} from '@/lib/quest/domain';
import {agentReportSchema,validateAgentReport,mayReplaceReport,parisDate,reportWeekStart,reportScheduleContext,type AgentReport} from '@/lib/quest/agent-report';
import {createHash} from 'node:crypto';
export const maxDuration=20;
export const dynamic='force-dynamic';
// Reports are written by the cloud scheduler. This read personalizes the stored payload and must stay private.
const privateHeaders={'Cache-Control':'private, max-age=300','Vary':'Cookie'};
let reportCache:{at:number;reports:AgentReport[]}|undefined;
async function storedReports():Promise<AgentReport[]>{
 if(reportCache&&Date.now()-reportCache.at<60_000)return reportCache.reports;
 const {rows}=await database().query("SELECT body FROM quest_shared_data WHERE key LIKE 'report:%' AND key !~ ':v[0-9]+$' ORDER BY updated_at DESC LIMIT 20");
 const reports=(rows.map(row=>row.body) as AgentReport[]).filter(report=>!!report&&typeof report.kind==='string'&&typeof report.date==='string');
 reportCache={at:Date.now(),reports};
 return reports;
}
function dailyStatus(reports:AgentReport[],now:Date){
 const date=parisDate(now),day=new Date(date+'T12:00:00Z').getUTCDay(),session=sessionFor(now);
 if(day===0||day===6)return 'weekend';
 if(reports.some(report=>report.kind==='daily'&&report.date===date))return 'ready';
 return now.getTime()>=Date.parse(session.openAt)?'missed':'scheduled';
}
export async function GET(){
 const [premium,stored]=await Promise.all([
  billingStatus().then(status=>status.premium).catch(()=>false),
  storedReports().catch(()=>[] as AgentReport[]),
 ]);
 let reports=stored;
 if(!reports.length){
  try{const payload=(await getPublicFeed()).reports as {reports?:AgentReport[]};if(Array.isArray(payload.reports))reports=payload.reports;}catch{reports=[];}
 }
 const now=new Date();
 return Response.json({reports:reports.map(r=>r.kind==='daily'&&!premium?{...r,body:'',summary:'',preview:'',sources:[],locked:true}:r),schedule:reportScheduleContext(now),dailyStatus:dailyStatus(reports,now),reportDate:parisDate(now)},{headers:privateHeaders});
}
export async function POST(request:Request){const token=process.env.QUEST_REPORT_TOKEN;if(!token||request.headers.get('authorization')!==`Bearer ${token}`)return Response.json({error:'Not authorized'},{status:401});try{const input=agentReportSchema.parse(await request.json()),now=new Date();validateAgentReport(input,now);const key=`report:${input.kind}:${input.date}`;const client=await database().connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[key]);const previous=(await client.query('SELECT body FROM quest_shared_data WHERE key=$1',[key])).rows[0]?.body as AgentReport|undefined;if(!mayReplaceReport(previous,input)){await client.query('COMMIT');return Response.json({saved:false,retained:true});}const digest=createHash('sha256').update(JSON.stringify(input)).digest('hex');if(previous?.digest===digest){await client.query('COMMIT');return Response.json({saved:true,version:previous.version});}if(previous)await client.query('INSERT INTO quest_shared_data(key,body) VALUES($1,$2) ON CONFLICT(key) DO NOTHING',[`${key}:v${previous.version}`,JSON.stringify(previous)]);const body={...input,digest,version:(previous?.version||0)+1,savedAt:now.toISOString(),...(input.kind==='weekly'?{weekStart:reportWeekStart(input.date)}:{})};await client.query('INSERT INTO quest_shared_data(key,body) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET body=EXCLUDED.body,updated_at=now()',[key,JSON.stringify(body)]);await client.query('COMMIT');reportCache=undefined;return Response.json({saved:true,date:input.date,version:body.version});}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}catch{return Response.json({error:'Invalid report or temporarily unavailable storage'},{status:400});}}
