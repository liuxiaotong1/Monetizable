import {runCloudRefresh} from '@/lib/quest/cloud-refresh';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function GET(request:Request){const secrets=[process.env.QUEST_DATA_CRON_SECRET,process.env.CRON_SECRET].filter(Boolean);if(!secrets.some(secret=>request.headers.get('authorization')===`Bearer ${secret}`))return new Response('Unauthorized',{status:401});return runCloudRefresh();}
