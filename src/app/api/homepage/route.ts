import {NextResponse} from 'next/server';
import {administrator,sameOrigin} from '@/lib/account/auth';
import {database} from '@/lib/account/db';
import {defaultFounder,homepageContentKey,validateFounder} from '@/lib/account/homepage-content';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(){try{const {rows}=await database().query('SELECT body FROM quest_shared_data WHERE key=$1',[homepageContentKey]);return NextResponse.json({founder:validateFounder(rows[0]?.body)||defaultFounder},{headers});}catch{return NextResponse.json({founder:defaultFounder},{headers});}}
export async function PUT(request:Request){
 if(!sameOrigin(request)||!await administrator())return NextResponse.json({error:'Forbidden'},{status:403,headers});
 try{const text=await request.text();if(text.length>12000)return NextResponse.json({error:'内容过长'},{status:413,headers});const founder=validateFounder(JSON.parse(text));if(!founder)return NextResponse.json({error:'请填写三种语言的介绍；Instagram 仅接受完整的 https://www.instagram.com/用户名/ 主页链接。'},{status:400,headers});await database().query('INSERT INTO quest_shared_data(key,body) VALUES($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET body=EXCLUDED.body,updated_at=now()',[homepageContentKey,JSON.stringify(founder)]);return NextResponse.json({founder},{headers});}catch{return NextResponse.json({error:'保存失败，请稍后重试。'},{status:503,headers});}
}
