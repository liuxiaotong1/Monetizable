import type {MetadataRoute} from "next";
import {answerPages, CONTENT_UPDATED} from '@/lib/marketing/pages';
import {SITE_URL} from '@/lib/marketing/positioning';
export default function sitemap():MetadataRoute.Sitemap {
 return [{url:SITE_URL,lastModified:CONTENT_UPDATED,changeFrequency:'weekly'}, {url:`${SITE_URL}/blog`,lastModified:CONTENT_UPDATED,changeFrequency:'weekly'}, ...answerPages.map(page=>({url:`${SITE_URL}/${page.slug}`,lastModified:CONTENT_UPDATED,changeFrequency:'monthly' as const})),{url:`${SITE_URL}/pricing`,changeFrequency:'monthly'},{url:`${SITE_URL}/privacy`,changeFrequency:'yearly'}];
}
