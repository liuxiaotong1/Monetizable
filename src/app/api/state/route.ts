import {getPublicFeed} from '@/lib/quest/public-source';
export const dynamic='force-dynamic';
export async function GET(){return Response.json((await getPublicFeed()).state,{headers:{'Cache-Control':'public, max-age=0, s-maxage=30'}});}
