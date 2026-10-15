import {runCloudRefresh} from '@/lib/quest/cloud-refresh';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function GET(){return runCloudRefresh();}
