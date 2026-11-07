import {runCloudRefresh} from '@/lib/quest/cloud-refresh';
import {dispatchFromRefresh} from '@/lib/push/dispatch';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function GET(request: Request){
 // Browser visits already refresh market data. Reminder dispatch stays on the
 // unattended caller (Supabase pg_cron) so a page load does not send pushes.
 const site=request.headers.get('sec-fetch-site');
 const browser=site==='same-origin'||site==='same-site';
 const [response]=await Promise.all([runCloudRefresh(),browser?Promise.resolve():dispatchFromRefresh()]);
 return response;
}
