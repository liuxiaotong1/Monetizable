import 'server-only';
import { cookies } from 'next/headers';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { database } from './db';
export function learningDay(now = new Date()) { return new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
const cookieName = 'quest_learning_guest';
function signature(id:string) { const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw Error('Learning identity unavailable');return createHmac('sha256',key).update('learning-guest:'+id).digest('hex'); }
export async function guestLearningId(create=false) {
  const jar=await cookies(), token=jar.get(cookieName)?.value;
  if(token){const [id,sig]=token.split('.');if(/^[0-9a-f-]{36}$/.test(id)&&/^[0-9a-f]{64}$/.test(sig||'')&&timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(signature(id),'hex')))return id;}
  if(!create)return undefined;
  const id=randomUUID();jar.set(cookieName,id+'.'+signature(id),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:365*86400});return id;
}
export async function learningUsage(userId?:string) {
  const guest=await guestLearningId(),day=learningDay();
  const subjects=userId?['user:'+userId]:[];
  if(guest){const {rows}=await database().query('SELECT user_id FROM quest_learning_guests WHERE id=$1',[guest]);if(!userId||!rows[0]?.user_id||rows[0].user_id===userId)subjects.push('guest:'+guest);}
  if(!subjects.length)return [] as string[];
  const {rows}=await database().query('SELECT DISTINCT card_id FROM quest_learning_daily WHERE subject=ANY($1::text[]) AND day=$2',[subjects,day]);return rows.map(row=>row.card_id as string);
}
export async function claimLearning(cardId:string,chosen:number,userId?:string) {
  const guest=await guestLearningId(true),day=learningDay(),client=await database().connect();
  const subject=userId?'user:'+userId:'guest:'+guest;
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['learning-guest:'+guest]);
    await client.query('INSERT INTO quest_learning_guests(id) VALUES($1) ON CONFLICT DO NOTHING',[guest]);
    const owner=(await client.query('SELECT user_id FROM quest_learning_guests WHERE id=$1 FOR UPDATE',[guest])).rows[0].user_id;
    if(userId){
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['learning-user:'+userId]);
      if(!owner||owner===userId){
        await client.query('UPDATE quest_learning_guests SET user_id=$2 WHERE id=$1',[guest,userId]);
        await client.query('INSERT INTO quest_learning_daily(subject,day,card_id,chosen) SELECT $1,day,card_id,chosen FROM quest_learning_daily WHERE subject=$2 AND day=$3 ON CONFLICT DO NOTHING',[subject,'guest:'+guest,day]);
      }
    }
    const rows=(await client.query('SELECT card_id,chosen FROM quest_learning_daily WHERE subject=$1 AND day=$2',[subject,day])).rows;
    const previous=rows.find(row=>row.card_id===cardId);
    if(previous){await client.query('COMMIT');return {allowed:true,chosen:previous.chosen as number};}
    if(rows.length>=(userId?5:2)){await client.query('COMMIT');return {allowed:false,chosen};}
    await client.query('INSERT INTO quest_learning_daily(subject,day,card_id,chosen) VALUES($1,$2,$3,$4)',[subject,day,cardId,chosen]);
    await client.query('COMMIT');return {allowed:true,chosen};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
