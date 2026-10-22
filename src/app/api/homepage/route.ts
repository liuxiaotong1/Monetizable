import {NextResponse} from 'next/server';
import {administrator,sameOrigin} from '@/lib/account/auth';
import {database} from '@/lib/account/db';
import {ADMIN_EMAIL} from '@/lib/account/policy';
import {defaultFounder,homepageContentKey,validateFounder} from '@/lib/account/homepage-content';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(){
 const query=(sql:string,values:unknown[])=>Promise.resolve().then(()=>database().query(sql,values));
 const [founderResult,communityResult]=await Promise.allSettled([
  query('SELECT body FROM quest_shared_data WHERE key=$1',[homepageContentKey]),
  query("SELECT count(*)::int AS verified_accounts FROM auth.users WHERE email_confirmed_at IS NOT NULL AND lower(email)<>$1 AND lower(email) NOT LIKE '%@testing.constants.io' AND lower(email) NOT LIKE '%@example.com' AND lower(email) NOT LIKE '%@example.org' AND lower(email) NOT LIKE '%@example.net'",[ADMIN_EMAIL.toLowerCase()])
 ]);
 const founder=founderResult.status==='fulfilled'?validateFounder(founderResult.value.rows[0]?.body)||defaultFounder:defaultFounder;
 const count=communityResult.status==='fulfilled'?communityResult.value.rows[0]?.verified_accounts:undefined;
 return NextResponse.json({founder,...(Number.isInteger(count)&&count>=0?{community:{verifiedAccounts:count,asOf:new Date().toISOString()}}:{})},{headers});
}
export async function PUT(request:Request){
 if(!sameOrigin(request)||!await administrator())return NextResponse.json({error:'Forbidden'},{status:403,headers});
 try{const text=await request.text();if(text.length>12000)return NextResponse.json({error:'内容过长'},{status:413,headers});const founder=validateFounder(JSON.parse(text));if(!founder)return NextResponse.json({error:'请填写三种语言的介绍；Instagram 仅接受完整的 https://www.instagram.com/用户名/ 主页链接。'},{status:400,headers});await database().query('INSERT INTO quest_shared_data(key,body) VALUES($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET body=EXCLUDED.body,updated_at=now()',[homepageContentKey,JSON.stringify(founder)]);return NextResponse.json({founder},{headers});}catch{return NextResponse.json({error:'保存失败，请稍后重试。'},{status:503,headers});}
}
