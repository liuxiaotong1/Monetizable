import {createHash} from 'node:crypto';
import {currentUser,sameOrigin} from '@/lib/account/auth';
import {database} from '@/lib/account/db';
import {emptyJournal} from '@/lib/journal/core';
import {analysisInput,generateJournalReport} from '@/lib/journal/ai-report';
export const maxDuration=60;
const headers={'Cache-Control':'private,no-store'};
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'FORBIDDEN'},{status:403,headers});const user=await currentUser();if(!user)return Response.json({error:'AUTH'},{status:401,headers});
 try{const raw=await request.text();if(raw.length>1000)return Response.json({error:'SIZE'},{status:413,headers});const locale=JSON.parse(raw||'{}').locale;const language=['en','fr','zh'].includes(locale)?locale:'en';
  const db=database(),{rows}=await db.query('SELECT body FROM quest_shared_data WHERE key=$1',['journal-v1:'+user.id]);const input=analysisInput(rows[0]?.body||emptyJournal());if(!input.accounts.length&&!input.trades.length)return Response.json({error:'NO_DATA'},{status:400,headers});
  const digest=createHash('sha256').update(JSON.stringify({input,language,version:1})).digest('hex'),key='journal-ai:'+user.id+':'+digest;
  const saved=await db.query('SELECT body FROM quest_shared_data WHERE key=$1',[key]);if(saved.rows[0]?.body)return Response.json(saved.rows[0].body,{headers});
  const claim=await db.query("INSERT INTO quest_shared_data(key,body) VALUES($1,'{}'::jsonb) ON CONFLICT(key) DO UPDATE SET updated_at=now() WHERE quest_shared_data.updated_at<now()-interval '30 seconds' RETURNING key",['journal-ai-rate:'+user.id]);if(!claim.rows.length)return Response.json({error:'AI_BUSY'},{status:429,headers:{...headers,'Retry-After':'30'}});
  const report=await generateJournalReport(input,language);await db.query('INSERT INTO quest_shared_data(key,body) VALUES($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET body=EXCLUDED.body,updated_at=now()',[key,JSON.stringify(report)]);return Response.json(report,{headers});
 }catch(e){const message=e instanceof Error?e.message:'';return Response.json({error:['AI_NOT_CONFIGURED','AI_AUTH','AI_BUSY','AI_FORMAT','AI_INCOMPLETE'].includes(message)?message:'AI_UNAVAILABLE'},{status:503,headers});}
}
