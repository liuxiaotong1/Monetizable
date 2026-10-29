import type {MetadataRoute} from "next";
import {answerPages, CONTENT_UPDATED} from '@/lib/marketing/pages';
import {SITE_URL} from '@/lib/marketing/positioning';
import {blogPosts} from '@/lib/marketing/blog';
export default function sitemap():MetadataRoute.Sitemap {
 return [{url:SITE_URL,lastModified:CONTENT_UPDATED,changeFrequency:'weekly'}, {url:`${SITE_URL}/blog`,lastModified:'2026-10-25',changeFrequency:'weekly'}, ...blogPosts.map(p=>({url:`${SITE_URL}/blog/${p.slug}`,lastModified:p.date,changeFrequency:'monthly' as const,images:[SITE_URL+p.hero]})),...answerPages.map(page=>({url:`${SITE_URL}/${page.slug}`,lastModified:CONTENT_UPDATED,changeFrequency:'monthly' as const})),{url:`${SITE_URL}/pricing`,changeFrequency:'monthly'},{url:`${SITE_URL}/privacy`,changeFrequency:'yearly'}];
}
