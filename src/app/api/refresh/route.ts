import {getPublicFeed} from '@/lib/quest/public-source';
export const dynamic='force-dynamic';
export async function GET(){const feed=await getPublicFeed();return Response.json({status:feed.stale?'retained':'ready',exportedAt:feed.exportedAt});}
