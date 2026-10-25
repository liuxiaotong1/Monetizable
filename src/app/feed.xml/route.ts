import {blogPosts} from '@/lib/marketing/blog';
import {SITE_URL} from '@/lib/marketing/positioning';
export const dynamic='force-static';
const xml=(s:string)=>s.replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]!));
export function GET(){return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Monetizable Blog</title><link>${SITE_URL}/blog</link><description>Trading practice and discipline</description><language>en</language>${blogPosts.map(p=>`<item><title>${xml(p.title)}</title><link>${SITE_URL}/blog/${p.slug}</link><guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid><pubDate>${new Date(p.date+'T12:00:00Z').toUTCString()}</pubDate><description>${xml(p.description)}</description></item>`).join('')}</channel></rss>`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8','Cache-Control':'public, max-age=3600'}});}
