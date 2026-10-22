import {NextResponse} from 'next/server';
import {currentUser,sameOrigin} from '@/lib/account/auth';
import {database} from '@/lib/account/db';
import {validateDiscipline} from '@/lib/quest/discipline-plan';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in first'},{status:401,headers});
 try{const {rows}=await database().query('SELECT body FROM quest_shared_data WHERE key=$1',['discipline-v1:'+user.id]);return NextResponse.json({plan:rows[0]?.body?.current||null},{headers});}catch{return NextResponse.json({error:'Unavailable'},{status:503,headers});}
}
export async function PUT(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Forbidden'},{status:403,headers});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in first'},{status:401,headers});
 try{
  const raw=await request.text();if(raw.length>8000)return NextResponse.json({error:'Too large'},{status:413,headers});
  const valid=validateDiscipline(JSON.parse(raw));if(!valid)return NextResponse.json({error:'Invalid plan'},{status:400,headers});
  const plan={...valid,since:new Date().toISOString()};
  // Keep each previous plan. New rules only apply to calls sealed after this server timestamp.
  const {rows}=await database().query(`INSERT INTO quest_shared_data(key,body) VALUES($1,jsonb_build_object('current',$2::jsonb,'history','[]'::jsonb)) ON CONFLICT(key) DO UPDATE SET body=jsonb_build_object('current',$2::jsonb,'history',COALESCE(quest_shared_data.body->'history','[]'::jsonb)||jsonb_build_array(quest_shared_data.body->'current')),updated_at=now() RETURNING body`,['discipline-v1:'+user.id,JSON.stringify(plan)]);
  return NextResponse.json({plan:rows[0].body.current},{headers});
 }catch{return NextResponse.json({error:'Save failed'},{status:503,headers});}
}
