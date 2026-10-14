import {refreshNative} from '@/lib/quest/native-feed';
import {getPublicFeed} from '@/lib/quest/public-source';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function GET(){const feed=await refreshNative(await getPublicFeed(),true);return Response.json({status:feed.state.events.some(e=>e.at<=feed.state.now&&e.status!=='confirmed'&&Date.parse(e.at)>Date.parse(feed.state.now)-7*86400000)?'partial':'ready',exportedAt:feed.exportedAt});}
