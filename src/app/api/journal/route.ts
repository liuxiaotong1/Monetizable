import {NextResponse} from 'next/server';
import {currentUser,sameOrigin} from '@/lib/account/auth';
import {database} from '@/lib/account/db';
import {emptyJournal,mutateJournal,JournalError} from '@/lib/journal/core';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){const user=await currentUser();if(!user)return NextResponse.json({error:'AUTH'},{status:401,headers});try{const {rows}=await database().query('SELECT body FROM quest_shared_data WHERE key=$1',['journal-v1:'+user.id]);return NextResponse.json(rows[0]?.body||emptyJournal(),{headers});}catch{return NextResponse.json({error:'UNAVAILABLE'},{status:503,headers});}}
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'FORBIDDEN'},{status:403,headers});const user=await currentUser();if(!user)return NextResponse.json({error:'AUTH'},{status:401,headers});
 let action;try{const raw=await request.text();if(raw.length>2_500_000)return NextResponse.json({error:'SIZE'},{status:413,headers});action=JSON.parse(raw);}catch{return NextResponse.json({error:'INVALID'},{status:400,headers});}
 let client;try{client=await database().connect();}catch{return NextResponse.json({error:'UNAVAILABLE'},{status:503,headers});}try{
  await client.query('BEGIN');const key='journal-v1:'+user.id;await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[key]);
  const {rows}=await client.query('SELECT body FROM quest_shared_data WHERE key=$1 FOR UPDATE',[key]);const next=mutateJournal(rows[0]?.body||emptyJournal(),action);
  await client.query('INSERT INTO quest_shared_data(key,body) VALUES($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET body=$2::jsonb,updated_at=now()',[key,JSON.stringify(next)]);await client.query('COMMIT');return NextResponse.json(next,{headers});
 }catch(error){await client.query('ROLLBACK');return NextResponse.json({error:error instanceof JournalError?error.message:'UNAVAILABLE'},{status:error instanceof JournalError?(error.message==='CONFLICT'?409:400):503,headers});}finally{client.release();}
}
