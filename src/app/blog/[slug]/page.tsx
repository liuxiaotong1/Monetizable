import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {blogPosts,findBlogPost,articleSchema} from '@/lib/marketing/blog';
import {SITE_URL} from '@/lib/marketing/positioning';
import '@/components/marketing/public-pages.css';
import '@/components/marketing/blog-post.css';
type Props={params:Promise<{slug:string}>};
export function generateStaticParams(){return blogPosts.map(({slug})=>({slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const post=findBlogPost((await params).slug);if(!post)notFound();
 const url=`${SITE_URL}/blog/${post.slug}`;
 return {title:post.seoTitle,description:post.description,keywords:post.tags,alternates:{canonical:url,types:{'application/rss+xml':`${SITE_URL}/feed.xml`}},openGraph:{type:'article',title:post.title,description:post.description,url,siteName:'Monetizable',publishedTime:post.date,modifiedTime:post.date,images:[{url:SITE_URL+post.hero,alt:post.alt}]},twitter:{card:'summary_large_image',title:post.title,description:post.description,images:[SITE_URL+post.hero]}};
}
export default async function BlogPost({params}:Props){
 const post=findBlogPost((await params).slug);if(!post)notFound();
 return <main className="answer-page blog-post" lang="en"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(articleSchema(post)).replace(/</g,'\\u003c')}}/><nav className="answer-nav" aria-label="Main navigation"><a href="/">Monetizable</a><a href="/blog">Blog</a><a href="/pricing">Pricing</a><a href="/#first-prediction">Try a free quest →</a></nav><article><header><small><time dateTime={post.date}>October 25, 2026</time> · {post.readingMinutes} min read</small><h1>{post.title}</h1><ul className="blog-tags" aria-label="Article topics">{post.tags.map(tag=><li key={tag}>{tag}</li>)}</ul><figure><img src={post.hero} alt={post.alt} width={1672} height={941}/><figcaption>Original AI-generated editorial illustration.</figcaption></figure></header><div className="blog-prose" dangerouslySetInnerHTML={{__html:post.html}}/></article><footer><h2>Keep exploring</h2><div className="answer-related">{blogPosts.filter(p=>p.slug!==post.slug).map(p=><a key={p.slug} href={`/blog/${p.slug}`}>{p.title}</a>)}<a href="/trading-plan-checklist">Trading-plan checklist</a><a href="/methodology">Methodology</a></div><a href="/feed.xml">RSS feed</a></footer></main>;
}
