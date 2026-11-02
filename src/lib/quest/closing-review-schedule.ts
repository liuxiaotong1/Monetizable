import 'server-only';
import {database} from '@/lib/account/db';
/** The scheduler references Supabase Vault; credentials never appear in stored cron SQL. */
export async function ensureClosingReviewSchedule(){
 const token=process.env.QUEST_REPORT_TOKEN||process.env.CRON_SECRET||process.env.QUEST_DATA_CRON_SECRET;
 if(!token)return {enabled:false};
 const db=database(),version='closing-review-schedule:v2',secretName='monetizable_closing_review_token';
 if((await db.query('SELECT key FROM quest_shared_data WHERE key=$1',[version])).rowCount)return {enabled:true};
 await db.query("SELECT vault.create_secret($1,$2,$3) WHERE NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name=$2)",[token,secretName,'Monetizable closing review cloud scheduler']);
 const command="SELECT net.http_get(url := 'https://getmonetizable.com/api/after-close', headers := jsonb_build_object('Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='monetizable_closing_review_token')), timeout_milliseconds := 300000);";
 await db.query("SELECT cron.schedule($1,$2,$3)",['monetizable-after-close','* 17-22 * * 1-5',command]);
 await db.query("INSERT INTO quest_shared_data(key,body) VALUES($1,$2) ON CONFLICT(key) DO NOTHING",[version,JSON.stringify({enabled:true,installedAt:new Date().toISOString()})]);
 return {enabled:true};
}
