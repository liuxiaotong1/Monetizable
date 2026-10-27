²·?jšnZ þ– zÛ1import type {Metadata} from 'next';
import {answerPages} from '@/lib/marketing/pages';
import {SITE_URL} from '@/lib/marketing/positioning';
import {blogPosts} from '@/lib/marketing/blog';
import '@/components/marketing/public-pages.css';
import '@/components/marketing/blog-post.css';

const title = 'Trading Practice Blog & Product Resources | Monetizable';
const description = 'Explore trading discipline guides, a trading-plan checklist, and Monetizableâ€™s product introduction, About, FAQ and methodology.';
export const metadata: Metadata = {
  title, description, alternates: {canonical: `${SITE_URL}/blog`,types:{'application/rss+xml':`${SITE_URL}/feed.xml`}},
  openGraph: {title, description, url: `${SITE_URL}/blog`, siteName: 'Monetizable', type: 'website', locale: 'en_US', images: ['/brand/social-preview.png']},
  twitter: {card: 'summary_large_image', title, description, images: ['/brand/social-preview.png']},
};
const groups = [
  {title: 'Trading practice guides', description: 'Practical ways to turn your plan into a daily routine.', slugs: ['trading-discipline-app', 'follow-your-trading-plan', 'trading-plan-checklist']},
  {title: 'Product & resources', description: 'Get to know Monetizable, how it works and the method behind your reviews.', slugs: ['product', 'about', 'faq', 'methodology']},
];
export default function BlogPage() {
  const items=[...blogPosts.map(p=>({name:p.title,url:`${SITE_URL}/blog/${p.slug}`})),...answerPages.map(p=>({name:p.title,url:`${SITE_URL}/${p.slug}`}))];
  const schema = {'@context': 'https://schema.org', '@type': 'CollectionPage', '@id': `${SITE_URL}/blog#page`, url: `${SITE_URL}/blog`, name: title, description, inLanguage: 'en', mainEntity: {'@type': 'ItemList', itemListElement: items.map((p,i)=>({'@type':'ListItem',position:i+1,...p}))}};
  return <main className="answer-page blog-hub" lang="en">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(schema).replace(/</g, '\\u003c')}}/>
    <nav className="answer-nav" aria-label="Main navigation"><a href="/">Monetizable</a><a href="/blog" aria-current="page">Blog</a><a href="/pricing">Pricing</a><a href="/">Start practising â†’</a></nav>
    <header><small>LEARN Â· PRACTISE Â· UNDERSTAND</small><h1>Blog</h1><p>Trading practice, discipline and the thinking behind Monetizable. Find our guides and product resources in one place.</p></header>
    <section className="blog-group"><h2>Latest articles</h2><div className="blog-card-grid">{blogPosts.map(post=><article className="blog-article-card blog-resource-card" key={post.slug}><a href={`/blog/${post.slug}`}><img src={post.hero} alt={post.alt} width={1672} height={941}/></a><p className="blog-reading">{new Date(`${post.date}T12:00:00Z`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})} Â· {post.readingMinutes} min read</p><h3><a href={`/blog/${post.slug}`}>{post.title}</a></h3><p>{post.description}</p><a className="blog-read" href={`/blog/${post.slug}`}>Read article â†’</a></article>)}</div></section>
    {groups.map(group => <section className="blog-group" key={group.title}><h2>{group.title}</h2><p>{group.description}</p><div className="blog-card-grid">{group.slugs.map(slug => {
      const page = answerPages.find(item => item.slug === slug)!;
      return <article className="blog-resource-card" key={slug}><h3><a href={`/${slug}`}>{page.title}</a></h3><p>{page.description}</p><a className="blog-read" href={`/${slug}`}>Read more â†’</a></article>;
    })}</div></section>)}
    <footer><a href="/">Start my free adventure â†’</a><a href="/privacy">Privacy</a></footer>
  </main>;
}
