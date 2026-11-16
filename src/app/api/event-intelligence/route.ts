import {getPublicFeed} from '@/lib/quest/public-source';
export const maxDuration=15;
export const dynamic='force-dynamic';
// Public precomputed news and prediction context. The scheduler refreshes it at most hourly.
const headers={'Cache-Control':'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400'};
export async function GET(){
 return Response.json((await getPublicFeed()).intelligence??{sources:[]},{headers});
}
